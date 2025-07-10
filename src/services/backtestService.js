import api from './api';

class BacktestService {
  /**
   * Fetch historical data for backtesting
   * @param {Object} params - Parameters for historical data fetch
   * @returns {Promise<Object>} Historical data response
   */
  static async fetchHistoricalData(params) {
    try {
      const response = await api.post('/backtest/fetch-historical-data', params);
      return response.data;
    } catch (error) {
      console.error('BacktestService: Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Execute backtest with HMA strategy
   * @param {Object} params - Backtest parameters
   * @returns {Promise<Object>} Backtest results
   */
  static async executeBacktest(params) {
    try {
      const response = await api.post('/backtest/execute', params);
      return response.data;
    } catch (error) {
      console.error('BacktestService: Error executing backtest:', error);
      throw error;
    }
  }

  /**
   * Get symbols for the selected index
   * @param {string} indexName - Index name (NIFTY, BANKNIFTY, SENSEX)
   * @returns {Promise<Object>} Symbols response
   */
  static async getSymbols(indexName) {
    try {
      const response = await api.get(`/backtest/symbols/${indexName}`);
      return response.data;
    } catch (error) {
      console.error('BacktestService: Error fetching symbols:', error);
      throw error;
    }
  }

  /**
   * Save backtest results to MongoDB
   * @param {Object} params - Save parameters
   * @returns {Promise<Object>} Save response
   */
  static async saveBacktest(params) {
    try {
      const response = await api.post('/backtest/save', params);
      return response.data;
    } catch (error) {
      console.error('BacktestService: Error saving backtest:', error);
      throw error;
    }
  }

  /**
   * Get all saved backtests for user
   * @returns {Promise<Object>} Saved backtests
   */
  static async getSavedBacktests() {
    try {
      const response = await api.get('/backtest/saved');
      return response.data;
    } catch (error) {
      console.error('BacktestService: Error fetching saved backtests:', error);
      throw error;
    }
  }

  /**
   * Get specific backtest details
   * @param {string} id - Backtest ID
   * @returns {Promise<Object>} Backtest details
   */
  static async getBacktestDetails(id) {
    try {
      const response = await api.get(`/backtest/saved/${id}`);
      return response.data;
    } catch (error) {
      console.error('BacktestService: Error fetching backtest details:', error);
      throw error;
    }
  }

  /**
   * Validate symbol format for Fyers
   * @param {string} symbol - Symbol to validate
   * @returns {boolean} Whether symbol is valid
   */
  static validateSymbol(symbol) {
    if (!symbol) return false;
    
    // Basic validation for common formats
    const validFormats = [
      /^NSE:[A-Z0-9]+$/, // NSE:SYMBOL
      /^BSE:[A-Z0-9]+$/, // BSE:SYMBOL
      /^NSE:[A-Z0-9]+[0-9]{6}[A-Z]{2}$/, // NSE:SYMBOL + expiry + CE/PE
      /^BSE:[A-Z0-9]+[0-9]{6}[A-Z]{2}$/  // BSE:SYMBOL + expiry + CE/PE
    ];
    
    return validFormats.some(format => format.test(symbol));
  }

  /**
   * Get default date range for backtesting (last 30 days) in IST
   * @returns {Object} Start and end dates
   */
  static getDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Convert to IST (UTC+5:30)
    const istEndDate = new Date(endDate.getTime() + (5.5 * 60 * 60 * 1000));
    const istStartDate = new Date(startDate.getTime() + (5.5 * 60 * 60 * 1000));
    
    return {
      startDate: istStartDate.toISOString().slice(0, 16),
      endDate: istEndDate.toISOString().slice(0, 16)
    };
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calculate duration between two dates
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {string} Formatted duration
   */
  static calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
}

export default BacktestService; 