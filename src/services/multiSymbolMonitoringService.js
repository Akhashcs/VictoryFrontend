import TradeService from './tradeService';

/**
 * Service to manage monitored symbols
 * Uses backend trading state for persistence
 */
class MultiSymbolMonitoringService {
  /**
   * Get monitored symbols from backend
   * @returns {Promise<Array>} Monitored symbols
   */
  static async getMonitoredSymbols() {
    const state = await TradeService.loadTradingState();
    return state?.monitoredSymbols || [];
  }

  /**
   * Remove a symbol from monitoring
   * @param {string} symbolId - Symbol ID to remove
   * @param {Function} setMonitoredSymbols - React state setter
   * @returns {Promise<Array>} Updated monitored symbols
   */
  static async removeSymbolFromMonitoring(symbolId, setMonitoredSymbols) {
    const state = await TradeService.loadTradingState();
    const symbols = state?.monitoredSymbols || [];
    const filtered = symbols.filter(s => s.id !== symbolId);
    await TradeService.saveTradingState({ ...state, monitoredSymbols: filtered });
    setMonitoredSymbols(filtered);
    return filtered;
  }

  /**
   * Clear all monitoring
   * @param {Function} setMonitoredSymbols - React state setter
   * @returns {Promise<void>}
   */
  static async clearAllMonitoring(setMonitoredSymbols) {
    await TradeService.clearTradingState();
    setMonitoredSymbols([]);
  }

  /**
   * Update symbol HMA value
   * @param {string} symbolId - Symbol ID to update
   * @param {number} newHMA - New HMA value
   * @param {Date} lastUpdate - Last update timestamp
   * @param {Function} setMonitoredSymbols - React state setter
   * @returns {Promise<Array>} Updated monitored symbols
   */
  static async updateSymbolHMA(symbolId, newHMA, lastUpdate, setMonitoredSymbols) {
    const state = await TradeService.loadTradingState();
    const symbols = state?.monitoredSymbols || [];
    const updated = symbols.map(s => {
      if (s.id === symbolId) {
        return { ...s, hmaValue: newHMA, lastUpdate };
      }
      return s;
    });
    await TradeService.saveTradingState({ ...state, monitoredSymbols: updated });
    setMonitoredSymbols(updated);
    return updated;
  }

  /**
   * Stop all monitoring
   * @param {Function} setMonitoredSymbols - React state setter
   * @returns {Promise<void>}
   */
  static async stopAllMonitoring(setMonitoredSymbols) {
    await TradeService.clearTradingState();
    setMonitoredSymbols([]);
  }
}

export default MultiSymbolMonitoringService; 