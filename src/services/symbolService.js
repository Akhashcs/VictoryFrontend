import api from './api';

/**
 * Symbol Service
 * Client-side service that uses backend symbol generation
 */
class SymbolService {
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
      console.error(`[SymbolService] Error getting option symbols for ${index}:`, error);
      throw error;
    }
  }

  /**
   * Get option chain for an index
   * @param {string} index - Index symbol
   * @param {number} spotPrice - Current spot price
   * @param {string} date - Expiry date (optional)
   * @returns {Promise<Object>} Option chain
   */
  static async getOptionChain(index, spotPrice, date) {
    try {
      const response = await api.get(`/market/option-chain/${index}`, {
        params: {
          spotPrice,
          date
        }
      });
      
      return response.data.data;
    } catch (error) {
      console.error(`[SymbolService] Error getting option chain for ${index}:`, error);
      throw error;
    }
  }

  /**
   * Get expiry dates for an index
   * @param {string} index - Index symbol
   * @returns {Promise<Array>} Expiry dates
   */
  static async getExpiryDates(index) {
    try {
      const response = await api.get(`/market/expiry-dates/${index}`);
      return response.data.data;
    } catch (error) {
      console.error(`[SymbolService] Error getting expiry dates for ${index}:`, error);
      throw error;
    }
  }

  /**
   * Generate strike symbols for an index
   * @param {string} indexName - Index name (e.g., 'NIFTY', 'BANKNIFTY')
   * @param {number} spotPrice - Current spot price
   * @returns {Object} Object with CE and PE symbols
   */
  static generateStrikeSymbols(indexName, spotPrice) {
    try {
      if (!spotPrice || spotPrice <= 0) {
        console.warn('[SymbolService] Invalid spot price for strike generation');
        return { ce: [], pe: [] };
      }

      // Generate strikes around the spot price
      const strikes = [];
      const baseStrike = Math.round(spotPrice / 50) * 50; // Round to nearest 50
      
      // Generate 10 strikes above and below the spot price
      for (let i = -10; i <= 10; i++) {
        const strike = baseStrike + (i * 50);
        if (strike > 0) {
          strikes.push(strike);
        }
      }

      // Sort strikes
      strikes.sort((a, b) => a - b);

      // Helper function to get strike classification
      const getStrikeClassification = (strike, type) => {
        if (type === 'CE') {
          if (strike === baseStrike) return 'ATM';
          if (strike < baseStrike) return `ITM ${Math.abs(strike - baseStrike) / 50}`;
          if (strike > baseStrike) return `OTM ${(strike - baseStrike) / 50}`;
        } else { // PE
          if (strike === baseStrike) return 'ATM';
          if (strike > baseStrike) return `ITM ${(strike - baseStrike) / 50}`;
          if (strike < baseStrike) return `OTM ${Math.abs(strike - baseStrike) / 50}`;
        }
        return '';
      };

      // Generate CE and PE symbols with descriptive labels
      const ceSymbols = strikes.map(strike => {
        const classification = getStrikeClassification(strike, 'CE');
        return {
          symbol: `${indexName}${strike}CE`,
          label: `${classification} (${indexName} ${strike}CE)`,
          strike: strike,
          type: 'CE',
          lotSize: indexName === 'NIFTY' ? 75 : (indexName === 'BANKNIFTY' ? 35 : 20),
          classification: classification
        };
      });

      const peSymbols = strikes.map(strike => {
        const classification = getStrikeClassification(strike, 'PE');
        return {
          symbol: `${indexName}${strike}PE`,
          label: `${classification} (${indexName} ${strike}PE)`,
          strike: strike,
          type: 'PE',
          lotSize: indexName === 'NIFTY' ? 75 : (indexName === 'BANKNIFTY' ? 35 : 20),
          classification: classification
        };
      });

      return {
        ce: ceSymbols,
        pe: peSymbols
      };
    } catch (error) {
      console.error('[SymbolService] Error generating strike symbols:', error);
      return { ce: [], pe: [] };
    }
  }
}

export default SymbolService; 