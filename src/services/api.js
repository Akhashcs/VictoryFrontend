import axios from 'axios';

// Global error handler for Fyers token expiration
let tokenExpirationHandler = null;

export const setTokenExpirationHandler = (handler) => {
  tokenExpirationHandler = handler;
};

// Force production URLs in production environment
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const baseURL = isProduction 
  ? 'https://victorybackend-7cue.onrender.com/api'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const api = axios.create({
  baseURL,
  timeout: 300000, // 5 minute timeout (10x increase for bulk data collection)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log outgoing requests in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
      if (config.data) {
        console.log(`📦 Request data:`, config.data);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and retries
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ API Response: ${response.status} from ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log detailed error information
    console.error('❌ API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Handle Fyers token expiration (500 errors with specific messages)
    if (error.response?.status === 500) {
      const errorMessage = error.response?.data?.message || '';
      const isFyersTokenError = 
        errorMessage.includes('Fyers access token is missing') ||
        errorMessage.includes('Fyers access token has expired') ||
        errorMessage.includes('Invalid Fyers access token') ||
        errorMessage.includes('Please login again to refresh your Fyers token');
      
      if (isFyersTokenError) {
        console.log('🔄 Fyers token expired, triggering re-login...');
        
        // Call the global token expiration handler if set
        if (tokenExpirationHandler) {
          tokenExpirationHandler();
        }
        
        // Return a specific error that components can handle
        return Promise.reject({
          ...error,
          isFyersTokenExpired: true,
          message: 'Your Fyers session has expired. Please login again to continue.'
        });
      }
    }
    
    // Handle token expiration (401 errors)
    if (error.response?.status === 401) {
      const url = originalRequest?.url || '';
      // Only logout if the 401 is from an app-auth endpoint
      if (
        url.includes('/user/me') ||
        url.includes('/auth/login') ||
        url.includes('/auth/register')
      ) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      // For other endpoints (e.g., /fyers, /market), do not logout, just reject
      return Promise.reject(error);
    }
    
    // Handle rate limiting (429 errors)
    if (error.response?.status === 429) {
      // Don't retry login attempts to prevent infinite loops
      if (originalRequest?.url?.includes('/auth/login')) {
        console.log('❌ Login rate limited - please wait before trying again');
        return Promise.reject({
          ...error,
          message: 'Too many login attempts. Please wait 15 minutes before trying again.',
          isRateLimited: true
        });
      }
      
      // For other endpoints, retry with exponential backoff
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        // Get retry delay from headers or use exponential backoff
        const retryAfter = error.response.headers['retry-after'] || 5;
        const retryDelay = parseInt(retryAfter, 10) * 1000;
        
        console.log(`Rate limited, retrying after ${retryDelay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return api(originalRequest);
      } else {
        // Already retried once, don't retry again
        console.log('❌ Rate limited again, giving up');
        return Promise.reject({
          ...error,
          message: 'Service temporarily unavailable due to high traffic. Please try again later.',
          isRateLimited: true
        });
      }
    }
    
    // Handle network errors with retry
    if (error.message === 'Network Error' && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('Network error, retrying...');
      
      // Wait for a short time and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return api(originalRequest);
    }
    
    // Handle timeout errors with retry
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('Request timeout, retrying...');
      
      // Increase timeout for retry and try again
      originalRequest.timeout = originalRequest.timeout * 1.5;
      return api(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

// WebSocket connection management
let ws = null;
let wsCallbacks = {
  marketData: [],
  tradingState: [],
  tradeLogUpdate: []
};

/**
 * Connect to WebSocket
 * @param {string} token - Authentication token
 */
export const connectWebSocket = (token) => {
  if (ws) {
    console.log('WebSocket already connected');
    return;
  }

  // Force production URLs in production environment
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const wsUrl = isProduction 
    ? 'wss://victorybackend-7cue.onrender.com'
    : (process.env.REACT_APP_WS_URL || 'ws://localhost:5000');
  console.log('🔌 Attempting to connect to WebSocket:', wsUrl);
  
  try {
    ws = new WebSocket(`${wsUrl}`);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      // Send authentication message
      console.log('🔐 Sending authentication token...');
      ws.send(JSON.stringify({
        type: 'auth',
        token: token
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received WebSocket message:', data.type, data);
        
        if (data.type === 'marketData') {
          console.log('📊 Processing market data update:', data.data.length, 'symbols');
          wsCallbacks.marketData.forEach(callback => callback(data.data));
        } else if (data.type === 'tradingState') {
          console.log('📋 Processing trading state update');
          wsCallbacks.tradingState.forEach(callback => callback(data.data));
        } else if (data.type === 'trade_log_update') {
          console.log('📝 Processing trade log update:', data.data);
          console.log('📝 Trade log update callbacks:', wsCallbacks.tradeLogUpdate.length);
          wsCallbacks.tradeLogUpdate.forEach(callback => {
            try {
              callback(data.data);
            } catch (error) {
              console.error('Error in trade log update callback:', error);
            }
          });
        } else if (data.type === 'auth') {
          console.log('🔐 Authentication response:', data);
          if (!data.success) {
            console.error('❌ WebSocket authentication failed:', data.message);
            // Reconnect with fresh token
            setTimeout(() => {
              const freshToken = localStorage.getItem('token');
              if (freshToken) {
                console.log('🔄 Reconnecting WebSocket with fresh token...');
                closeWebSocket();
                connectWebSocket(freshToken);
              }
            }, 2000);
          }
        } else if (data.type === 'subscribe') {
          console.log('📡 Subscription response:', data);
        } else if (data.type === 'error') {
          console.error('❌ WebSocket error:', data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('❌ WebSocket disconnected');
      ws = null;
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      ws = null;
    };
  } catch (error) {
    console.error('Error connecting to WebSocket:', error);
  }
};

/**
 * Close WebSocket connection
 */
export const closeWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
};

/**
 * Subscribe to market data updates
 * @param {Array<string>} symbols - Symbols to subscribe to
 */
export const subscribeToSymbols = (symbols) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('📡 Subscribing to symbols via WebSocket:', symbols);
    ws.send(JSON.stringify({
      type: 'subscribe',
      symbols
    }));
  } else {
    console.warn('⚠️ WebSocket not connected, cannot subscribe to symbols:', symbols);
  }
};

/**
 * Unsubscribe from market data updates
 * @param {Array<string>} symbols - Symbols to unsubscribe from
 */
export const unsubscribeFromSymbols = (symbols) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('📡 Unsubscribing from symbols via WebSocket:', symbols);
    ws.send(JSON.stringify({
      type: 'unsubscribe',
      symbols
    }));
  } else {
    console.warn('⚠️ WebSocket not connected, cannot unsubscribe from symbols:', symbols);
  }
};

/**
 * Register callback for market data updates
 * @param {Function} callback - Callback function
 */
export const onMarketData = (callback) => {
  wsCallbacks.marketData.push(callback);
};

/**
 * Register callback for trading state updates
 * @param {Function} callback - Callback function
 */
export const onTradingState = (callback) => {
  wsCallbacks.tradingState.push(callback);
};

/**
 * Register callback for trade log updates
 * @param {Function} callback - Callback function
 */
export const onTradeLogUpdate = (callback) => {
  wsCallbacks.tradeLogUpdate.push(callback);
};

export default api; 