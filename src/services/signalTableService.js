import api from './api';

class SignalTableService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.cache = {
      data: null,
      lastFetch: null,
      cacheDuration: 30 * 1000 // 30 seconds cache
    };
  }

  // Check if cache is valid
  isCacheValid() {
    return this.cache.data && 
           this.cache.lastFetch && 
           (Date.now() - this.cache.lastFetch) < this.cache.cacheDuration;
  }

  // Clear cache
  clearCache() {
    this.cache.data = null;
    this.cache.lastFetch = null;
  }

  // Get signal table data with caching
  async getSignalTableData() {
    try {
      // Check if we have valid cached data
      if (this.isCacheValid()) {
        console.log('[SignalTableService] Using cached signal table data');
        return this.cache.data;
      }

      console.log('[SignalTableService] Fetching fresh signal table data from server');
      
      const response = await fetch(`${this.baseURL}/signal-table/data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the data
      this.cache.data = data;
      this.cache.lastFetch = Date.now();
      
      console.log('[SignalTableService] Signal table data cached successfully');
      return data;
    } catch (error) {
      console.error('[SignalTableService] Error fetching signal table data:', error);
      throw error;
    }
  }

  // Force refresh signal table data (clears cache and fetches fresh data)
  async refreshSignalTableData() {
    console.log('[SignalTableService] Force refreshing signal table data');
    this.clearCache();
    return await this.getSignalTableData();
  }

  // Get last updated time
  async getLastUpdatedTime() {
    try {
      const response = await fetch(`${this.baseURL}/signal-table/last-updated`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.lastUpdated;
    } catch (error) {
      console.error('[SignalTableService] Error fetching last updated time:', error);
      throw error;
    }
  }

  // Initialize signal table service
  async initialize() {
    try {
      const response = await fetch(`${this.baseURL}/signal-table/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SignalTableService] Signal table service initialized:', data);
      return data;
    } catch (error) {
      console.error('[SignalTableService] Error initializing signal table service:', error);
      throw error;
    }
  }

  // Manual trigger for updating signal data
  async triggerUpdate() {
    try {
      const response = await fetch(`${this.baseURL}/signal-table/trigger-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache after update to ensure fresh data on next fetch
      this.clearCache();
      
      console.log('[SignalTableService] Signal table update triggered:', data);
      return data;
    } catch (error) {
      console.error('[SignalTableService] Error triggering signal table update:', error);
      throw error;
    }
  }

  // Stop signal table updates
  async stopUpdates() {
    try {
      const response = await fetch(`${this.baseURL}/signal-table/stop-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[SignalTableService] Signal table updates stopped:', data);
      return data;
    } catch (error) {
      console.error('[SignalTableService] Error stopping signal table updates:', error);
      throw error;
    }
  }

  // Format symbol for display (remove NSE: prefix and -EQ suffix)
  formatSymbol(symbol) {
    return symbol.replace('NSE:', '').replace('-EQ', '');
  }

  // Get signal color class
  getSignalColor(signal) {
    switch (signal) {
      case 'Buy':
        return 'text-green-400 bg-green-900/20 border-green-700/30';
      case 'Sell':
        return 'text-red-400 bg-red-900/20 border-red-700/30';
      default:
        return 'text-slate-400 bg-slate-700/50';
    }
  }

  // Format price with 2 decimal places
  formatPrice(price) {
    return price ? `₹${price.toFixed(2)}` : '--';
  }

  // Format last updated time
  formatLastUpdated(lastUpdated) {
    if (!lastUpdated) return '--';
    
    const date = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
  }
}

export default new SignalTableService(); 