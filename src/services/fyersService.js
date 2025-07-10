import api from './api';

class FyersService {
  // Check Fyers connection status
  static async getConnectionStatus() {
    try {
      const response = await api.get('/fyers/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get Fyers status:', error);
      return { connected: false };
    }
  }

  // Get Fyers profile
  static async getProfile() {
    try {
      const response = await api.get('/fyers/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to get Fyers profile:', error);
      return { connected: false };
    }
  }

  // Generate Fyers auth URL
  static async generateAuthUrl(credentials) {
    try {
      const response = await api.post('/fyers/generate-auth-url', credentials);
      return response.data.url;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to generate auth URL');
    }
  }

  // Authorize with Fyers
  static async authorize(credentials, authCode) {
    try {
      const response = await api.post('/fyers/authorize', {
        ...credentials,
        code: authCode
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to authorize with Fyers');
    }
  }

  // Disconnect Fyers
  static async disconnect() {
    try {
      const response = await api.post('/fyers/disconnect');
      return response.data;
    } catch (error) {
      throw new Error('Failed to disconnect Fyers');
    }
  }

  // Get maintenance status
  static async getMaintenanceStatus() {
    try {
      const response = await api.get('/fyers/maintenance-status');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get maintenance status');
    }
  }

  // Get Fyers funds
  static async getFunds() {
    try {
      const response = await api.get('/fyers/funds');
      return response.data.funds;
    } catch (error) {
      console.error('Failed to get Fyers funds:', error);
      return null;
    }
  }
}

export default FyersService; 