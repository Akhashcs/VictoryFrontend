import api, { subscribeToSymbols, unsubscribeFromSymbols, onMarketData } from './api';
import { UNDERLYING_CONFIGS } from '../utils/futuresHelper';

// Cache TTL in milliseconds
const CACHE_TTL = {
  quotes: 5000,      // 5 seconds
  historical: 300000 // 5 minutes
};

/**
 * Market Service
 * Handles market data operations
 */
class MarketService {
  // Static variables for market data management
  static marketDataCache = new Map();
  static quotesCache = new Map();
  static historicalCache = new Map();
  static queueTimer = null;
  static currentFetchType = 'indices'; // Only indices now
  static dataUpdateCallbacks = new Set();
  static lastFetchTime = 0;
  
  // Market hours configuration (IST)
  static MARKET_OPEN_HOUR = 9;
  static MARKET_CLOSE_HOUR = 15; // 3:30 PM (market closes at 3:30 PM IST)
  
  // Symbols to fetch
  static INDEX_SYMBOLS = [
    // Symbols will be loaded dynamically from backend configuration
  ];
  
  static INDEX_SYMBOL_TO_NAME = {
    // Symbol mappings will be loaded dynamically from backend configuration
  };

  // Dynamic symbols loading
  static async loadAllSymbols() {
    try {
      const response = await api.get('/market/config/market-data');
      return response.data.data || [];
    } catch (error) {
      console.error('Error loading symbols from config:', error);
      // Return empty array if no symbols configured
      return [];
    }
  }

  // Legacy static symbols for backward compatibility
  static ALL_SYMBOLS = [
    // Symbols will be loaded dynamically from backend configuration
  ];

  /**
   * Get market status
   * @returns {Promise<Object>} Market status
   */
  static async getMarketStatus() {
    try {
      const response = await api.get('/market/status');
      // Extract the status property from the response
      return response.data.data.status || 'unknown';
    } catch (error) {
      console.error('[MarketService] Error getting market status:', error);
      return 'unknown';
    }
  }

  /**
   * Get quote for a symbol
   * @param {string} symbol - Symbol to get quote for
   * @returns {Promise<Object>} Quote data
   */
  static async getQuote(symbol) {
    try {
      // Check cache first
      const cachedQuote = this.quotesCache.get(symbol);
      if (cachedQuote && (Date.now() - cachedQuote.timestamp < CACHE_TTL.quotes)) {
        return cachedQuote.data;
      }

      const response = await api.get(`/market/quote/${symbol}`);
      
      // Cache the result
      this.quotesCache.set(symbol, {
        timestamp: Date.now(),
        data: response.data.data
      });
      
      return response.data.data;
    } catch (error) {
      console.error(`[MarketService] Error getting quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get quotes for multiple symbols
   * @param {Array<string>} symbols - Symbols to get quotes for
   * @returns {Promise<Array<Object>>} Array of quote data
   */
  static async getQuotes(symbols) {
    try {
      // Generate cache key based on symbols
      const cacheKey = symbols.sort().join(',');
      
      // Check cache first
      const cachedQuotes = this.quotesCache.get(cacheKey);
      if (cachedQuotes && (Date.now() - cachedQuotes.timestamp < CACHE_TTL.quotes)) {
        return cachedQuotes.data;
      }

      const response = await api.post('/market/quotes', { symbols });
      
      // Cache the result
      this.quotesCache.set(cacheKey, {
        timestamp: Date.now(),
        data: response.data.data
      });
      
      return response.data.data;
    } catch (error) {
      console.error('[MarketService] Error getting quotes:', error);
      throw error;
    }
  }

  /**
   * Get historical data for a symbol
   * @param {string} symbol - Symbol to get data for
   * @param {string} timeframe - Timeframe (1m, 5m, 15m, 30m, 1h, 1d)
   * @param {number} limit - Number of candles to fetch
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<Array>} Array of candle data
   */
  static async getHistoricalData(symbol, timeframe = '1d', limit = 100, useCache = true) {
    try {
      // Generate cache key
      const cacheKey = `${symbol}:${timeframe}:${limit}`;
      
      // Check cache first if enabled
      if (useCache) {
        const cachedData = this.historicalCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL.historical)) {
          return cachedData.data;
        }
      }

      const response = await api.get(`/market/data/${symbol}`, {
        params: {
          timeframe,
          limit,
          useCache: String(useCache)
        }
      });
      
      // Cache the result
      this.historicalCache.set(cacheKey, {
        timestamp: Date.now(),
        data: response.data.data
      });
      
      return response.data.data;
    } catch (error) {
      console.error(`[MarketService] Error getting historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get data with indicators
   * @param {string} symbol - Symbol to get data for
   * @param {string} timeframe - Timeframe
   * @param {Array} indicators - Array of indicators to calculate
   * @returns {Promise<Object>} Data with indicators
   */
  static async getDataWithIndicators(symbol, timeframe = '1d', indicators = []) {
    try {
      const response = await api.post('/market/data/indicators', {
        symbol,
        timeframe,
        indicators
      });
      
      return response.data.data;
    } catch (error) {
      console.error(`[MarketService] Error getting data with indicators for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get indices data
   * @returns {Promise<Array>} Array of index data
   */
  static async getIndices() {
    try {
      const response = await api.get('/market/indices');
      return response.data.data;
    } catch (error) {
      console.error('[MarketService] Error getting indices:', error);
      throw error;
    }
  }

  /**
   * Get option symbols for an index
   * @param {string} index - Index symbol
   * @param {string} date - Expiry date (optional)
   * @param {number} strikeStep - Strike price step (optional)
   * @returns {Promise<Object>} Option symbols
   */
  static async getOptionSymbols(index, date, strikeStep) {
    try {
      const response = await api.get(`/market/symbols/${index}`, {
        params: {
          date,
          strikeStep
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error(`[MarketService] Error getting option symbols for ${index}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time market data
   * @param {Array<string>} symbols - Symbols to subscribe to
   * @returns {Promise<boolean>} Success
   */
  static async subscribeToMarketData(symbols) {
    try {
      // Subscribe via WebSocket
      subscribeToSymbols(symbols);
      
      // Also subscribe via API for persistence
      await api.post('/market/subscribe', { symbols });
      
      return true;
    } catch (error) {
      console.error('[MarketService] Error subscribing to market data:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from real-time market data
   * @param {Array<string>} symbols - Symbols to unsubscribe from (empty for all)
   * @returns {Promise<boolean>} Success
   */
  static async unsubscribeFromMarketData(symbols = []) {
    try {
      // Unsubscribe via WebSocket
      unsubscribeFromSymbols(symbols);
      
      // Also unsubscribe via API for persistence
      await api.post('/market/unsubscribe', { symbols });
      
      return true;
    } catch (error) {
      console.error('[MarketService] Error unsubscribing from market data:', error);
      return false;
    }
  }

  /**
   * Register callback for market data updates
   * @param {Function} callback - Callback function
   */
  static onMarketDataUpdate(callback) {
    onMarketData(callback);
  }

  /**
   * Clear cache for a symbol
   * @param {string} symbol - Symbol to clear cache for
   * @returns {Promise<boolean>} Success
   */
  static async clearCache(symbol) {
    try {
      // Clear local cache
      for (const [key] of this.quotesCache.entries()) {
        if (key === symbol || key.includes(symbol)) {
          this.quotesCache.delete(key);
        }
      }
      
      for (const [key] of this.historicalCache.entries()) {
        if (key.startsWith(`${symbol}:`)) {
          this.historicalCache.delete(key);
        }
      }
      
      // Clear server cache
      await api.delete(`/market/cache/${symbol}`);
      
      return true;
    } catch (error) {
      console.error(`[MarketService] Error clearing cache for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<boolean>} Success
   */
  static async clearAllCache() {
    try {
      // Clear local cache
      this.quotesCache.clear();
      this.historicalCache.clear();
      
      // Clear server cache
      await api.delete('/market/cache');
      
      return true;
    } catch (error) {
      console.error('[MarketService] Error clearing all cache:', error);
      return false;
    }
  }

  // Check if market is open (Indian market hours: 9:15 AM to 3:30 PM IST)
  static isMarketOpenNow() {
    const now = new Date();
    // Use Asia/Kolkata timezone
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentTime = hours * 100 + minutes;
    
    // Market hours: 9:15 AM to 3:30 PM IST (correct Indian market hours)
    const marketOpen = 915; // 9:15 AM
    const marketClose = 1530; // 3:30 PM
    
    // Check if it's a weekday (Monday = 1, Sunday = 0)
    const dayOfWeek = istTime.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    return isWeekday && currentTime >= marketOpen && currentTime <= marketClose;
  }

  /**
   * Start intelligent market data fetching
   * @returns {Promise<void>}
   */
  static async startIntelligentFetching() {
    // Stop any existing timers
    this.stopIntelligentFetching();
    
    console.log('[MarketService] Starting intelligent market data fetching');
    
    // Get market status
    const marketStatus = await this.getMarketStatus();
    console.log(`[MarketService] Current market status: ${marketStatus}`);
    
    // Start timer for all market data
    this.queueTimer = setInterval(async () => {
      try {
        // Load symbols dynamically from backend configuration
        const symbols = await this.loadAllSymbols();
        console.log('[MarketService] Fetching all market data with symbols:', symbols);
        const allData = await this.fetchMarketData(symbols);
        
        // Process and update cache
        allData.forEach(item => {
          // Determine indexName based on symbol
          let indexName = item.symbol;
          if (item.symbol.includes('NIFTY50-INDEX')) {
            indexName = 'NIFTY';
          } else if (item.symbol.includes('NIFTYBANK-INDEX')) {
            indexName = 'BANKNIFTY';
          } else if (item.symbol.includes('SENSEX-INDEX')) {
            indexName = 'SENSEX';
          } else {
            // For stocks and commodities, extract the name part
            const parts = item.symbol.split(':');
            if (parts.length > 1) {
              let extractedName = parts[1].replace('-EQ', '').replace('-COMM', '');
              
              // Map the extracted name back to the original frontend symbol names
              const symbolMapping = {
                // Stocks
                'ADANIPORTS': 'RELIANCE',
                'APOLLOHOSP': 'TCS', 
                'BAJFINANCE': 'INFY',
                'BHARTIARTL': 'HDFC',
                'BPCL': 'ICICIBANK',
                'COALINDIA': 'RELIANCE',
                'DRREDDY': 'TCS',
                'GRASIM': 'INFY',
                'HCLTECH': 'HDFC',
                'HDFCBANK': 'ICICIBANK',
                'HEROMOTOCO': 'RELIANCE',
                'HINDALCO': 'TCS',
                'ICICIBANK': 'ICICIBANK', // This one matches
                'ONGC': 'INFY',
                'SBILIFE': 'HDFC',
                'SBIN': 'ICICIBANK',
                'SUNPHARMA': 'RELIANCE',
                'TATASTEEL': 'TCS',
                'WIPRO': 'INFY',
                
                // Commodities
                'GOLD25AUGFUT': 'GOLD',
                'GOLD25JULFUT': 'GOLD',
                'SILVER25SEPFUT': 'SILVER',
                'SILVER25AUGFUT': 'SILVER',
                'SILVER25JULFUT': 'SILVER',
                'CRUDEOIL25AUGFUT': 'CRUDEOIL',
                'CRUDEOIL25JULFUT': 'CRUDEOIL',
                'COPPER25AUGFUT': 'COPPER',
                'COPPER25JULFUT': 'COPPER',
                'NICKEL25AUGFUT': 'NICKEL',
                'NICKEL25JULFUT': 'NICKEL'
              };
              
              // Use the mapping if available, otherwise use the extracted name
              indexName = symbolMapping[extractedName] || extractedName;
            }
          }
          
          this.marketDataCache.set(item.symbol, {
            ...item,
            indexName,
            dataType: 'all',
            lastUpdated: Date.now()
          });
        });
        
        // Notify listeners
        this.notifyDataUpdate();
        
      } catch (error) {
        console.error('[MarketService] Error fetching all market data:', error);
      }
    }, 5000); // Every 5 seconds
    
    // Removed futures timer
  }

  /**
   * Manual refresh for index data (fetches from API even if market is closed)
   * @returns {Promise<void>}
   */
  static async manualRefresh() {
    try {
      console.log('[MarketService] Manual refresh triggered');
      const symbols = await this.loadAllSymbols();
      const allData = await this.fetchMarketData(symbols);
      
      // Update cache with fresh data
      allData.forEach(item => {
        // Determine indexName based on symbol
        let indexName = item.symbol;
        if (item.symbol.includes('NIFTY50-INDEX')) {
          indexName = 'NIFTY';
        } else if (item.symbol.includes('NIFTYBANK-INDEX')) {
          indexName = 'BANKNIFTY';
        } else if (item.symbol.includes('SENSEX-INDEX')) {
          indexName = 'SENSEX';
        } else {
          // For stocks and commodities, extract the name part
          const parts = item.symbol.split(':');
          if (parts.length > 1) {
            let extractedName = parts[1].replace('-EQ', '').replace('-COMM', '');
            // Use the extracted name directly since symbol mapping is now dynamic
            indexName = extractedName;
          }
        }
        
        this.marketDataCache.set(item.symbol, {
          ...item,
          indexName,
          dataType: 'all',
          lastUpdated: Date.now()
        });
      });
      
      // Removed futures data fetching
      
      // Notify listeners
      this.notifyDataUpdate();
    } catch (error) {
      console.error('[MarketService] Error in manual refresh:', error);
    }
  }

  /**
   * Stop intelligent fetching
   */
  static stopIntelligentFetching() {
    if (this.queueTimer) {
      clearInterval(this.queueTimer);
      this.queueTimer = null;
    }
    
    // Removed futures timer clearing
    
    console.log('[MarketService] Stopped intelligent market data fetching');
  }

  // Subscribe to data updates
  static subscribeToUpdates(callback) {
    this.dataUpdateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.dataUpdateCallbacks.delete(callback);
    };
  }

  // Notify all subscribers of data updates
  static notifyDataUpdate() {
    // Debug: log cache contents
    console.log('[MarketService] marketDataCache:', Array.from(this.marketDataCache.entries()));
    const combinedData = this.getCombinedDataFromCache();
    // Debug: log combined data result
    console.log('[MarketService] getCombinedDataFromCache result:', combinedData);
    this.dataUpdateCallbacks.forEach(callback => {
      try {
        callback(combinedData);
      } catch (error) {
        console.error('Error in data update callback:', error);
      }
    });
  }

  /**
   * Get combined data from cache
   * @returns {Array} Combined data
   */
  static getCombinedDataFromCache() {
    // Return all cached data instead of hardcoded indices
    return Array.from(this.marketDataCache.values())
      .filter(item => item.dataType === 'indices' || item.dataType === 'all')
      .map(item => ({
        indexName: item.indexName || item.symbol || item.name,
        symbol: item.symbol, // Include the original symbol
        spotData: {
          ltp: item.ltp,
          change: item.change,
          changePercent: item.changePercent,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          timestamp: item.timestamp
        },
        lastUpdated: item.lastUpdated || 0
      }));
  }

  /**
   * Legacy method for backward compatibility - now uses cache
   */
  static async getIndicesData() {
    // Load symbols dynamically from backend configuration
    const symbols = await this.loadAllSymbols();
    console.log('[MarketService] Loaded symbols from config:', symbols);
    
    // If cache is empty, do initial load
    if (this.marketDataCache.size === 0) {
      // Start the intelligent fetching system
      this.startIntelligentFetching();
      // Do initial bulk fetch for immediate display
      try {
        console.log('📊 Initial market data fetch...');
        const allData = await this.fetchMarketData(symbols);
        // Removed futures data fetching
        
        // Populate cache with initial data (map by symbol, not order)
        allData.forEach(item => {
          // Determine indexName based on symbol
          let indexName = item.symbol;
          if (item.symbol.includes('NIFTY50-INDEX')) {
            indexName = 'NIFTY';
          } else if (item.symbol.includes('NIFTYBANK-INDEX')) {
            indexName = 'BANKNIFTY';
          } else if (item.symbol.includes('SENSEX-INDEX')) {
            indexName = 'SENSEX';
          } else {
            // For stocks and commodities, extract the name part and map to original names
            const parts = item.symbol.split(':');
            if (parts.length > 1) {
              let extractedName = parts[1].replace('-EQ', '').replace('-COMM', '');
              
              // Map the extracted name back to the original frontend symbol names
              const symbolMapping = {
                // Stocks
                'ADANIPORTS': 'RELIANCE',
                'APOLLOHOSP': 'TCS', 
                'BAJFINANCE': 'INFY',
                'BHARTIARTL': 'HDFC',
                'BPCL': 'ICICIBANK',
                'COALINDIA': 'RELIANCE',
                'DRREDDY': 'TCS',
                'GRASIM': 'INFY',
                'HCLTECH': 'HDFC',
                'HDFCBANK': 'ICICIBANK',
                'HEROMOTOCO': 'RELIANCE',
                'HINDALCO': 'TCS',
                'ICICIBANK': 'ICICIBANK', // This one matches
                'ONGC': 'INFY',
                'SBILIFE': 'HDFC',
                'SBIN': 'ICICIBANK',
                'SUNPHARMA': 'RELIANCE',
                'TATASTEEL': 'TCS',
                'WIPRO': 'INFY',
                
                // Commodities
                'GOLD25AUGFUT': 'GOLD',
                'GOLD25JULFUT': 'GOLD',
                'SILVER25SEPFUT': 'SILVER',
                'SILVER25AUGFUT': 'SILVER',
                'SILVER25JULFUT': 'SILVER',
                'CRUDEOIL25AUGFUT': 'CRUDEOIL',
                'CRUDEOIL25JULFUT': 'CRUDEOIL',
                'COPPER25AUGFUT': 'COPPER',
                'COPPER25JULFUT': 'COPPER',
                'NICKEL25AUGFUT': 'NICKEL',
                'NICKEL25JULFUT': 'NICKEL'
              };
              
              // Use the mapping if available, otherwise use the extracted name
              indexName = symbolMapping[extractedName] || extractedName;
            }
          }
          
          this.marketDataCache.set(item.symbol, {
            ...item,
            indexName,
            dataType: 'all',
            lastUpdated: Date.now()
          });
        });
        
        // Removed futures data caching
      } catch (error) {
        console.error('❌ Error in initial market data fetch:', error);
      }
    }
    
    // Return combined data from cache
    return this.getCombinedDataFromCache();
  }

  /**
   * Get all market data (indices, stocks, commodities)
   * @returns {Promise<Array>} Array of market data
   */
  static async getAllMarketData() {
    try {
      // Load symbols dynamically from config
      const symbols = await this.loadAllSymbols();
      console.log('📊 Initial ALL market data fetch with symbols:', symbols);
      
      const allData = await this.fetchMarketData(symbols);
      allData.forEach(item => {
        // Use item.symbol as key
        this.marketDataCache.set(item.symbol, {
          ...item,
          indexName: item.indexName || item.symbol || item.name,
          dataType: 'all',
          lastUpdated: Date.now()
        });
      });
    } catch (error) {
      console.error('❌ Error in initial ALL market data fetch:', error);
    }
    // Return all data from cache formatted for IndexCard component
    return Array.from(this.marketDataCache.values()).map(item => ({
      indexName: item.indexName || item.symbol || item.name,
      symbol: item.symbol, // Include the original symbol
      spotData: {
        ltp: item.ltp,
        change: item.change,
        changePercent: item.changePercent,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        timestamp: item.timestamp
      }
    }));
  }

  // Start intelligent fetching for all symbols
  static async startIntelligentFetchingAll() {
    if (this.queueTimer) {
      clearInterval(this.queueTimer);
    }
    // Fetch all symbols every 0.5 seconds from backend
    this.queueTimer = setInterval(async () => {
      try {
        const response = await api.get('/market/data/all');
        if (response.data.success) {
          const allData = response.data.data;
          allData.forEach(item => {
            this.marketDataCache.set(item.symbol, {
              ...item,
              indexName: item.indexName || item.symbol || item.name,
              dataType: 'all',
              lastUpdated: Date.now()
            });
          });
          this.notifyDataUpdate();
        }
      } catch (error) {
        console.error('❌ Error in periodic market data fetch:', error.message);
      }
    }, 500); // 0.5 seconds
  }

  // Get formatted market time
  static getMarketTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Get next market open time
  static getNextMarketOpen() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // If market is closed today, get next weekday
    let nextOpen = new Date(istTime);
    
    if (!this.isMarketOpenNow()) {
      // If it's after market hours today, go to next day
      if (istTime.getHours() >= 15 || (istTime.getHours() === 15 && istTime.getMinutes() >= 30)) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
      
      // Skip weekends
      while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
        nextOpen.setDate(nextOpen.getDate() + 1);
      }
      
      // Set to 9:15 AM (correct market open time)
      nextOpen.setHours(9, 15, 0, 0);
    }
    
    return nextOpen.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Fetch market data for multiple symbols
   * @param {Array<string>} symbols - Symbols to fetch data for
   * @returns {Promise<Array<Object>>} Array of market data
   */
  static async fetchMarketData(symbols) {
    try {
      if (!symbols || symbols.length === 0) {
        return [];
      }
      
      console.log('[MarketService] Fetching market data for symbols:', symbols);
      const response = await api.post('/market/data/batch', { symbols });
      console.log('[MarketService] Received market data response:', response.data.data.length, 'symbols');
      
      // Debug: log first few symbols to see what we're getting
      if (response.data.data.length > 0) {
        console.log('[MarketService] First 3 symbols received:', response.data.data.slice(0, 3).map(s => ({ symbol: s.symbol, ltp: s.ltp })));
      }
      
      return response.data.data;
    } catch (error) {
      console.error('[MarketService] Error fetching market data:', error);
      
      // Check if it's a Fyers reconnection error
      if (error.response?.data?.requiresReconnection) {
        console.error('[MarketService] Fyers reconnection required:', error.response.data.message);
        // Emit a custom event for the dashboard to handle
        window.dispatchEvent(new CustomEvent('fyersReconnectionRequired', {
          detail: { message: error.response.data.message }
        }));
        throw error; // Re-throw to stop further processing
      }
      
      return [];
    }
  }

  /**
   * Check server health status
   * @returns {Promise<string>} Server status ('running', 'stopped', or 'error')
   */
  static async checkServerHealth() {
    try {
      // Use direct fetch to bypass axios instance - Fixed API URL path
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const apiUrl = isProduction 
        ? `${process.env.REACT_APP_API_URL}/api`
        : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
      const response = await fetch(`${apiUrl}/health`);
      
      if (response.ok) {
        const data = await response.json();
        // Backend returns 'healthy' status, not 'ok'
        return data.status === 'healthy' ? 'running' : 'error';
      } else {
        return 'error';
      }
    } catch (error) {
      console.error('[MarketService] Server health check failed:', error);
      return 'stopped';
    }
  }

  // Cleanup method
  static cleanup() {
    this.stopIntelligentFetching();
    if (this.marketDataCache && typeof this.marketDataCache.clear === 'function') {
      this.marketDataCache.clear();
    }
    if (this.quotesCache && typeof this.quotesCache.clear === 'function') {
      this.quotesCache.clear();
    }
    if (this.historicalCache && typeof this.historicalCache.clear === 'function') {
      this.historicalCache.clear();
    }
    this.dataUpdateCallbacks.clear();
  }
}

export default MarketService; 