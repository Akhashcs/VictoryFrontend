import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import FyersModal from '../dashboard/FyersModal';
import IndexCard from '../dashboard/IndexCard';
import MonitoringDashboard from '../dashboard/MonitoringDashboard';
import TradingInterface from '../dashboard/TradingInterface';
import TradeLog from '../dashboard/TradeLog';
import MaintenanceOverlay from '../common/MaintenanceOverlay';
import TokenExpirationModal from '../common/TokenExpirationModal';
import ToastContainer from '../common/ToastContainer';
import FyersService from '../../services/fyersService';
import MarketService from '../../services/marketService';
import api, { setTokenExpirationHandler } from '../../services/api';

const Options = () => {
  const { user } = useAuth();
  const [fyersModalOpen, setFyersModalOpen] = useState(false);
  const [tokenExpirationModalOpen, setTokenExpirationModalOpen] = useState(false);
  const [fyersStatus, setFyersStatus] = useState({ connected: false, profileName: null });
  const [indicesData, setIndicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceOverlayVisible, setMaintenanceOverlayVisible] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState('inactive');
  
  // Header status for trading interface
  const [headerStatus, setHeaderStatus] = useState({
    monitoringStatus: 'OFF',
    tradeEngineStatus: 'STOPPED',
    selectedIndex: 'NIFTY'
  });

  // Set up global token expiration handler
  useEffect(() => {
    setTokenExpirationHandler(() => {
      console.log('🔄 Token expiration detected, showing modal...');
      setTokenExpirationModalOpen(true);
    });

    return () => {
      setTokenExpirationHandler(null);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    // Set initial loading state
    setLoading(true);
    // Initial data load (only non-Fyers-dependent)
    loadOptionsData();
    // Check maintenance status
    checkMaintenanceStatus();
    // Set up regular status checks
    const statusInterval = setInterval(updateStatus, 10000); // Check status every 10 seconds
    // Check maintenance status every 5 minutes
    const maintenanceInterval = setInterval(checkMaintenanceStatus, 300000);
    
    // Listen for Fyers reconnection events
    const handleFyersReconnection = (event) => {
      console.log('[Options] Fyers reconnection required:', event.detail.message);
      // Update Fyers status to disconnected
      setFyersStatus({ connected: false, profileName: null });
      // Clear market data
      setIndicesData([]);
      // Show reconnection modal
      setFyersModalOpen(true);
    };
    
    window.addEventListener('fyersReconnectionRequired', handleFyersReconnection);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(maintenanceInterval);
      window.removeEventListener('fyersReconnectionRequired', handleFyersReconnection);
      // Cleanup market service when component unmounts
      MarketService.cleanup();
    };
  }, []);

  // Load market data when component mounts and when Fyers status changes
  useEffect(() => {
    const unsubscribe = MarketService.subscribeToUpdates((updatedData) => {
      console.log('[Options] Received market data update:', updatedData);
      setIndicesData(updatedData);
    });
    
    // Always load market data regardless of Fyers connection status
    loadMarketData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fyersStatus.connected]);

  // Load options data
  const loadOptionsData = async () => {
    try {
      // Load Fyers status
      try {
        const fyersData = await FyersService.getConnectionStatus();
        setFyersStatus(fyersData);
      } catch (error) {
        // Don't update state on error to keep existing state
      }

      // Load market data
      await loadMarketData();

      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  // Load market data regardless of Fyers connection status
  const loadMarketData = async () => {
    try {
      const marketData = await MarketService.getIndicesData();
      setIndicesData(marketData);
    } catch (error) {
      console.error('Failed to load market data:', error);
      
      // Check if it's a Fyers reconnection error
      if (error.response?.data?.requiresReconnection) {
        console.log('[Options] Fyers reconnection required during market data load');
        // The event listener will handle this
        return;
      }
      
      // For other errors, just log them
      console.error('Market data load error:', error);
    }
  };

  const updateStatus = async () => {
    try {
      // Update market status (local calculation)
      try {
        const marketStatus = await MarketService.getMarketStatus();
        // We don't need to set market status here as it's handled by the header
      } catch (error) {
        console.error('Failed to get market status:', error);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleFyersSuccess = (profile) => {
    setFyersStatus({
      connected: true,
      profileName: profile?.data?.name || 'Connected'
    });
  };

  const handleStatusUpdate = (updates) => {
    setHeaderStatus(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleTradeLog = (log) => {
    // Handle trade log updates if needed
    console.log('[Options] Trade log update:', log);
  };

  const handleMonitoringUpdate = () => {
    // Handle monitoring updates if needed
    console.log('[Options] Monitoring update');
  };

  const checkMaintenanceStatus = async () => {
    try {
      const response = await api.get('/monitoring/maintenance-status');
      const { isActive, message } = response.data;
      
      if (isActive) {
        setMaintenanceStatus('active');
        setMaintenanceOverlayVisible(true);
      } else {
        setMaintenanceStatus('inactive');
        setMaintenanceOverlayVisible(false);
      }
    } catch (error) {
      console.error('Failed to check maintenance status:', error);
      setMaintenanceStatus('inactive');
      setMaintenanceOverlayVisible(false);
    }
  };

  const handleTokenRefreshed = () => {
    console.log('🔄 Token refreshed, reloading data...');
    setTokenExpirationModalOpen(false);
    
    // Refresh market data and Fyers status
    loadOptionsData();
  };

  return (
    <>
      <main className="flex-1">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          {/* Index Cards */}
          {fyersStatus.connected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {indicesData.map((indexData, idx) => (
                <IndexCard 
                  key={indexData.indexName || idx} 
                  data={indexData} 
                  loading={loading}
                  index={idx}
                  compact={true}
                />
              ))}
              {indicesData.length === 0 && !loading && (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold mb-2">No Market Data</h3>
                  <p className="text-slate-400 text-sm">Market data will appear here when available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-3xl">V</span>
              </div>
              
              <h1 className="text-4xl font-bold text-white mb-4">
                Welcome to Victory Options Trading
              </h1>
              
              <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
                Connect your Fyers account to start viewing live market data and trading options.
              </p>
              
              <button
                onClick={() => setFyersModalOpen(true)}
                className="btn-primary text-lg px-8 py-3"
              >
                Connect Fyers Account
              </button>
            </div>
          )}

          {/* Additional Trading Cards - Only show when Fyers is connected */}
          {fyersStatus.connected && (
            <>
              {/* Trading Interface - Full Width */}
              <TradingInterface 
                headerStatus={headerStatus}
                onStatusUpdate={handleStatusUpdate}
                onTradeLog={handleTradeLog}
                indicesData={indicesData}
                onMonitoringUpdate={handleMonitoringUpdate}
              />

              {/* Monitoring Dashboard - Shows Waiting for Trade & Active Positions */}
              <div className="mt-6 sm:mt-8">
                <MonitoringDashboard onTradeLog={handleTradeLog} />
              </div>

              {/* Trade Log - Below Monitoring Dashboard */}
              <div className="mb-6 sm:mb-8">
                <TradeLog />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Fyers Modal */}
      <FyersModal
        isOpen={fyersModalOpen}
        onClose={() => setFyersModalOpen(false)}
        onSuccess={handleFyersSuccess}
      />

      {/* Maintenance Overlay */}
      <MaintenanceOverlay
        isVisible={maintenanceOverlayVisible}
        onClose={() => setMaintenanceOverlayVisible(false)}
      />

      {/* Token Expiration Modal */}
      <TokenExpirationModal
        isOpen={tokenExpirationModalOpen}
        onClose={() => setTokenExpirationModalOpen(false)}
        onTokenRefreshed={handleTokenRefreshed}
      />

      {/* Toast Container */}
      <ToastContainer />
    </>
  );
};

export default Options; 