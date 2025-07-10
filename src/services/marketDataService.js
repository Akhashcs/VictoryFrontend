// Frontend Market Data Service for Victory
// Handles historical market data by calling the backend API

import api from './api';

/**
 * Market Data Service
 * Client-side service that uses backend market data services
 */
class MarketDataService {
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
      const response = await api.get(`/market/data/${symbol}`, {
        params: {
          timeframe,
          limit,
          useCache: String(useCache)
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error(`[MarketDataService] Error getting historical data for ${symbol}:`, error);
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
      console.error(`[MarketDataService] Error getting data with indicators for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get live market data for multiple symbols
   * @param {Array<string>} symbols - Symbols to get data for
   * @returns {Promise<Array>} Array of market data
   */
  static async getMultipleLiveMarketData(symbols) {
    try {
      console.log(`📊 Fetching live market data for ${symbols.length} symbols`);
      
      const response = await api.post('/market/quotes', { symbols });
      
      console.log(`✅ Live market data fetched for ${symbols.length} symbols`);
      
      return response.data.data || [];
    } catch (error) {
      console.error(`❌ Error fetching live market data:`, error);
      throw error;
    }
  }

  /**
   * Get index data
   * @returns {Promise<Array>} Array of index data
   */
  static async getIndexData() {
    try {
      console.log(`📊 Fetching index data`);
      
      const response = await api.get('/market/indices');
      
      console.log(`✅ Index data fetched: ${response.data.data.length} indices`);
      
      return response.data.data || [];
    } catch (error) {
      console.error(`❌ Error fetching index data:`, error);
      throw error;
    }
  }
}

export default MarketDataService; 