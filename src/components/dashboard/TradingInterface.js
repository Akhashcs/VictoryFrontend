import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Play, 
  Download,
  Clock,
  Calendar,
  Target,
  Shield,
  Settings,
  BarChart3,
  DollarSign,
  Activity
} from 'lucide-react';
import SymbolConfigService from '../../services/symbolConfigService';
import { HMAService } from '../../services/hmaService';
import BackendMonitoringService from '../../services/backendMonitoringService';
import TradeService from '../../services/tradeService';
import api from '../../services/api';

const StrategyMonitoringCard = ({ title, symbol, hmaConfig, quantity, targetPoints, stopLossPoints, isMonitoring, onTradeLog, liveData }) => {
  return (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 shadow-md">
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Symbol:</span>
          <span className="text-white font-medium">{symbol || 'Not selected'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Quantity:</span>
          <span className="text-white font-medium">{quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Target:</span>
          <span className="text-green-400 font-medium">+{targetPoints} pts</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Stop Loss:</span>
          <span className="text-red-400 font-medium">-{stopLossPoints} pts</span>
        </div>
      </div>
    </div>
  );
};

const TradingInterface = ({ headerStatus = { monitoringStatus: 'OFF' }, onStatusUpdate, onTradeLog, indicesData = [], onMonitoringUpdate, symbolConfigs = {}, symbolsLoading = false }) => {
  // Get the first available symbol as default, or use a fallback
  const defaultSymbol = Object.values(symbolConfigs)[0] || { symbolName: '', lotSize: 75, defaultTarget: 40, defaultStopLoss: 10 };
  
  const [inputs, setInputs] = useState({
    index: defaultSymbol,
    ceSymbol: '',
    peSymbol: '',
    ceLots: 1,
    peLots: 1,
    targetPoints: defaultSymbol.defaultTarget,
    stopLossPoints: defaultSymbol.defaultStopLoss,
    productType: 'INTRADAY',
    orderType: 'MARKET',
    trailSlToCost: false,

    // New trailing stoploss inputs
    useTrailingStoploss: false,
    trailingX: 20,
    trailingY: 15,
    // New trading inputs
    tradeDirection: 'BUY',
    offlineOrder: false
  });

  // Ensure default index updates when symbolConfigs loads (only if no index is currently selected)
  useEffect(() => {
    const firstSymbol = Object.values(symbolConfigs)[0];
    
    // Only set default if:
    // 1. No index is currently selected, OR
    // 2. Current index doesn't exist in the new configs, OR
    // 3. Current index has no symbolName (fallback case)
    if (firstSymbol && (
      !inputs.index || 
      !inputs.index.symbolName || 
      !symbolConfigs[inputs.index.symbolName] ||
      inputs.index.symbolName === '' // Fallback case
    )) {
      console.log('[TradingInterface] Setting default index to:', firstSymbol.symbolName);
      setInputs(prev => ({
        ...prev,
        index: firstSymbol,
        targetPoints: firstSymbol.defaultTarget,
        stopLossPoints: firstSymbol.defaultStopLoss
      }));
    }
    // eslint-disable-next-line
  }, [symbolConfigs]);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [ceHMA, setCeHMA] = useState(null);
  const [peHMA, setPeHMA] = useState(null);
  const [ceDepth, setCeDepth] = useState(null);
  const [peDepth, setPeDepth] = useState(null);
  const [strikeSymbols, setStrikeSymbols] = useState({ ce: [], pe: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingMarketDepth, setIsStreamingMarketDepth] = useState(false);

  // Add a ref to track the market depth polling interval
  const marketDepthIntervalRef = useRef(null);
  
  // Add cleanup for the interval when component unmounts
  useEffect(() => {
    return () => {
      if (marketDepthIntervalRef.current) {
        clearInterval(marketDepthIntervalRef.current);
        marketDepthIntervalRef.current = null;
        setIsStreamingMarketDepth(false);
      }
    };
  }, []);

  const generateSymbolsForIndex = async () => {
    setIsLoading(true);
    
    console.log('[TradingInterface] generateSymbolsForIndex called with:', inputs.index.name);
    console.log('[TradingInterface] inputs.index:', inputs.index);
    console.log('[TradingInterface] symbolConfigs:', symbolConfigs);
    console.log('[TradingInterface] symbolConfigs keys:', Object.keys(symbolConfigs));
    
    // Step 1: Get the symbolName from the selected index (e.g., "NIFTY W")
    const symbolName = inputs.index.symbolName || inputs.index.name;
    console.log('[TradingInterface] Symbol name for database lookup:', symbolName);
    
    // Step 2: Get the symbolInput for market data lookup (e.g., "NSE:NIFTY50-INDEX")
    const symbolInput = inputs.index.symbolInput;
    console.log('[TradingInterface] Symbol input for market data lookup:', symbolInput);
    
    if (!symbolInput) {
      console.log('[TradingInterface] No symbolInput found, cannot proceed');
      console.log('[TradingInterface] Available symbol configs:', symbolConfigs);
      window.showToast('Symbol configuration is incomplete. Please check symbol settings.', 'error');
      return;
    }
    
    // Step 3: Find market data using symbolInput
    console.log('[TradingInterface] Available market data:', indicesData.map(d => ({ indexName: d.indexName, symbol: d.symbol })));
    const indexData = indicesData.find(data => 
      data.indexName === symbolInput || data.symbol === symbolInput
    );
    console.log('[TradingInterface] Found market data:', indexData);
    
    if (!indexData || !indexData.spotData) {
      console.log('[TradingInterface] No market data found for symbolInput:', symbolInput);
      window.showToast('No market data available for the selected symbol.', 'error');
      return;
    }
    
    const ltp = indexData.spotData.ltp;
    console.log('[TradingInterface] Using LTP:', ltp);
    
    try {
      // Step 4: Send request to backend with symbolName and LTP
      // Backend will:
      // - Search MongoDB for symbolName to get configuration
      // - Use LTP to calculate ATM strike
      // - Generate CE/PE symbols based on configuration
      console.log('[TradingInterface] Sending request to backend for symbol:', symbolName, 'with LTP:', ltp);
      const response = await api.get(`/market/symbols/${symbolName}`, {
        params: { 
          spotPrice: ltp
        }
      });
      
      const symbols = response.data.data;
      console.log('[TradingInterface] Generated symbols from backend:', symbols);
      
      // Update the lotSize from the API response
      if (symbols.lotSize) {
        setInputs(prev => ({
          ...prev,
          index: {
            ...prev.index,
            lotSize: symbols.lotSize
          }
        }));
      }
      
      setStrikeSymbols(symbols);
      window.showToast(`Symbols generated successfully using LTP: ${ltp}`, 'success');
    } catch (error) {
      console.error('[TradingInterface] Error generating symbols:', error);
      setStrikeSymbols({ ce: [], pe: [] });
      window.showToast('Failed to generate symbols. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Ensure lots are always whole numbers
    if (field === 'ceLots' || field === 'peLots') {
      const numValue = parseInt(value) || 1;
      setInputs(prev => ({ ...prev, [field]: numValue }));
    } else {
      setInputs(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleIndexChange = (indexKey) => {
    const selectedSymbol = symbolConfigs[indexKey];
    if (!selectedSymbol) {
      console.log('[TradingInterface] handleIndexChange - No symbol found for key:', indexKey);
      console.log('[TradingInterface] handleIndexChange - Available keys:', Object.keys(symbolConfigs));
      return;
    }
    
    console.log('[TradingInterface] handleIndexChange - selectedSymbol:', selectedSymbol);
    console.log('[TradingInterface] handleIndexChange - indexKey:', indexKey);
    
    setInputs(prev => ({
      ...prev,
      index: selectedSymbol, // Use the full config object
      ceSymbol: '',
      peSymbol: '',
      targetPoints: selectedSymbol.defaultTarget,
      stopLossPoints: selectedSymbol.defaultStopLoss,
      lotSize: selectedSymbol.lotSize || 1
    }));
    setCeHMA(null);
    setPeHMA(null);
  };

  const getQuantityForLots = (type) => {
    const lots = type === 'ce' ? inputs.ceLots : inputs.peLots;
    return (inputs.index.lotSize || 0) * lots;
  };

  // Modify getDetails to start streaming market depth
  const getDetails = async () => {
    if (!inputs.ceSymbol && !inputs.peSymbol) {
      window.showToast('Please select at least one contract.', 'error');
      return;
    }
    setIsLoading(true);
    
    // Clear any existing interval
    if (marketDepthIntervalRef.current) {
      clearInterval(marketDepthIntervalRef.current);
    }
    
    try {
      // Fetch HMA
      const [ceData, peData] = await Promise.all([
        inputs.ceSymbol ? HMAService.fetchAndCalculateHMA(inputs.ceSymbol) : Promise.resolve(null),
        inputs.peSymbol ? HMAService.fetchAndCalculateHMA(inputs.peSymbol) : Promise.resolve(null)
      ]);
      setCeHMA(ceData?.hmaValue || null);
      setPeHMA(peData?.hmaValue || null);
      
      // Fetch initial market depth
      await fetchMarketDepth();
      
      // Set up interval to fetch market depth every 2 seconds
      marketDepthIntervalRef.current = setInterval(fetchMarketDepth, 2000);
      setIsStreamingMarketDepth(true);
      
      // Show different message based on monitoring status
      if (isMonitoring) {
        window.showToast('Preview updated for selected strikes. You can add these to monitoring.', 'success');
      } else {
        window.showToast('Details fetched successfully!', 'success');
      }
      
    } catch (error) {
      // Handle Fyers token expiration specifically
      if (error.isFyersTokenExpired) {
        return;
      }
      
      // Handle other errors
      console.error('Error fetching details:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch details';
      window.showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a new function to fetch market depth
  const fetchMarketDepth = async () => {
    try {
      // The symbols from the backend are already in Fyers format, so we can use them directly
      const fyersSymbols = [inputs.ceSymbol, inputs.peSymbol].filter(Boolean);
      
      if (fyersSymbols.length > 0) {
        // Fetch market depth from backend using Fyers symbols
        const response = await api.post('/fyers/market-depth', {
          symbols: fyersSymbols
        });
        const data = response.data?.depth || {};
        
        // Map the response back to frontend symbols
        const ceFyersSymbol = fyersSymbols.find(s => s.includes('CE'));
        const peFyersSymbol = fyersSymbols.find(s => s.includes('PE'));
        
        setCeDepth(ceFyersSymbol ? data[ceFyersSymbol] || null : null);
        setPeDepth(peFyersSymbol ? data[peFyersSymbol] || null : null);
      }
    } catch (error) {
      console.error('Error fetching market depth:', error);
      // Don't show an error message for background updates
    }
  };
  
  // Add cleanup of market depth interval when symbols change
  useEffect(() => {
    // Stop streaming when symbols change
    if (marketDepthIntervalRef.current) {
      clearInterval(marketDepthIntervalRef.current);
      marketDepthIntervalRef.current = null;
      setIsStreamingMarketDepth(false);
    }
    
    // Clear market depth data when symbols change
    setCeDepth(null);
    setPeDepth(null);
  }, [inputs.ceSymbol, inputs.peSymbol]);
  
  // Add cleanup of market depth interval when monitoring starts
  useEffect(() => {
    if (isMonitoring) {
      // Clear the market depth interval
      if (marketDepthIntervalRef.current) {
        clearInterval(marketDepthIntervalRef.current);
        marketDepthIntervalRef.current = null;
      }
      // Only clear market depth data, preserve HMA values
      setCeDepth(null);
      setPeDepth(null);
      setIsStreamingMarketDepth(false);
      console.log('🛑 Market depth streaming stopped due to monitoring start (HMA values preserved)');
    }
  }, [isMonitoring]);

  const handleStartMonitoring = async () => {
    // Validation
    if (!inputs.ceSymbol && !inputs.peSymbol) {
      window.showToast('Please select at least one contract.', 'error');
      return;
    }
    if ((inputs.ceSymbol && !ceHMA) || (inputs.peSymbol && !peHMA)) {
      window.showToast('Please fetch HMA for the selected contract(s) before starting monitoring.', 'error');
      return;
    }

    // Check if already being monitored
    const state = await TradeService.loadTradingState();
    const monitored = state?.monitoredSymbols || [];
    if (inputs.ceSymbol) {
      const ceExists = monitored.some(s => s.symbol === inputs.ceSymbol && s.type === 'CE');
      if (ceExists) {
        window.showToast(`CE symbol ${inputs.ceSymbol} is already being monitored.`, 'warning');
        return;
      }
    }
    if (inputs.peSymbol) {
      const peExists = monitored.some(s => s.symbol === inputs.peSymbol && s.type === 'PE');
      if (peExists) {
        window.showToast(`PE symbol ${inputs.peSymbol} is already being monitored.`, 'warning');
        return;
      }
    }

    // Check if monitoring is already active
    const isAlreadyMonitoring = isMonitoring;
    
    // Only clear market depth if we're starting fresh monitoring
    if (!isAlreadyMonitoring) {
      // Clear market depth interval and data immediately when starting monitoring
      if (marketDepthIntervalRef.current) {
        clearInterval(marketDepthIntervalRef.current);
        marketDepthIntervalRef.current = null;
      }
      
      // Only clear market depth streaming, preserve HMA values and symbol selections
      console.log('🔄 Clearing market depth streaming, preserving HMA values:', { ceHMA, peHMA });
      setCeDepth(null);
      setPeDepth(null);
      setIsStreamingMarketDepth(false);
      // Note: We keep ceHMA and peHMA values to preserve the details cards

    setIsMonitoring(true);
    }

    try {
      // Start monitoring first (only if not already monitoring)
      if (!isAlreadyMonitoring) {
      const monitoringStarted = await BackendMonitoringService.startMonitoring();
      if (!monitoringStarted) {
        throw new Error('Failed to start monitoring');
      }
      }

      // Add symbols to monitoring
      const monitoringPromises = [];

      if (inputs.ceSymbol) {
        monitoringPromises.push(
          BackendMonitoringService.addSymbol({
          symbol: inputs.ceSymbol,
          type: 'CE',
            index: inputs.index.name,
            lots: parseInt(inputs.ceLots) || 1,
            quantity: getQuantityForLots('ce'),
            targetPoints: parseInt(inputs.targetPoints) || 0,
            stopLossPoints: parseInt(inputs.stopLossPoints) || 0,
            productType: inputs.productType,
            orderType: inputs.orderType,
          autoExitOnStopLoss: true,
          trailingStopLoss: inputs.trailSlToCost,
          trailingStopLossOffset: 0,
            useTrailingStoploss: inputs.useTrailingStoploss,
            trailingX: parseInt(inputs.trailingX) || 20,
            trailingY: parseInt(inputs.trailingY) || 15,
            hmaValue: ceHMA
          })
        );
      }
      
      if (inputs.peSymbol) {
        monitoringPromises.push(
          BackendMonitoringService.addSymbol({
          symbol: inputs.peSymbol,
          type: 'PE',
            index: inputs.index.name,
            lots: parseInt(inputs.peLots) || 1,
            quantity: getQuantityForLots('pe'),
            targetPoints: parseInt(inputs.targetPoints) || 0,
            stopLossPoints: parseInt(inputs.stopLossPoints) || 0,
            productType: inputs.productType,
            orderType: inputs.orderType,
          autoExitOnStopLoss: true,
          trailingStopLoss: inputs.trailSlToCost,
          trailingStopLossOffset: 0,
            useTrailingStoploss: inputs.useTrailingStoploss,
            trailingX: parseInt(inputs.trailingX) || 20,
            trailingY: parseInt(inputs.trailingY) || 15,
            hmaValue: peHMA
          })
        );
      }
      
      await Promise.all(monitoringPromises);
      
      // Update header status
      onStatusUpdate({ monitoringStatus: 'ACTIVE' });
      
      // Notify parent component about monitoring update
        if (onMonitoringUpdate) {
          onMonitoringUpdate();
        }
      
      const successMessage = isAlreadyMonitoring 
        ? 'Symbols added to monitoring successfully!' 
        : 'Monitoring started successfully!';
      window.showToast(successMessage, 'success');
    } catch (error) {
      // Only reset monitoring state if we were starting fresh monitoring
      if (!isAlreadyMonitoring) {
      setIsMonitoring(false);
      }
      console.error('Error starting monitoring:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to start monitoring';
      window.showToast(errorMessage, 'error');
    }
  };

  const handleViewOptionChain = () => {
    const symbol = inputs.index.symbolName || 'NIFTY';
    window.open(`https://web.sensibull.com/option-chain?view=greeks&symbol=${symbol}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full mb-4" style={{ marginBottom: '1rem' }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Strategy Setup Card - 2/3 width (2 index cards) */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-700/50 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-brand" />
              <h2 className="text-base font-semibold text-white">Strategy Setup</h2>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Row 1: Index Selection (50%) & Get Symbols button (25%) & View Option Chain button (25%) */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <label htmlFor="index-select" className="text-xs font-medium text-slate-400">Index</label>
                    <select
                      id="index-select"
                      name="indexSelect"
                      value={inputs.index.symbolName || ''}
                      onChange={(e) => {
                        console.log('[TradingInterface] Dropdown onChange - value:', e.target.value);
                        console.log('[TradingInterface] Dropdown onChange - current inputs.index:', inputs.index);
                        handleIndexChange(e.target.value);
                      }}
                      disabled={symbolsLoading}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {symbolsLoading ? (
                        <option value="" className="text-white bg-slate-700">Loading symbols...</option>
                      ) : (
                        Object.entries(symbolConfigs).map(([key, config]) => (
                          <option key={key} value={key} className="text-white bg-slate-700">
                            {config.symbolName}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <button
                    onClick={generateSymbolsForIndex}
                    disabled={isLoading || symbolsLoading}
                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 border border-blue-700 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:bg-blue-900 disabled:text-blue-200 h-8"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Get Symbols
                      </>
                    )}
                  </button>
                </div>
                <div className="sm:col-span-2 flex items-end gap-2">
                  <button
                    onClick={handleViewOptionChain}
                    className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1 h-8"
                  >
                    <Activity className="w-3 h-3" />
                    View Option Chain
                  </button>
                </div>
              </div>

              {/* Row 2: Buy/Sell Selector (25%), Product type (25%), Order Type (25%), Offline order (25%) */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="trade-direction" className="text-xs font-medium text-slate-400">Trade Direction</label>
                    <select
                    id="trade-direction"
                    name="tradeDirection"
                    value={inputs.tradeDirection}
                    onChange={(e) => handleInputChange('tradeDirection', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                    </select>
                  </div>
                
                  <div>
                    <label htmlFor="product-type" className="text-xs font-medium text-slate-400">Product Type</label>
                    <select
                      id="product-type"
                      name="productType"
                      value={inputs.productType}
                      onChange={(e) => handleInputChange('productType', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    >
                    <option value="INTRADAY">INTRADAY</option>
                    <option value="CNC">CNC</option>
                    </select>
                  </div>
                
                  <div>
                    <label htmlFor="order-type" className="text-xs font-medium text-slate-400">Order Type</label>
                    <select
                      id="order-type"
                      name="orderType"
                      value={inputs.orderType}
                      onChange={(e) => handleInputChange('orderType', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                    </select>
                  </div>
                
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="offline-order"
                    name="offlineOrder"
                    checked={inputs.offlineOrder}
                    onChange={(e) => handleInputChange('offlineOrder', e.target.checked)}
                    className="h-3 w-3 text-brand bg-slate-700 border-slate-600 rounded focus:ring-brand mr-2"
                  />
                  <label htmlFor="offline-order" className="text-xs text-slate-300 cursor-pointer">Offline Order</label>
                </div>
              </div>

              {/* Row 3: CE & PE selector with lots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3">
                  <div className="sm:col-span-1 lg:col-span-3">
                    <label htmlFor="ce-option" className="text-xs font-medium text-slate-400">CE Option</label>
                    <select
                      id="ce-option"
                      name="ceOptionType"
                      value={inputs.ceSymbol}
                      onChange={(e) => handleInputChange('ceSymbol', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    >
                      <option value="">Select CE</option>
                      {strikeSymbols.ce.map((s, i) => (
                        <option key={i} value={s.symbol} className="text-white bg-slate-700">
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label htmlFor="ce-lots" className="text-xs font-medium text-slate-400">CE Lots</label>
                    <input
                      type="number"
                      id="ce-lots"
                      name="ceLots"
                      min="1"
                      step="1"
                      value={inputs.ceLots}
                      onChange={(e) => handleInputChange('ceLots', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Qty: {inputs.index.lotSize || 1}/lot
                    </p>
                  </div>
                  <div className="sm:col-span-1 lg:col-span-3">
                    <label htmlFor="pe-option" className="text-xs font-medium text-slate-400">PE Option</label>
                    <select
                      id="pe-option"
                      name="peOptionType"
                      value={inputs.peSymbol}
                      onChange={(e) => handleInputChange('peSymbol', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    >
                      <option value="">Select PE</option>
                      {strikeSymbols.pe.map((s, i) => (
                        <option key={i} value={s.symbol} className="text-white bg-slate-700">
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label htmlFor="pe-lots" className="text-xs font-medium text-slate-400">PE Lots</label>
                    <input
                      type="number"
                      id="pe-lots"
                      name="peLots"
                      min="1"
                      step="1"
                      value={inputs.peLots}
                      onChange={(e) => handleInputChange('peLots', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Qty: {inputs.index.lotSize || 1}/lot
                    </p>
                  </div>
                </div>

              {/* Row 4: Target (25%), Stop Loss (25%), Max Re-entries (25%), Empty (25%) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="target-points" className="text-xs font-medium text-slate-400">Target (Pts)</label>
                    <input
                      type="number"
                      id="target-points"
                      name="targetPoints"
                      value={inputs.targetPoints}
                      onChange={(e) => handleInputChange('targetPoints', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="stoploss-points" className="text-xs font-medium text-slate-400">Stop Loss (Pts)</label>
                    <input
                      type="number"
                      id="stoploss-points"
                      name="stopLossPoints"
                      value={inputs.stopLossPoints}
                      onChange={(e) => handleInputChange('stopLossPoints', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    />
                  </div>
                  <div>
                    {/* Empty space - Re-entry toggle removed as per instructions */}
                  </div>
                <div>
                  {/* Empty space */}
                </div>
              </div>

              {/* Row 5: Trailing stoploss switch (25%), Trail stoploss to entry switch (25%), Empty (50%) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="use-trailing-sl"
                    name="useTrailingStoploss"
                    checked={inputs.useTrailingStoploss}
                    onChange={(e) => handleInputChange('useTrailingStoploss', e.target.checked)}
                    className="h-3 w-3 text-brand bg-slate-700 border-slate-600 rounded focus:ring-brand mr-2"
                  />
                  <label htmlFor="use-trailing-sl" className="text-xs text-slate-300 cursor-pointer">Trailing Stoploss</label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="trailSlToCost"
                    checked={inputs.trailSlToCost}
                    onChange={(e) => handleInputChange('trailSlToCost', e.target.checked)}
                    className="h-3 w-3 text-brand bg-slate-700 border-slate-600 rounded focus:ring-brand mr-2"
                  />
                  <label className="text-xs text-slate-300 cursor-pointer">Trail SL to Entry</label>
                </div>
                
                <div className="sm:col-span-2">
                  {/* Empty space */}
                </div>
              </div>

              {/* Row 6: When trailing stoploss is enabled - Price movement (25%), SL Movement (25%), Trail stoploss to entry (25%), Empty (25%) */}
              {inputs.useTrailingStoploss && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="trailing-x" className="text-xs font-medium text-slate-400">Price Movement (X)</label>
                    <input
                      type="number"
                      id="trailing-x"
                      name="trailingX"
                      value={inputs.trailingX}
                      onChange={(e) => handleInputChange('trailingX', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="trailing-y" className="text-xs font-medium text-slate-400">SL Movement (Y)</label>
                    <input
                      type="number"
                      id="trailing-y"
                      name="trailingY"
                      value={inputs.trailingY}
                      onChange={(e) => handleInputChange('trailingY', e.target.value)}
                      className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    {/* Empty space */}
                  </div>
                </div>
              )}

              {/* Time Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div>
                  {/* Empty space */}
                </div>
                <div>
                  {/* Empty space */}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-2 sm:gap-3 mt-4">
                <button 
                  onClick={getDetails} 
                  disabled={isLoading}
                  className="px-2 py-1 rounded-md transition-colors text-xs font-bold flex items-center gap-1 bg-brand/10 hover:bg-brand/20 text-brand-light disabled:bg-slate-700 disabled:text-slate-400"
                >
                  <Download className="w-3 h-3" />
                  Get Details
                </button>
                <button 
                  onClick={handleStartMonitoring}
                  disabled={isLoading || (!inputs.ceSymbol && !inputs.peSymbol) || (inputs.ceSymbol && !ceHMA) || (inputs.peSymbol && !peHMA)}
                  className="px-2 py-1 rounded-md transition-colors text-xs font-bold flex items-center gap-1 bg-green-400/10 hover:bg-green-400/20 text-green-400 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  <Play className="w-3 h-3" />
                  {isMonitoring ? 'Add to Monitoring' : 'Start Monitoring'}
                </button>
              </div>
            </div>
          </div>

        {/* CE & PE Details Cards - 1/3 width (1 index card) */}
        <div className="lg:col-span-1 flex flex-col gap-3 sm:gap-4 h-full" style={{height: '100%'}}>
            {/* CE Details */}
            <div className="bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-700/50 shadow-md flex flex-col" style={{height: 'calc((482px - 1rem) / 2)'}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <h3 className="text-xs font-semibold text-white">CE Details</h3>
                </div>
                {!isMonitoring && isStreamingMarketDepth && (
                  <span className="text-xs text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded-full">
                    Live
                  </span>
                )}
                {isMonitoring && !isStreamingMarketDepth && (
                  <span className="text-xs text-slate-400 bg-slate-900/20 px-1.5 py-0.5 rounded-full">
                    Monitoring
                  </span>
                )}
                {isMonitoring && isStreamingMarketDepth && (
                  <span className="text-xs text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded-full">
                    Preview
                  </span>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1 justify-center">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-xs text-slate-400">Symbol</span>
                </div>
                <span className="text-white font-medium mb-2 text-xs">{inputs.ceSymbol || 'Not selected'}</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">LTP / %</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{ceDepth ? `${ceDepth.ltp} / ${ceDepth.chp}%` : '--'}</div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-2.5 h-2.5 text-brand" />
                      <span className="text-xs text-slate-400">HMA 55</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-brand">{ceHMA ? `₹${ceHMA.toFixed(2)}` : '--'}</div>
                    <div className="flex items-center gap-1">
                      <Target className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">ATP</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{ceDepth ? ceDepth.atp : '--'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">Volume</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{ceDepth ? ceDepth.v : '--'}</div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">OI / OI Chg%</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{ceDepth ? `${ceDepth.oi} / ${ceDepth.oipercent ?? '--'}%` : '--'}</div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">IV</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{ceDepth ? ceDepth.iv : '--'}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* PE Details */}
            <div className="bg-slate-800/50 p-3 sm:p-4 rounded-lg border border-slate-700/50 shadow-md flex flex-col" style={{height: 'calc((482px - 1rem) / 2)'}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3 h-3 text-red-400" />
                  <h3 className="text-xs font-semibold text-white">PE Details</h3>
                </div>
                {!isMonitoring && isStreamingMarketDepth && (
                  <span className="text-xs text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded-full">
                    Live
                  </span>
                )}
                {isMonitoring && !isStreamingMarketDepth && (
                  <span className="text-xs text-slate-400 bg-slate-900/20 px-1.5 py-0.5 rounded-full">
                    Monitoring
                  </span>
                )}
                {isMonitoring && isStreamingMarketDepth && (
                  <span className="text-xs text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded-full">
                    Preview
                  </span>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1 justify-center">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-xs text-slate-400">Symbol</span>
                </div>
                <span className="text-white font-medium mb-2 text-xs">{inputs.peSymbol || 'Not selected'}</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">LTP / %</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{peDepth ? `${peDepth.ltp} / ${peDepth.chp}%` : '--'}</div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-2.5 h-2.5 text-brand" />
                      <span className="text-xs text-slate-400">HMA 55</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-brand">{peHMA ? `₹${peHMA.toFixed(2)}` : '--'}</div>
                    <div className="flex items-center gap-1">
                      <Target className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">ATP</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{peDepth ? peDepth.atp : '--'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">Volume</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{peDepth ? peDepth.v : '--'}</div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">OI / OI Chg%</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{peDepth ? `${peDepth.oi} / ${peDepth.oipercent ?? '--'}%` : '--'}</div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-xs text-slate-400">IV</span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-white">{peDepth ? peDepth.iv : '--'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default TradingInterface;