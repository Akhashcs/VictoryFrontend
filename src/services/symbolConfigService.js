import api from './api';

class SymbolConfigService {
  static symbolConfigCache = {
    configs: [],
    lastUpdated: 0,
    cacheTTL: 30000 // 30 seconds
  };

  /**
   * Get all symbol configurations from backend
   * @returns {Promise<Array>} Array of symbol configurations
   */
  static async getSymbolConfigs() {
    try {
      // Check cache first
      const now = Date.now();
      if (this.symbolConfigCache.configs.length > 0 && 
          (now - this.symbolConfigCache.lastUpdated) < this.symbolConfigCache.cacheTTL) {
        console.log('[SymbolConfigService] Using cached symbol configs');
        return this.symbolConfigCache.configs;
      }

      // Fetch from backend
      const response = await api.get('/market/config');
      const configs = response.data.data || [];
      
      // Update cache
      this.symbolConfigCache.configs = configs;
      this.symbolConfigCache.lastUpdated = now;
      
      console.log(`[SymbolConfigService] Fetched ${configs.length} symbol configs from backend`);
      return configs;
    } catch (error) {
      console.error('[SymbolConfigService] Error fetching symbol configs:', error);
      return [];
    }
  }

  /**
   * Get symbol display name by symbolInput
   * @param {string} symbolInput - The symbol input (e.g., 'NSE:NIFTY50-INDEX')
   * @returns {Promise<string>} Display name
   */
  static async getSymbolDisplayName(symbolInput) {
    try {
      const configs = await this.getSymbolConfigs();
      const config = configs.find(c => c.symbolInput === symbolInput);
      return config ? config.symbolName : symbolInput;
    } catch (error) {
      console.error('[SymbolConfigService] Error getting symbol display name:', error);
      return symbolInput;
    }
  }

  /**
   * Get symbol configuration by symbolInput
   * @param {string} symbolInput - The symbol input
   * @returns {Promise<Object|null>} Symbol configuration
   */
  static async getSymbolConfig(symbolInput) {
    try {
      const configs = await this.getSymbolConfigs();
      return configs.find(c => c.symbolInput === symbolInput) || null;
    } catch (error) {
      console.error('[SymbolConfigService] Error getting symbol config:', error);
      return null;
    }
  }

  /**
   * Get symbols by tab type
   * @param {string} tabType - 'index', 'stock', or 'commodity'
   * @returns {Promise<Array>} Array of symbol configurations
   */
  static async getSymbolsByTabType(tabType) {
    try {
      const configs = await this.getSymbolConfigs();
      return configs.filter(c => c.tabType === tabType);
    } catch (error) {
      console.error('[SymbolConfigService] Error getting symbols by tab type:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  static clearCache() {
    this.symbolConfigCache.configs = [];
    this.symbolConfigCache.lastUpdated = 0;
    console.log('[SymbolConfigService] Cache cleared');
  }

  /**
   * Add new symbol configuration
   * @param {Object} symbolConfig - Symbol configuration object
   * @returns {Promise<Object>} Response from backend
   */
  static async addSymbolConfig(symbolConfig) {
    try {
      const response = await api.post('/market/config', symbolConfig);
      
      // Clear cache to ensure fresh data
      this.clearCache();
      
      return response.data;
    } catch (error) {
      console.error('[SymbolConfigService] Error adding symbol config:', error);
      throw error;
    }
  }

  /**
   * Update symbol configuration
   * @param {string} id - Symbol configuration ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Response from backend
   */
  static async updateSymbolConfig(id, updates) {
    try {
      const response = await api.put(`/market/config/${id}`, updates);
      
      // Clear cache to ensure fresh data
      this.clearCache();
      
      return response.data;
    } catch (error) {
      console.error('[SymbolConfigService] Error updating symbol config:', error);
      throw error;
    }
  }

  /**
   * Delete symbol configuration
   * @param {string} id - Symbol configuration ID
   * @returns {Promise<Object>} Response from backend
   */
  static async deleteSymbolConfig(id) {
    try {
      const response = await api.delete(`/market/config/${id}`);
      
      // Clear cache to ensure fresh data
      this.clearCache();
      
      return response.data;
    } catch (error) {
      console.error('[SymbolConfigService] Error deleting symbol config:', error);
      throw error;
    }
  }
}

export default SymbolConfigService; 