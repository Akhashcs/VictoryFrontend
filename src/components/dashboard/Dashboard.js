import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import FyersModal from './FyersModal';
import IndexCard from './IndexCard';
import StatusIndicator from './StatusIndicator';
import MonitoringDashboard from './MonitoringDashboard';
import TradingInterface from './TradingInterface';
import TradeLog from './TradeLog';
import NotificationsIcon from './NotificationsIcon';
import MaintenanceOverlay from '../common/MaintenanceOverlay';
import TokenExpirationModal from '../common/TokenExpirationModal';
import ToastContainer from '../common/ToastContainer';
import FyersService from '../../services/fyersService';
import MarketService from '../../services/marketService';
import api, { setTokenExpirationHandler } from '../../services/api';
import logo from '../../assets/logo.svg';
import { Menu } from '@headlessui/react';
import { ChevronDown, LogOut, DollarSign, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [fyersModalOpen, setFyersModalOpen] = useState(false);
  const [tokenExpirationModalOpen, setTokenExpirationModalOpen] = useState(false);
  const [fyersStatus, setFyersStatus] = useState({ connected: false, profileName: null });
  const [indicesData, setIndicesData] = useState([]);
  const [marketStatus, setMarketStatus] = useState('closed');
  const [serverStatus, setServerStatus] = useState('running');
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState(null);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [fundsError, setFundsError] = useState('');
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
    setServerStatus('loading');
    // Initial data load (only non-Fyers-dependent)
    loadDashboardData();
    // Check maintenance status
    checkMaintenanceStatus();
    // Set up regular status checks
    const statusInterval = setInterval(updateStatus, 10000); // Check status every 10 seconds
    // Check maintenance status every 5 minutes
    const maintenanceInterval = setInterval(checkMaintenanceStatus, 300000);
    
    // Listen for Fyers reconnection events
    const handleFyersReconnection = (event) => {
      console.log('[Dashboard] Fyers reconnection required:', event.detail.message);
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
      console.log('[Dashboard] Received market data update:', updatedData);
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

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      // Load Fyers status
      try {
      const fyersData = await FyersService.getConnectionStatus();
      setFyersStatus(fyersData);
      } catch (error) {
        // Don't update state on error to keep existing state
      }

      // Load server status with retry
      try {
        await refreshServerStatus();
      } catch (error) {
        // refreshServerStatus already handles setting the status
      }

      // Only load market data if server is running
      if (serverStatus === 'running') {
        await loadMarketData();
      } else {
        console.log('[Dashboard] Server not running, skipping market data load');
      }

      // Update market status (local calculation)
      try {
        const marketStatus = await MarketService.getMarketStatus();
        setMarketStatus(marketStatus);
      } catch (error) {
        console.error('Failed to get market status:', error);
        setMarketStatus('unknown');
      }

      setLoading(false);
    } catch (error) {
      console.error('[Dashboard] Error loading dashboard data:', error);
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
        console.log('[Dashboard] Fyers reconnection required during market data load');
        // The event listener will handle this
        return;
      }
      
      // For other errors, just log them
      console.error('Market data load error:', error);
    }
  };

  const updateStatus = async () => {
    try {
      const serverHealth = await MarketService.checkServerHealth();
      setServerStatus(serverHealth);
      try {
        const marketStatus = await MarketService.getMarketStatus();
        setMarketStatus(marketStatus);
      } catch (error) {
        console.error('Failed to get market status:', error);
        setMarketStatus('unknown');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      // Don't immediately set server to stopped on error
      // This prevents false negatives during page refresh
    }
  };

  const handleFyersSuccess = (profile) => {
    setFyersStatus({
      connected: true,
      profileName: profile?.data?.name || 'Connected'
    });
  };

  const handleFyersDisconnect = async () => {
    try {
      await FyersService.disconnect();
      setFyersStatus({ connected: false, profileName: null });
      setIndicesData([]);
      // Stop the queue system
      MarketService.cleanup();
    } catch (error) {
      console.error('Failed to disconnect Fyers:', error);
    }
  };

  const handleStatusUpdate = (updates) => {
    setHeaderStatus(prev => ({ ...prev, ...updates }));
  };

  const handleTradeLog = (log) => {
    // Keep this for TradingInterface compatibility but don't display logs
    console.log('Trade log:', log);
  };

  const [monitoringRefreshTrigger, setMonitoringRefreshTrigger] = useState(0);

  const handleMonitoringUpdate = () => {
    console.log('🔄 Monitoring update triggered');
    // Trigger a refresh of the monitoring dashboard
    setMonitoringRefreshTrigger(prev => prev + 1);
  };

  // Check maintenance status
  const checkMaintenanceStatus = async () => {
    try {
      const response = await FyersService.getMaintenanceStatus();
      if (response.maintenance?.inMaintenance) {
        setMaintenanceOverlayVisible(true);
        setMaintenanceStatus('active');
      } else {
        setMaintenanceOverlayVisible(false);
        setMaintenanceStatus('inactive');
      }
    } catch (error) {
      console.error('Failed to check maintenance status:', error);
    }
  };

  // Manual refresh for server status with retry and ping
  const refreshServerStatus = async () => {
    try {
      setServerStatus('loading');
      
      // First, try to ping the server to wake it up if it's inactive
      console.log('[Dashboard] Attempting to ping server...');
      const pingSuccess = await MarketService.pingServer();
      
      if (pingSuccess) {
        console.log('[Dashboard] Server ping successful, checking health...');
        // Wait a moment for the server to fully wake up
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('[Dashboard] Server ping failed, proceeding with health check...');
      }
      
      // Try up to 3 times with increasing delay
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const serverHealth = await MarketService.checkServerHealth();
          setServerStatus(serverHealth);
          console.log('[Dashboard] Server health refreshed:', serverHealth);
          
          // If server is now running, reload market data
          if (serverHealth === 'running') {
            console.log('[Dashboard] Server is running, reloading market data...');
            await loadMarketData();
            // Manual refresh of index data
            await MarketService.manualRefresh();
          }
          
          return; // Success, exit the function
        } catch (error) {
          console.log(`[Dashboard] Server check attempt ${attempt + 1} failed:`, error);
          if (attempt < 2) {
            // Wait before retrying (1000ms, then 2000ms)
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      // If we get here, all attempts failed
      setServerStatus('stopped');
    } catch (error) {
      console.error('Failed to refresh server status:', error);
      setServerStatus('stopped');
    }
  };

  // Fetch funds when dropdown is opened
  const handleFundsDropdownOpen = async () => {
    setFundsLoading(true);
    setFundsError('');
    try {
      const data = await FyersService.getFunds();
      setFunds(data?.fund_limit || []);
    } catch (err) {
      setFundsError('Failed to fetch funds');
    } finally {
      setFundsLoading(false);
    }
  };

  // Handle token refresh success
  const handleTokenRefreshed = () => {
    console.log('✅ Token refreshed successfully');
    setTokenExpirationModalOpen(false);
    
    // Refresh market data and Fyers status
    loadDashboardData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-300">
      {/* Header Bar */}
      <header className="w-full bg-slate-800/60 backdrop-blur-lg border-b border-slate-700/50 py-3 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Victory Logo" className="w-8 h-8 sm:w-9 sm:h-9" />
            <span className="text-white font-bold text-xl sm:text-2xl tracking-tight">Victory</span>
          </div>
          <div className="hidden sm:block w-px h-7 bg-slate-600"></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Status Indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            <StatusIndicator type="market" status={marketStatus} />
            <StatusIndicator type="server" status={serverStatus} onRefresh={refreshServerStatus} />
            {maintenanceStatus === 'active' && (
              <StatusIndicator type="maintenance" status="active" />
            )}
          </div>
          {/* Fyers User Dropdown */}
          {fyersStatus.connected && fyersStatus.profileName && (
            <Menu as="div" className="relative">
              {({ open }) => (
                <>
                  <Menu.Button
                    onClick={handleFundsDropdownOpen}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-300 text-xs sm:text-sm font-medium hover:bg-emerald-800/70 transition-colors"
                  >
                    <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
                    <span className="hidden sm:inline">{fyersStatus.profileName}</span>
                    <span className="sm:hidden">Funds</span>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-300" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 focus:outline-none">
                    <div className="p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-200 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-brand" /> Available Funds
                      </div>
                      {fundsLoading ? (
                        <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin w-4 h-4" /> Loading...</div>
                      ) : fundsError ? (
                        <div className="text-red-400 text-xs">{fundsError}</div>
                      ) : (
                        <div className="space-y-2">
                          {['Available Balance', 'Utilized Amount', 'Clear Balance'].map((title) => {
                            const item = funds?.find(f => f.title === title);
                            return item ? (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span className="text-slate-400">{item.title}</span>
                                <span className="text-white font-mono">₹{item.equityAmount?.toFixed(2) ?? '--'} <span className="text-slate-500">/</span> ₹{item.commodityAmount?.toFixed(2) ?? '--'}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-slate-700 px-4 py-2 flex flex-col gap-2">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleFyersDisconnect}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm font-medium ${active ? 'bg-red-900/30 text-red-400' : 'text-red-400'}`}
                          >
                            <LogOut className="w-4 h-4" /> Logout from Fyers
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={logout}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm font-medium ${active ? 'bg-slate-700/50 text-slate-200' : 'text-slate-400'}`}
                          >
                            <LogOut className="w-4 h-4" /> Logout from App
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </>
              )}
            </Menu>
          )}
          {/* Fyers Connect Button (if not connected) */}
          {!fyersStatus.connected && (
            <button
              onClick={() => setFyersModalOpen(true)}
              className="bg-brand hover:bg-brand-dark text-white font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition-colors"
            >
              <span className="hidden sm:inline">Connect to Fyers</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}
          {/* Notifications Icon */}
          <NotificationsIcon />
        </div>
      </header>
      
      {/* Body */}
      <main className="flex-1">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          {/* Server Offline Message */}
          {serverStatus === 'stopped' && (
            <div className="text-center py-12 mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-4">
                Server Temporarily Offline
              </h1>
              
              <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-6">
                The trading server is currently inactive. Click the refresh icon in the header to wake it up.
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={refreshServerStatus}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Wake Up Server
                </button>
              </div>
            </div>
          )}
          
          {/* Index Cards */}
          {fyersStatus.connected && serverStatus === 'running' ? (
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
          ) : fyersStatus.connected && serverStatus !== 'stopped' ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-2">Connecting to Server</h3>
              <p className="text-slate-400 text-sm">Please wait while we connect to the trading server...</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-3xl">V</span>
              </div>
              
              <h1 className="text-4xl font-bold text-white mb-4">
                Welcome to Victory Trading
              </h1>
              
              <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
                Connect your Fyers account to start viewing live market data and trading features.
              </p>
              
              <button
                onClick={() => setFyersModalOpen(true)}
                className="btn-primary text-lg px-8 py-3"
              >
                Connect Fyers Account
              </button>
            </div>
          )}

          {/* Additional Trading Cards - Only show when Fyers is connected and server is running */}
          {fyersStatus.connected && serverStatus === 'running' && (
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
                <MonitoringDashboard onTradeLog={handleTradeLog} refreshTrigger={monitoringRefreshTrigger} />
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
    </div>
  );
};

export default Dashboard; 