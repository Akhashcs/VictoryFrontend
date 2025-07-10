import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TokenExpirationModal = ({ isOpen, onClose, onTokenRefreshed }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Get stored credentials from localStorage (if available)
      const storedEmail = localStorage.getItem('fyers_email');
      const storedPassword = localStorage.getItem('fyers_password');
      
      if (!storedEmail || !storedPassword) {
        setError('No stored credentials found. Please login manually.');
        return;
      }
      
      // Attempt to login with stored credentials
      const result = await login(storedEmail, storedPassword);
      
      if (result.success) {
        console.log('✅ Fyers token refreshed successfully');
        onTokenRefreshed();
        onClose();
      } else {
        setError(result.message || 'Failed to refresh token. Please login manually.');
      }
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      setError('Failed to refresh token. Please login manually.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualLogin = () => {
    // Clear current session and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 rounded-lg shadow-xl border border-slate-700 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Session Expired
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 mb-4">
            Your Fyers trading session has expired. This happens daily at 6 AM. 
            You need to refresh your session to continue trading.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-3">
            {/* Auto Refresh Button */}
            <button
              onClick={handleRefreshToken}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand/90 disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Auto Refresh Session
                </>
              )}
            </button>
            
            {/* Manual Login Button */}
            <button
              onClick={handleManualLogin}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Login Manually
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
            <p className="text-slate-400 text-xs">
              <strong>Note:</strong> Auto refresh will only work if you previously saved your credentials. 
              Otherwise, please login manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenExpirationModal; 