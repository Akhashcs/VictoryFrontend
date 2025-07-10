import api from './api';

/**
 * Backend Monitoring Service
 * Frontend service that communicates with backend monitoring API
 * All monitoring logic is now handled on the backend
 */
class BackendMonitoringService {
  /**
   * Start monitoring for the current user
   * @returns {Promise<boolean>} Success status
   */
  static async startMonitoring() {
    try {
      const response = await api.post('/monitoring/start');
      return response.data.success;
    } catch (error) {
      console.error('[BackendMonitoringService] Error starting monitoring:', error);
      return false;
    }
  }

  /**
   * Stop monitoring for the current user
   * @returns {Promise<boolean>} Success status
   */
  static async stopMonitoring() {
    try {
      const response = await api.post('/monitoring/stop');
      return response.data.success;
    } catch (error) {
      console.error('[BackendMonitoringService] Error stopping monitoring:', error);
      return false;
    }
  }

  /**
   * Add symbol to monitoring
   * @param {Object} symbolData - Symbol configuration
   * @returns {Promise<Object>} Updated state
   */
  static async addSymbol(symbolData) {
    try {
      const response = await api.post('/monitoring/symbols/add', symbolData);
      return response.data.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error adding symbol to monitoring:', error);
      throw error;
    }
  }

  /**
   * Update a symbol's HMA value
   * @param {string} symbolId - Symbol ID
   * @param {number} hmaValue - New HMA value
   * @param {Date} lastUpdate - Last update timestamp
   * @returns {Promise<Object>} Updated state
   */
  static async updateSymbolHMA(symbolId, hmaValue, lastUpdate) {
    try {
      const response = await api.post('/monitoring/symbols/update-hma', {
        symbolId,
        hmaValue,
        lastUpdate
      });
      return response.data.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error updating symbol HMA:', error);
      throw error;
    }
  }

  /**
   * Remove symbol from monitoring
   * @param {string} symbolId - Symbol ID
   * @returns {Promise<Object>} Updated state
   */
  static async removeSymbolFromMonitoring(symbolId) {
    try {
      const response = await api.delete(`/monitoring/symbols/${symbolId}`);
      return response.data.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error removing symbol from monitoring:', error);
      throw error;
    }
  }

  /**
   * Clear all monitoring
   * @returns {Promise<boolean>} Success status
   */
  static async clearAllMonitoring() {
    try {
      const response = await api.delete('/monitoring/symbols');
      return response.data.success;
    } catch (error) {
      console.error('[BackendMonitoringService] Error clearing monitoring:', error);
      return false;
    }
  }

  /**
   * Update HMA values for monitored symbols
   * @returns {Promise<Object>} Updated state
   */
  static async updateHMAValues() {
    try {
      const response = await api.post('/monitoring/hma/update');
      return response.data.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error updating HMA values:', error);
      throw error;
    }
  }

  /**
   * Execute monitoring cycle (manual trigger)
   * @returns {Promise<Object>} Execution results
   */
  static async executeMonitoringCycle() {
    try {
      const response = await api.post('/monitoring/cycle/execute');
      return response.data.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error executing monitoring cycle:', error);
      throw error;
    }
  }

  /**
   * Update active positions
   * @returns {Promise<Object>} Update results
   */
  static async updateActivePositions() {
    try {
      const response = await api.post('/monitoring/positions/update');
      return response.data.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error updating positions:', error);
      throw error;
    }
  }

  /**
   * Get monitoring status
   * @returns {Promise<Object>} Monitoring status
   */
  static async getMonitoringStatus() {
    try {
      const response = await api.get('/monitoring/status');
      return response.data.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error getting monitoring status:', error);
      return {
        isMonitoring: false,
        monitoredSymbols: [],
        activePositions: [],
        tradeExecutionState: {
          isMonitoring: false,
          totalTradesExecuted: 0,
          totalPnL: 0
        }
      };
    }
  }

  /**
   * Get monitored symbols
   * @returns {Promise<Array>} Monitored symbols
   */
  static async getMonitoredSymbols() {
    try {
      const status = await this.getMonitoringStatus();
      return status.monitoredSymbols || [];
    } catch (error) {
      console.error('[BackendMonitoringService] Error getting monitored symbols:', error);
      return [];
    }
  }

  /**
   * Get active positions
   * @returns {Promise<Array>} Active positions
   */
  static async getActivePositions() {
    try {
      const status = await this.getMonitoringStatus();
      return status.activePositions || [];
    } catch (error) {
      console.error('[BackendMonitoringService] Error getting active positions:', error);
      return [];
    }
  }

  /**
   * Get pending orders
   * @returns {Promise<Array>} Pending orders
   */
  static async getPendingOrders() {
    try {
      const status = await this.getMonitoringStatus();
      return status.pendingOrders || [];
    } catch (error) {
      console.error('[BackendMonitoringService] Error getting pending orders:', error);
      return [];
    }
  }

  /**
   * Check if monitoring is active
   * @returns {Promise<boolean>} Monitoring status
   */
  static async isMonitoringActive() {
    try {
      const status = await this.getMonitoringStatus();
      return status.isMonitoring || false;
    } catch (error) {
      console.error('[BackendMonitoringService] Error checking monitoring status:', error);
      return false;
    }
  }

  /**
   * Get trade execution state
   * @returns {Promise<Object>} Trade execution state
   */
  static async getTradeExecutionState() {
    try {
      const status = await this.getMonitoringStatus();
      return status.tradeExecutionState || {
        isMonitoring: false,
        totalTradesExecuted: 0,
        totalPnL: 0
      };
    } catch (error) {
      console.error('[BackendMonitoringService] Error getting trade execution state:', error);
      return {
        isMonitoring: false,
        totalTradesExecuted: 0,
        totalPnL: 0
      };
    }
  }

  /**
   * Cancel an order
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  static async cancelOrder(orderId) {
    try {
      const response = await api.delete(`/monitoring/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('[BackendMonitoringService] Error cancelling order:', error);
      return { success: false, error: error.message };
    }
  }
}

export default BackendMonitoringService; 