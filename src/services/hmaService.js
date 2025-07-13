// Frontend HMA Service for Victory
// Handles HMA calculations by calling the backend API

import api from './api';

// Force production URLs in production environment
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction 
  ? `${process.env.REACT_APP_API_URL}/api`
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api'); // Fixed API URL path

let fyersAccessToken = null;

export class HMAService {
  /**
   * Get Fyers access token from backend or in-memory cache
   */
  static async getAccessToken() {
    // Use in-memory cache first
    if (fyersAccessToken) return fyersAccessToken;
    // Try to get from backend
      try {
        const response = await fetch(`${API_BASE_URL}/fyers/access-token`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.accessToken) {
            const formattedToken = `${data.appId}:${data.accessToken}`;
          fyersAccessToken = formattedToken;
          return formattedToken;
        }
        }
      } catch (error) {
        console.error('Failed to get access token from backend:', error);
      }
    return null;
  }

  /**
   * Fetch and calculate HMA for a symbol
   */
  static async fetchAndCalculateHMA(symbol, accessToken) {
    try {
      console.log(`🎯 Fetching HMA for symbol: ${symbol}`);
      
      // Get JWT token for backend authentication
      const jwtToken = localStorage.getItem('token');
      if (!jwtToken) {
        throw new Error('No valid authentication token found. Please log in again.');
      }
      
      // Check Fyers connection
      const fyersToken = await this.getAccessToken();
      if (!fyersToken) {
        console.warn('No Fyers token available. The backend will attempt to use the token from DB.');
      }
      
      const response = await fetch(`${API_BASE_URL}/hma/calc?symbol=${encodeURIComponent(symbol)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        
        // Handle Fyers token expiration
        if (response.status === 500) {
          const errorMessage = errorData.message || errorData.error || '';
          if (errorMessage.includes('Fyers access token') || errorMessage.includes('Please login again')) {
            const tokenError = new Error(errorMessage);
            tokenError.isFyersTokenExpired = true;
            throw tokenError;
          }
        }
        
        // Handle Fyers connection issues specially
        if (response.status === 422) {
          throw new Error(errorData.error || 'Fyers API authorization issue. Please connect your Fyers account.');
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ HMA calculation completed for ${symbol}: ${data.data.currentHMA.toFixed(2)}`);
      
      return {
        symbol,
        hmaValue: data.data.currentHMA,
        lastUpdate: new Date(),
        status: 'ACTIVE',
        period: data.data.period,
        data: data.data.data || []
      };
    } catch (error) {
      console.error(`❌ Error calculating HMA for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get HMA cache statistics
   */
  static async getCacheStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/hma/cache-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error getting HMA cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear HMA cache for a symbol
   */
  static async clearCache(symbol, accessToken) {
    try {
      // Get JWT token for backend authentication
      const jwtToken = localStorage.getItem('token');
      if (!jwtToken) {
        throw new Error('No valid authentication token found. Please log in again.');
      }
      
      const response = await fetch(`${API_BASE_URL}/hma/cache/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`🧹 HMA cache cleared for ${symbol}:`, result.success);
      
      return result.success;
    } catch (error) {
      console.error(`❌ Error clearing HMA cache for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Test HMA calculation without trading hours filter
   */
  static async fetchAndCalculateHMATest(symbol) {
    try {
      console.log(`🧪 TEST: Fetching HMA for symbol: ${symbol} (without trading hours filter)`);
      
      // Get JWT token for backend authentication
      const jwtToken = localStorage.getItem('token');
      if (!jwtToken) {
        throw new Error('No valid authentication token found. Please log in again.');
      }
      
      const response = await fetch(`${API_BASE_URL}/hma/test?symbol=${encodeURIComponent(symbol)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ TEST: HMA calculation completed for ${symbol}: ${data.data.currentHMA.toFixed(2)}`);
      
      return {
        symbol,
        hmaValue: data.data.currentHMA,
        lastUpdate: new Date(),
        status: 'ACTIVE',
        period: data.data.period,
        data: data.data.data || [],
        testMode: true,
        candlesUsed: data.data.dataPoints
      };
    } catch (error) {
      console.error(`❌ TEST: Error calculating HMA for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Update HMA with latest 5-minute data (for real-time monitoring)
   * @param {string} symbol - Symbol to update HMA for
   * @param {Array} existingCandles - Existing candle data (optional)
   * @returns {Promise<Object>} - Updated HMA data
   */
  static async updateHMAWithLatestData(symbol, existingCandles = []) {
    try {
      console.log(`🔄 Updating HMA with latest data for ${symbol}`);
      
      const response = await api.post('/hma/update', {
        symbol,
        existingCandles
      });
      
      if (response.data.success) {
        console.log(`✅ HMA updated successfully for ${symbol}: ${response.data.data.currentHMA}`);
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update HMA');
      }
    } catch (error) {
      console.error(`❌ Error updating HMA for ${symbol}:`, error);
      
      // Handle specific error cases
      if (error.response?.status === 503) {
        throw new Error('Fyers API temporarily unavailable. Retrying...');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please reconnect your Fyers account.');
      } else if (error.response?.data?.requiresFullCalculation) {
        // Fall back to full calculation
        console.log(`📊 Falling back to full HMA calculation for ${symbol}`);
        const accessToken = await this.getAccessToken();
        return await this.fetchAndCalculateHMA(symbol, accessToken);
      } else {
        throw error;
      }
    }
  }

  /**
   * Start real-time HMA monitoring for a symbol
   * @param {string} symbol - Symbol to monitor
   * @param {Function} onUpdate - Callback function when HMA updates
   * @param {number} interval - Update interval in minutes (default: 5)
   * @returns {Object} - Monitoring control object
   */
  static startRealTimeMonitoring(symbol, onUpdate, interval = 5) {
    console.log(`🚀 Starting real-time HMA monitoring for ${symbol} (${interval}min intervals)`);
    
    let isRunning = true;
    let currentCandles = [];
    let intervalId = null;
    
    const updateHMA = async () => {
      if (!isRunning) return;
      
      try {
        const hmaData = await this.updateHMAWithLatestData(symbol, currentCandles);
        currentCandles = hmaData.data || [];
        
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(hmaData);
        }
      } catch (error) {
        console.error(`❌ Real-time HMA update failed for ${symbol}:`, error);
        
        // If we get authentication error, stop monitoring
        if (error.message.includes('Authentication failed')) {
          this.stopRealTimeMonitoring(symbol);
        }
      }
    };
    
    // Start the interval
    intervalId = setInterval(updateHMA, interval * 60 * 1000);
    
    // Do initial update
    updateHMA();
    
    // Return control object
    return {
      symbol,
      stop: () => {
        console.log(`🛑 Stopping real-time HMA monitoring for ${symbol}`);
        isRunning = false;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      },
      isRunning: () => isRunning,
      updateInterval: interval
    };
  }
  
  /**
   * Stop real-time HMA monitoring for a symbol
   * @param {string} symbol - Symbol to stop monitoring
   */
  static stopRealTimeMonitoring(symbol) {
    console.log(`🛑 Stopping real-time HMA monitoring for ${symbol}`);
    // This will be handled by the control object returned by startRealTimeMonitoring
  }

  /**
   * Get HMA calculation with detailed logging
   * @param {string} symbol - Symbol to calculate HMA for
   * @returns {Promise<Object>} - HMA calculation result
   */
} 