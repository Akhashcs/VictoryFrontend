import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { connectWebSocket, closeWebSocket } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Check if user is already logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/user/me');
      setUser(response.data.user);
      setAuthenticated(true);
      
      // Initialize WebSocket connection for existing session
      const token = localStorage.getItem('token');
      if (token) {
        connectWebSocket(token);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      setAuthenticated(true);
      
      // Initialize WebSocket connection
      connectWebSocket(token);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle rate limiting specifically
      if (error.isRateLimited) {
        setError('Too many login attempts. Please wait 15 minutes before trying again.');
        return { 
          success: false, 
          message: 'Too many login attempts. Please wait 15 minutes before trying again.',
          isRateLimited: true
        };
      }
      
      // Handle other errors
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to login';
      setError(errorMessage);
      return { 
        success: false, 
        message: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName, email, password, confirmPassword) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', {
        fullName,
        email,
        password,
        confirmPassword
      });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAuthenticated(false);
    
    // Close WebSocket connection
    closeWebSocket();
  };

  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/user/me', updates);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 