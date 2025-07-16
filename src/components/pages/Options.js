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
import SymbolSettingsModal from '../dashboard/SymbolSettingsModal';
import FyersService from '../../services/fyersService';
import MarketService from '../../services/marketService';
import api, { setTokenExpirationHandler } from '../../services/api';
import { Settings } from 'lucide-react';
import SymbolConfigService from '../../services/symbolConfigService';

let lastWebSocketLog = 0; // For throttling WebSocket logs

const Options = () => {
  const { user } = useAuth();
  const [fyersModalOpen, setFyersModalOpen] = useState(false);
  const [tokenExpirationModalOpen, setTokenExpirationModalOpen] = useState(false);
  const [fyersStatus, setFyersStatus] = useState({ connected: false, profileName: null });
  const [indicesData, setIndicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceOverlayVisible, setMaintenanceOverlayVisible] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState('inactive');
  const [marketTab, setMarketTab] = useState('index'); // 'index', 'stock', 'commodity'
  const [allMarketData, setAllMarketData] = useState([]);
  const [symbolSettingsModalOpen, setSymbolSettingsModalOpen] = useState(false);
  const [symbolConfigs, setSymbolConfigs] = useState([]);
  

  const [symbolsLoading, setSymbolsLoading] = useState(true);
  
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

  // Load and stream all market data (indices, stocks, commodities)
  useEffect(() => {
    let isMounted = true;
    
    // Only load market data if Fyers is connected
    if (!fyersStatus.connected) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Initial load
    MarketService.getAllMarketData().then(data => {
      if (isMounted) {
        setAllMarketData(data);
        setLoading(false);
      }
    }).catch(error => {
      console.error('[Options] Error loading market data:', error);
      if (isMounted) {
        setLoading(false);
      }
    });
    
    // Subscribe to updates from MarketService
    const unsubscribe = MarketService.subscribeToUpdates((updatedData) => {
      if (isMounted) setAllMarketData(updatedData);
    });
    
    // Start WebSocket-based market data streaming
    const startWebSocketStreaming = async () => {
      try {
        // Subscribe to WebSocket market data updates
        const { onMarketData } = await import('../../services/api');
        
        onMarketData((marketData) => {
          // Only log WebSocket data every 30 seconds to reduce verbosity
          const now = Date.now();
          if (!lastWebSocketLog || (now - lastWebSocketLog) > 30000) {
            console.log('[Options] WebSocket market data received:', marketData);
            lastWebSocketLog = now;
          }
          
          if (!isMounted) return;
          
          // Process and format the market data for IndexCard components
          const processMarketData = async () => {
            try {
              // Get symbol configurations for mapping
              const symbolConfigs = await SymbolConfigService.getSymbolConfigs();
              
              const formattedData = marketData.map(quote => {
                // Find symbol configuration for this quote
                const config = symbolConfigs.find(c => c.symbolInput === quote.symbol);
                
                // Use symbolName from config if available, otherwise use a fallback
                let indexName = config ? config.symbolName : quote.symbol;
                
                // Fallback mapping for common patterns if no config found
                if (!config) {
                  if (quote.symbol.includes('NIFTY50-INDEX')) {
                    indexName = 'NIFTY';
                  } else if (quote.symbol.includes('NIFTYBANK-INDEX')) {
                    indexName = 'BANKNIFTY';
                  } else if (quote.symbol.includes('SENSEX-INDEX')) {
                    indexName = 'SENSEX';
                  } else {
                    // For stocks and commodities, extract the name part
                    const parts = quote.symbol.split(':');
                    if (parts.length > 1) {
                      let extractedName = parts[1].replace('-EQ', '').replace('-COMM', '').replace(/25[A-Z]{3}FUT/, '');
                      indexName = extractedName;
                    }
                  }
                }

                // Return formatted data for IndexCard
                return {
                  indexName: indexName,
                  symbol: quote.symbol,
                  symbolConfig: config, // Include the full config for reference
                  spotData: {
                    ltp: quote.ltp,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    open: quote.open,
                    high: quote.high,
                    low: quote.low,
                    close: quote.close,
                    volume: quote.volume,
                    timestamp: new Date(quote.timestamp).toISOString()
                  }
                };
              });
              
              // Update the state with real-time data
              setAllMarketData(formattedData);
            } catch (error) {
              console.error('[Options] Error processing market data:', error);
            }
          };
          
          // Process the market data
          processMarketData();
        });
        
        console.log('[Options] WebSocket market data streaming started');
      } catch (error) {
        console.error('[Options] Error starting WebSocket streaming:', error);
      }
    };
    
    startWebSocketStreaming();
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fyersStatus.connected]);

  // Load symbol configurations
  const loadSymbolConfigs = async () => {
    try {
      setSymbolsLoading(true);
      const configs = await SymbolConfigService.getSymbolConfigs();
      setSymbolConfigs(configs);
      console.log('[Options] Loaded symbol configs:', configs);
    } catch (error) {
      console.error('[Options] Error loading symbol configs:', error);
    } finally {
      setSymbolsLoading(false);
    }
  };

  // Load options data
  const loadOptionsData = async () => {
    try {
      console.log('🔄 Starting loadOptionsData...');
      
      // Load Fyers status
      try {
        const fyersData = await FyersService.getConnectionStatus();
        setFyersStatus(fyersData);
      } catch (error) {
        // Don't update state on error to keep existing state
      }

      // Load symbol configurations
      console.log('📊 Loading symbol configs...');
      await loadSymbolConfigs();

      // Only load market data if Fyers is connected
      if (fyersStatus.connected) {
        console.log('📈 Loading market data...');
        await loadMarketData();
      } else {
        console.log('📈 Skipping market data load - Fyers not connected');
      }

      console.log('✅ loadOptionsData completed');
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in loadOptionsData:', error);
      setLoading(false);
    }
  };

  // Load market data regardless of Fyers connection status
  const loadMarketData = async () => {
    try {
      console.log('📈 loadMarketData: Getting indices data...');
      const marketData = await MarketService.getIndicesData();
      console.log('📈 loadMarketData: Received market data:', marketData);
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



  // Helper: get market data for a symbol (from allMarketData)
  const getMarketData = (symbolConfig) => {
    // Find market data for this specific symbol
    const marketData = allMarketData.find(data => 
      data.symbol === symbolConfig.symbolInput
    );
    
    if (!marketData) {
      // Return null if no market data found
      return null;
    }
    
    // Return the market data object directly (it's already formatted correctly)
    return marketData;
  };

  // Convert symbol configs to the format expected by TradingInterface
  const getTradingInterfaceConfigs = () => {
    // Convert symbol configs to the format expected by TradingInterface
    const configs = {};
    symbolConfigs.forEach(config => {
      configs[config.symbolName] = {
        symbolName: config.symbolName,
        symbolInput: config.symbolInput,
        lotSize: config.lotSize || 75,
        defaultTarget: 40,
        defaultStopLoss: 10,
        tabType: config.tabType,
        optionSymbolFormat: config.optionSymbolFormat,
        nextExpiry: config.nextExpiry,
        strikeInterval: config.strikeInterval
      };
    });
    return configs;
  };

  return (
    <>
      <main className="flex-1">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
          {/* Index Cards Section with Tabs */}
          {fyersStatus.connected ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3 sm:p-4 mb-4 mt-4" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              {/* Tabs */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-4 sm:gap-6">
                  <button
                    className={`font-medium text-sm transition-colors border-b-2 ${
                      marketTab === 'index' 
                        ? 'text-brand border-brand' 
                        : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-600'
                    }`}
                    onClick={() => setMarketTab('index')}
                  >
                    Indices
                  </button>
                  <button
                    className={`font-medium text-sm transition-colors border-b-2 ${
                      marketTab === 'stock' 
                        ? 'text-brand border-brand' 
                        : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-600'
                    }`}
                    onClick={() => setMarketTab('stock')}
                  >
                    Stocks
                  </button>
                  <button
                    className={`font-medium text-sm transition-colors border-b-2 ${
                      marketTab === 'commodity' 
                        ? 'text-brand border-brand' 
                        : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-600'
                    }`}
                    onClick={() => setMarketTab('commodity')}
                  >
                    Commodities
                  </button>
                </div>
                <button
                  onClick={() => setSymbolSettingsModalOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-brand transition-colors"
                  title="Symbol Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              {/* Cards Grid - always 5 columns, no max-width on card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {symbolConfigs
                  .filter(config => config.tabType === marketTab)
                  .map((symbol, idx) => (
                    <div key={symbol.symbolName || symbol.name || idx} className="w-full">
                      <IndexCard
                        data={getMarketData(symbol)}
                        loading={loading}
                        index={idx}
                        mini
                      />
                    </div>
                  ))}
              </div>
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
                indicesData={allMarketData}
                onMonitoringUpdate={handleMonitoringUpdate}
                symbolConfigs={getTradingInterfaceConfigs()}
                symbolsLoading={symbolsLoading}
              />

              {/* Monitoring Dashboard - Shows Waiting for Trade & Active Positions */}
              <MonitoringDashboard onTradeLog={handleTradeLog} />

              {/* Trade Log - Below Monitoring Dashboard */}
              <TradeLog />
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

      {/* Symbol Settings Modal */}
      <SymbolSettingsModal
        isOpen={symbolSettingsModalOpen}
        onClose={() => setSymbolSettingsModalOpen(false)}
        onSymbolsUpdated={() => {
          // Reload symbol configurations and market data when symbols are updated
          loadSymbolConfigs();
          loadOptionsData();
        }}
      />

      {/* Toast Container */}
      <ToastContainer />
    </>
  );
};

export default Options; 