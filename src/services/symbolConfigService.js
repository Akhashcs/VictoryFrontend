import api from './api';

class SymbolConfigService {
  static async getAllSymbols() {
    try {
      console.log('SymbolConfigService: Fetching all symbols...');
      const response = await api.get('/market/config');
      console.log('SymbolConfigService: Response:', response.data);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching symbol configs:', error);
      return [];
    }
  }

  static async getSymbolsByTabType(tabType) {
    try {
      const response = await api.get(`/market/config/tab/${tabType}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching symbols by tab type:', error);
      return [];
    }
  }

  static async getMarketDataSymbols() {
    try {
      const response = await api.get('/market/config/market-data');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching market data symbols:', error);
      return [];
    }
  }

  static async addSymbol(symbolData) {
    try {
      const response = await api.post('/market/config', symbolData);
      return response.data.data;
    } catch (error) {
      console.error('Error adding symbol:', error);
      throw error;
    }
  }

  static async updateSymbol(id, symbolData) {
    try {
      const response = await api.put(`/market/config/${id}`, symbolData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating symbol:', error);
      throw error;
    }
  }

  static async deleteSymbol(id) {
    try {
      const response = await api.delete(`/market/config/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error deleting symbol:', error);
      throw error;
    }
  }

  // Convert symbol configs to the format expected by the UI
  static convertToUnderlyingConfigs(symbols) {
    return symbols.map(symbol => ({
      name: symbol.symbolName,
      value: symbol.symbolName,
      type: symbol.tabType,
      symbolInput: symbol.symbolInput,
      optionSymbolFormat: symbol.optionSymbolFormat,
      nextExpiry: symbol.nextExpiry,
      strikeInterval: symbol.strikeInterval
    }));
  }

  // Get symbols grouped by tab type
  static getSymbolsByType(symbols) {
    return {
      index: symbols.filter(s => s.tabType === 'index'),
      stock: symbols.filter(s => s.tabType === 'stock'),
      commodity: symbols.filter(s => s.tabType === 'commodity')
    };
  }
}

export default SymbolConfigService; 