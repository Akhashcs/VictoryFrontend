import api, { onTradingState } from './api';

/**
 * Trade Service
 * Client-side service that uses backend trade operations
 */
class TradeService {
  /**
   * Place a live trade
   * @param {Object} tradeData - Trade data
   * @returns {Promise<Object>} Trade log
   */
  static async placeLiveTrade(tradeData) {
    try {
      const response = await api.post('/trade/live', tradeData);
      return response.data.data;
    } catch (error) {
      console.error('[TradeService] Error placing live trade:', error);
      throw error;
    }
  }

  /**
   * Get today's trade logs
   * @returns {Promise<Array>} Trade logs
   */
  static async getTradeLogs() {
    try {
      console.log('[TradeService] Fetching today\'s trade logs from /trade/logs');
      const response = await api.get('/trade/logs');
      console.log('[TradeService] Received trade logs:', response.data.data?.length || 0, 'entries');
      return response.data.data;
    } catch (error) {
      console.error('[TradeService] Error getting trade logs:', error);
      return [];
    }
  }

  /**
   * Get today's trade logs (alias for getTradeLogs for backward compatibility)
   * @returns {Promise<Array>} Trade logs
   */
  static async getTodayTradeLogs() {
    return this.getTradeLogs();
  }

  /**
   * Get all trade logs
   * @returns {Promise<Array>} Trade logs
   */
  static async getAllTradeLogs() {
    try {
      console.log('[TradeService] Fetching all trade logs from /trade/logs/all');
      const response = await api.get('/trade/logs/all');
      console.log('[TradeService] Received all trade logs:', response.data.data?.length || 0, 'entries');
      return response.data.data;
    } catch (error) {
      console.error('[TradeService] Error getting all trade logs:', error);
      return [];
    }
  }

  /**
   * Get trade logs for a specific date
   * @param {Date} date - Date to get logs for
   * @returns {Promise<Array>} Trade logs
   */
  static async getTradeLogsByDate(date) {
    try {
      const dateString = date.toISOString().split('T')[0];
      const response = await api.get(`/trade/logs/date/${dateString}`);
      return response.data.data;
    } catch (error) {
      console.error(`[TradeService] Error getting trade logs for ${date}:`, error);
      return [];
    }
  }

  /**
   * Get trade statistics
   * @returns {Promise<Object>} Trade statistics
   */
  static async getTradeStats() {
    try {
      const response = await api.get('/trade/stats');
      return response.data.data;
    } catch (error) {
      console.error('[TradeService] Error getting trade statistics:', error);
      return {
        todayTrades: 0,
        todayPnL: 0,
        totalTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgPnL: 0
      };
    }
  }

  /**
   * Save trading state
   * @param {Object} state - Trading state
   * @returns {Promise<boolean>} Success
   */
  static async saveTradingState(state) {
    try {
      console.log('[TradeService] Saving trading state:', {
        stateType: typeof state,
        stateKeys: Object.keys(state || {}),
        monitoredSymbolsType: typeof state?.monitoredSymbols,
        monitoredSymbolsIsArray: Array.isArray(state?.monitoredSymbols),
        monitoredSymbolsLength: state?.monitoredSymbols?.length,
        monitoredSymbolsSample: state?.monitoredSymbols?.[0]
      });
      
      const response = await api.post('/trade/state', { state });
      return response.data.success;
    } catch (error) {
      console.error('[TradeService] Error saving trading state:', error);
      return false;
    }
  }

  /**
   * Load trading state
   * @returns {Promise<Object|null>} Trading state
   */
  static async loadTradingState() {
    try {
      console.log('[TradeService] Loading trading state...');
      const response = await api.get('/trade/state');
      
      console.log('[TradeService] Received response:', {
        success: response.data.success,
        hasData: !!response.data.data,
        dataType: typeof response.data.data,
        dataKeys: response.data.data ? Object.keys(response.data.data) : null,
        monitoredSymbolsType: typeof response.data.data?.monitoredSymbols,
        monitoredSymbolsIsArray: Array.isArray(response.data.data?.monitoredSymbols),
        monitoredSymbolsLength: response.data.data?.monitoredSymbols?.length,
        monitoredSymbolsSample: response.data.data?.monitoredSymbols?.[0]
      });
      
      return response.data.data;
    } catch (error) {
      console.error('[TradeService] Error loading trading state:', error);
      return null;
    }
  }

  /**
   * Clear trading state
   * @returns {Promise<boolean>} Success
   */
  static async clearTradingState() {
    try {
      const response = await api.delete('/trade/state');
      return response.data.success;
    } catch (error) {
      console.error('[TradeService] Error clearing trading state:', error);
      return false;
    }
  }

  /**
   * Reset trading state (clear and create fresh)
   * @returns {Promise<Object|null>} Fresh trading state
   */
  static async resetTradingState() {
    try {
      const response = await api.post('/trade/state/reset');
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('[TradeService] Error resetting trading state:', error);
      return null;
    }
  }

  /**
   * Register callback for trading state updates
   * @param {Function} callback - Callback function
   */
  static onTradingStateUpdate(callback) {
    onTradingState(callback);
  }
}

export default TradeService; 