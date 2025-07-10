import api from './api';

class HullSuiteService {
  /**
   * Get Hull Suite signals for all stocks
   * @returns {Promise<Array>} - Array of stock signals with Hull Suite data
   */
  static async getHullSuiteSignals() {
    try {
      const response = await api.get('/hma/hull-suite-signals');
      return response.data;
    } catch (error) {
      console.error('Error fetching Hull Suite signals:', error);
      throw error;
    }
  }

  /**
   * Get Hull Suite signal for specific stock
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} - Hull Suite signal data for the stock
   */
  static async getHullSuiteSignalForSymbol(symbol) {
    try {
      const response = await api.get(`/hma/hull-suite-signals/${symbol}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Hull Suite signal for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Update Hull Suite signals for all stocks
   * @returns {Promise<Object>} - Update result
   */
  static async updateHullSuiteSignals() {
    try {
      const response = await api.post('/hma/update-hull-suite-signals');
      return response.data;
    } catch (error) {
      console.error('Error updating Hull Suite signals:', error);
      throw error;
    }
  }

  /**
   * Get signal color based on signal type
   * @param {string} signal - Signal type
   * @returns {string} - CSS color class
   */
  static getSignalColor(signal) {
    switch (signal) {
      case 'Buy':
        return 'text-green-600 bg-green-100';
      case 'Sell':
        return 'text-red-600 bg-red-100';
      case 'Bullish':
        return 'text-blue-600 bg-blue-100';
      case 'Bearish':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  /**
   * Get signal icon based on signal type
   * @param {string} signal - Signal type
   * @returns {string} - Icon class or emoji
   */
  static getSignalIcon(signal) {
    switch (signal) {
      case 'Buy':
        return '📈';
      case 'Sell':
        return '📉';
      case 'Bullish':
        return '🚀';
      case 'Bearish':
        return '🐻';
      default:
        return '➖';
    }
  }

  /**
   * Format price with 2 decimal places
   * @param {number} price - Price to format
   * @returns {string} - Formatted price
   */
  static formatPrice(price) {
    if (!price || isNaN(price)) return '0.00';
    return price.toFixed(2);
  }

  /**
   * Calculate price change percentage
   * @param {number} currentPrice - Current price
   * @param {number} previousPrice - Previous price
   * @returns {string} - Formatted percentage change
   */
  static getPriceChange(currentPrice, previousPrice) {
    if (!currentPrice || !previousPrice || previousPrice === 0) return '0.00%';
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  }

  /**
   * Get price change color class
   * @param {number} currentPrice - Current price
   * @param {number} previousPrice - Previous price
   * @returns {string} - CSS color class
   */
  static getPriceChangeColor(currentPrice, previousPrice) {
    if (!currentPrice || !previousPrice) return 'text-gray-500';
    const change = currentPrice - previousPrice;
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  }
}

export default HullSuiteService; 