import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, TrendingUp, Clock, Plus, Target, Shield, X, Info, History } from 'lucide-react';

import TradeService from '../../services/tradeService';
import { HMAService } from '../../services/hmaService';
import api, { onMarketData } from '../../services/api';
import BackendMonitoringService from '../../services/backendMonitoringService';
import OrderModificationsModal from './OrderModificationsModal';

const formatPrice = (v) => `₹${v?.toFixed(2) ?? '--'}`;
const formatTime = (date) => {
  if (!date) return '--';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const MonitoringDashboard = ({ onTradeLog, refreshTrigger }) => {
  const [monitoredSymbols, setMonitoredSymbols] = useState([]);
  const [activePositions, setActivePositions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [tradeLog, setTradeLog] = useState([]);
  const [lastHMARefresh, setLastHMARefresh] = useState(null);
  const [nextHMARefresh, setNextHMARefresh] = useState(null);
  const [isRefreshingHMA, setIsRefreshingHMA] = useState(false);
  const [isUpdatingLiveData, setIsUpdatingLiveData] = useState(false);
  const [lastLiveDataUpdate, setLastLiveDataUpdate] = useState(null);
  const [symbolState, setSymbolState] = useState({});
  const [countdownTick, setCountdownTick] = useState(0); // Add this for countdown updates
  const [viewSLOrderModal, setViewSLOrderModal] = useState({ open: false, position: null });

  // Modals
  const [exitModal, setExitModal] = useState({ open: false, position: null });
  const [detailsModal, setDetailsModal] = useState({ open: false, position: null });
  const [slmModal, setSlmModal] = useState({ open: false, position: null });
  const [orderModificationsModal, setOrderModificationsModal] = useState({ open: false, symbolId: null, symbolName: null });

  // Load data from backend function
  const loadDataFromBackend = async () => {
    try {
      // Load monitored symbols from backend monitoring service
      const symbols = await BackendMonitoringService.getMonitoredSymbols();
      setMonitoredSymbols(symbols);
      
      // Load active positions from backend
      const positions = await BackendMonitoringService.getActivePositions();
      setActivePositions(positions);

      // Load pending orders from backend
      const pending = await BackendMonitoringService.getPendingOrders();
      setPendingOrders(pending);
      
      // Subscribe to WebSocket updates for these symbols
      if (symbols.length > 0) {
        const symbolNames = symbols.map(s => s.symbol).filter(Boolean);
        const { subscribeToSymbols } = await import('../../services/api');
        subscribeToSymbols(symbolNames);
      }
    } catch (error) {
      console.error('❌ Error loading data from backend:', error);
      // If there's an error, try to reset the trading state
      try {
        console.log('🔄 Attempting to reset trading state...');
        await TradeService.resetTradingState();
        setMonitoredSymbols([]);
        setActivePositions([]);
        console.log('✅ Trading state reset successfully');
      } catch (resetError) {
        console.error('❌ Failed to reset trading state:', resetError);
      }
    }
  };

  // Load monitored symbols and active positions from backend on mount
  useEffect(() => {
    loadDataFromBackend();
  }, [refreshTrigger]); // Add refreshTrigger as dependency

  // Automatic order recovery on component mount if there are pending orders
  useEffect(() => {
    const autoRecoverOrders = async () => {
      try {
        // Check if there are any pending orders that might need recovery
        const hasPendingOrders = monitoredSymbols.some(s => s.orderId && s.orderStatus === 'PENDING') ||
                                activePositions.some(p => p.buyOrderId && p.orderStatus === 'PENDING');
        
        if (hasPendingOrders) {
          console.log('🔄 Auto-recovering orders on component mount...');
          await BackendMonitoringService.recoverOrders();
          // Refresh data after recovery
          await loadDataFromBackend();
        }
      } catch (error) {
        console.error('❌ Error in auto order recovery:', error);
      }
    };

    // Only run auto-recovery if we have data loaded
    if (monitoredSymbols.length > 0 || activePositions.length > 0) {
      autoRecoverOrders();
    }
  }, [monitoredSymbols.length, activePositions.length]); // Run when data changes

  // Periodic refresh of monitored symbols and active positions from backend
  useEffect(() => {
    const refreshData = async () => {
      try {
        // Refresh monitored symbols
        const symbols = await BackendMonitoringService.getMonitoredSymbols();
        setMonitoredSymbols(symbols);
        
        // Refresh active positions
        const positions = await BackendMonitoringService.getActivePositions();
        setActivePositions(positions);
      } catch (error) {
        console.error('❌ Error refreshing data from backend:', error);
      }
    };

    // Refresh every 0.5 seconds
    const interval = setInterval(refreshData, 500);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to WebSocket market data updates
  useEffect(() => {
    const handleMarketDataUpdate = (marketData) => {
      // Update monitored symbols with live LTP
      setMonitoredSymbols(prevSymbols => {
        return prevSymbols.map(symbol => {
          const liveQuote = marketData.find(quote => quote.symbol === symbol.symbol);
          if (liveQuote) {
            return {
              ...symbol,
              currentLTP: liveQuote.ltp,
              lastUpdate: new Date()
            };
          }
          return symbol;
        });
      });

      // Update active positions with live LTP
      setActivePositions(prevPositions => {
        return prevPositions.map(position => {
          const liveQuote = marketData.find(quote => quote.symbol === position.symbol);
          if (liveQuote) {
            return {
              ...position,
              currentLTP: liveQuote.ltp,
              lastUpdate: new Date()
            };
          }
          return position;
        });
      });

              // Update market data cache for IndexCard components
        marketData.forEach(quote => {
          // Convert symbol to indexName for display
          let indexName = quote.symbol;
          if (quote.symbol.includes('NIFTY50-INDEX')) {
            indexName = 'NIFTY';
          } else if (quote.symbol.includes('NIFTYBANK-INDEX')) {
            indexName = 'BANKNIFTY';
          } else if (quote.symbol.includes('SENSEX-INDEX')) {
            indexName = 'SENSEX';
          } else {
            // For stocks and commodities, extract the name part and map to original names
            const parts = quote.symbol.split(':');
            if (parts.length > 1) {
              let extractedName = parts[1].replace('-EQ', '').replace('-COMM', '');
              
              // Map the extracted name back to the original frontend symbol names
              const symbolMapping = {
                // Stocks - map backend symbols to frontend names
                'TATASTEEL': 'TATASTEEL',
                'HINDALCO': 'HINDALCO',
                'SBIN': 'SBIN',
                'ADANIPORTS': 'ADANIPORTS',
                'WIPRO': 'WIPRO',
                'GRASIM': 'GRASIM',
                'HCLTECH': 'HCLTECH',
                'BPCL': 'BPCL',
                'M_M': 'M_M',
                'COALINDIA': 'COALINDIA',
                'SBILIFE': 'SBILIFE',
                'BAJFINANCE': 'BAJFINANCE',
                'BHARTIARTL': 'BHARTIARTL',
                'DRREDDY': 'DRREDDY',
                'HDFCBANK': 'HDFCBANK',
                'HEROMOTOCO': 'HEROMOTOCO',
                'ONGC': 'ONGC',
                'SUNPHARMA': 'SUNPHARMA',
                'APOLLOHOSP': 'APOLLOHOSP',
                'ICICIBANK': 'ICICIBANK',
                
                // Commodities - map both expiry months to the same frontend name
                'GOLD25AUGFUT': 'GOLD',
                'GOLD25JULFUT': 'GOLD',
                'SILVER25AUGFUT': 'SILVER',
                'SILVER25JULFUT': 'SILVER',
                'CRUDEOIL25AUGFUT': 'CRUDEOIL',
                'CRUDEOIL25JULFUT': 'CRUDEOIL',
                'COPPER25AUGFUT': 'COPPER',
                'COPPER25JULFUT': 'COPPER',
                'NICKEL25AUGFUT': 'NICKEL',
                'NICKEL25JULFUT': 'NICKEL'
              };
              
              // Use the mapping if available, otherwise use the extracted name
              indexName = symbolMapping[extractedName] || extractedName;
            }
          }

          // Update the market data cache with the proper format
          const formattedData = {
            indexName: indexName,
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

          // Store in a global cache that IndexCard components can access
          if (!window.marketDataCache) {
            window.marketDataCache = new Map();
          }
          
          // For commodities, only update if we have valid data (non-zero LTP)
          const existingData = window.marketDataCache.get(indexName);
          if (existingData && (indexName === 'GOLD' || indexName === 'SILVER' || indexName === 'CRUDEOIL' || indexName === 'COPPER' || indexName === 'NICKEL')) {
            // Only update if the new data has valid LTP (non-zero)
            if (quote.ltp && quote.ltp > 0) {
              window.marketDataCache.set(indexName, formattedData);
            }
          } else {
            // For non-commodities, always update
            window.marketDataCache.set(indexName, formattedData);
          }
        });
    };

    // Register the callback for market data updates
    onMarketData(handleMarketDataUpdate);

    // Cleanup function
    return () => {
      // Cleanup handled by service
    };
  }, []);

  // Subscribe to new monitored symbols when they are added
  useEffect(() => {
    if (monitoredSymbols.length > 0) {
      const symbolNames = monitoredSymbols.map(s => s.symbol).filter(Boolean);
      
      const subscribeToSymbols = async () => {
        try {
          const { subscribeToSymbols: subscribeFn } = await import('../../services/api');
          subscribeFn(symbolNames);
        } catch (error) {
          console.error('❌ Error subscribing to WebSocket updates:', error);
        }
      };
      
      subscribeToSymbols();
    }
  }, [monitoredSymbols.map(s => s.symbol).join(',')]); // Only re-run when symbol names change

  // Trade logic execution using backend-polled data
  // DISABLED: Backend now handles all monitoring logic
  // This frontend logic was causing duplicate LTP vs HMA comparisons
  /*
  useEffect(() => {
    const executeTradeLogic = async () => {
      if (isUpdatingLiveData || monitoredSymbols.length === 0) return;
      
      try {
        setIsUpdatingLiveData(true);
        const now = new Date();
        // Allow confirmation if within the first 2 seconds of the minute
        const confirmationWindow = now.getSeconds() <= 1;
        
        // Use current LTP from monitored symbols (updated by backend polling)
        console.log('🔄 Processing trade logic for monitored symbols...');

        monitoredSymbols.forEach(symbol => {
          // Use current LTP from symbol data (updated by backend polling)
          const ltp = symbol.currentLTP;
          console.log(`🔍 Processing ${symbol.symbol} with LTP:`, ltp);
          if (!ltp || !symbol.hmaValue) {
            console.log(`⚠️ Skipping ${symbol.symbol}: ltp=${!!ltp}, hmaValue=${!!symbol.hmaValue}`);
            return;
          }
          const prevLtp = symbolState[symbol.id]?.prevLtp;
          let newSymbolState = { ...symbolState[symbol.id], prevLtp: ltp };

          // --- Trade Logic ---
          if (symbol.triggerStatus === 'WAITING' || symbol.triggerStatus === 'WAITING_FOR_REVERSAL' || symbol.triggerStatus === 'WAITING_FOR_ENTRY') {
            const isPending = newSymbolState.pendingSignal;

            if (isPending) {
              // --- Confirmation Step ---
              const { direction, hmaAtTrigger, triggeredAt } = newSymbolState.pendingSignal;
              const triggerMinute = triggeredAt ? new Date(triggeredAt).getMinutes() : null;
              const nowMinute = now.getMinutes();
              if (triggerMinute !== null && nowMinute !== triggerMinute) {
                if (direction === 'BUY' && ltp > hmaAtTrigger) {
                  console.log(`✅ [${symbol.tradingMode}] TRADE CONFIRMED for ${symbol.symbol} at ${ltp}`);
                  // Use live trade function only
                  const tradeFunction = TradeService.placeLiveTrade;
                  const newPosition = {
                    ...symbol,
                    id: `${symbol.symbol}-${Date.now()}`,
                    status: 'Active',
                    boughtPrice: ltp,
                    initialStopLoss: ltp - symbol.stopLossPoints,
                    stopLoss: ltp - symbol.stopLossPoints,
                    target: ltp + symbol.targetPoints,
                    timestamp: now,
                    reEntryCount: (symbol.reEntryCount || 0)
                  };
                  // Execute the trade
                  const executeTrade = async () => {
                    const tradeData = {
                      symbol: newPosition.symbol,
                      quantity: Math.floor(newPosition.lots || 1) * newPosition.index.lotSize,
                      price: ltp,
                      action: 'BUY',
                      orderType: newPosition.orderType || 'MARKET',
                      productType: newPosition.productType || 'INTRADAY'
                    };
                    
                    // Get the current Fyers access token for live trading
                      try {
                        const tokenResponse = await api.get('/fyers/access-token');
                        if (tokenResponse.data.success) {
                          const appId = tokenResponse.data.appId;
                          const accessToken = tokenResponse.data.accessToken;
                          tradeData.fyersAccessToken = `${appId}:${accessToken}`;
                        } else {
                          throw new Error('Failed to get Fyers access token');
                        }
                      } catch (tokenError) {
                        console.error('Failed to get Fyers access token:', tokenError);
                        throw new Error('Fyers access token not available. Please relogin to Fyers.');
                    }
                    
                    return tradeFunction(tradeData);
                  };
                  
                  executeTrade().then(res => {
                    // Attach SL order info to the position
                    const slOrderDetails = res?.slOrderDetails || null;
                    setActivePositions(prev => [
                      ...prev,
                      { ...newPosition, slOrderDetails }
                    ]);
                    onTradeLog({
                      message: `[${symbol.tradingMode}] BUY order for ${symbol.symbol} executed at ${formatPrice(ltp)}.`,
                      data: { ...newPosition, ...res }
                    });
                  }).catch(err => {
                    onTradeLog({
                      message: `[${symbol.tradingMode}] TRADE FAILED for ${symbol.symbol}: ${err.message}`,
                      data: { ...newPosition, error: err.message },
                      isError: true
                    });
                  });
                  newSymbolState.pendingSignal = null;
                } else if (direction === 'BUY' && ltp <= hmaAtTrigger) {
                  // If after the minute, LTP is not above HMA, cancel
                  console.log(`❌ Trade cancelled for ${symbol.symbol}. LTP ${ltp} did not re-confirm.`);
                  newSymbolState.pendingSignal = null;
                }
              }
            } else if (!isPending && prevLtp) {
              // --- Trigger Step (BUY only) ---
              const hma = symbol.hmaValue;
              if (prevLtp <= hma && ltp > hma) {
                const direction = 'BUY';
                console.log(`🕒 PENDING ${direction} SIGNAL for ${symbol.symbol}. LTP: ${ltp}, HMA: ${hma}. Waiting for minute confirmation...`);
                newSymbolState.pendingSignal = {
                  direction,
                  triggeredAt: now,
                  hmaAtTrigger: hma
                };
              }
            }
          }

          setSymbolState(prev => ({ ...prev, [symbol.id]: newSymbolState }));
        });

        setLastLiveDataUpdate(now);

      } catch (error) {
        console.error('❌ Error in trade logic execution:', error);
      } finally {
        setIsUpdatingLiveData(false);
      }
    };
    
    const interval = setInterval(executeTradeLogic, 2000);
    return () => clearInterval(interval);
  }, [monitoredSymbols, activePositions, isUpdatingLiveData, symbolState, onTradeLog]);
  */

  // Active position management - handle exits, trail SL, etc.
  useEffect(() => {
    const manageActivePositions = async () => {
      try {
        // Skip if no active positions
      if (activePositions.length === 0) return;

        const updatedPositions = [...activePositions];
        const positionsToClose = [];

        // Process each active position
        updatedPositions.forEach(position => {
          // Skip if already marked for closing
          if (positionsToClose.some(p => p.id === position.id)) return;
          
          // Get current market price (LTP)
          const ltp = getLiveLtp(position.symbol);
          if (!ltp) return; // Skip if no LTP available
          
          // Update position with current LTP
          const updatedPosition = {
            ...position,
            currentLTP: ltp,
            currentPnL: (ltp - position.boughtPrice) * position.quantity,
            currentPnLPercent: ((ltp - position.boughtPrice) / position.boughtPrice) * 100,
            lastUpdate: new Date()
          };
          
          // Check if target hit
          if (position.target && ltp >= position.target) {
            positionsToClose.push({
              ...updatedPosition,
              exitPrice: ltp,
              exitReason: 'TARGET',
              exitTime: new Date()
            });
            return;
          }

          // Check if stop loss hit
          if (position.autoExitOnStopLoss && ltp <= position.stopLoss) {
            positionsToClose.push({
              ...updatedPosition,
              exitPrice: ltp,
              exitReason: 'STOPLOSS',
              exitTime: new Date()
            });
            return;
          }

          // Handle standard trailing stop loss (trail to cost)
          if (position.trailingStopLoss && ltp > position.boughtPrice) {
            const newStopLoss = ltp - position.stopLossPoints;
            if (newStopLoss > position.stopLoss) {
              console.log(`📈 TRAILING SL UPDATED for ${position.symbol}: ${position.stopLoss} → ${newStopLoss}`);
              updatedPosition.stopLoss = newStopLoss;
            }
          }
          
          // Handle new advanced trailing stoploss (X/Y parameters)
          if (position.useTrailingStoploss && position.trailingX && position.trailingY) {
            // Calculate how much the price has moved from entry
            const priceMovement = ltp - position.boughtPrice;
            
            // Only trail if price has moved up by at least X points
            if (priceMovement >= position.trailingX) {
              // Calculate how many "X" intervals we've moved
              const intervals = Math.floor(priceMovement / position.trailingX);
              
              // Calculate new stop loss based on Y points per X interval
              const slMovement = intervals * position.trailingY;
              const newStopLoss = position.initialStopLoss + slMovement;
              
              // Only update if the new stop loss is higher than current
              if (newStopLoss > position.stopLoss) {
                console.log(`📊 ADVANCED TRAILING SL for ${position.symbol}: ${position.stopLoss} → ${newStopLoss} (${intervals} intervals)`);
                updatedPosition.stopLoss = newStopLoss;
              }
            }
          }

          // Update position in the array
          const index = updatedPositions.findIndex(p => p.id === position.id);
          if (index !== -1) {
            updatedPositions[index] = updatedPosition;
          }
        });

        // Close positions that hit targets or stop losses
        for (const positionToClose of positionsToClose) {
          const tradeFunction = positionToClose.tradingMode === 'LIVE' 
            ? TradeService.placeLiveTrade 
            : TradeService.placePaperTrade;

          try {
            const tradeData = {
              symbol: positionToClose.symbol,
              quantity: Math.floor(positionToClose.lots || 1) * positionToClose.index.lotSize,
              price: positionToClose.exitPrice,
              action: 'SELL',
              orderType: positionToClose.orderType || 'MARKET',
              productType: positionToClose.productType || 'INTRADAY'
            };
            
            // For live trading, get the current Fyers access token
            if (positionToClose.tradingMode === 'LIVE') {
              try {
                const tokenResponse = await api.get('/fyers/access-token');
                if (tokenResponse.data.success) {
                  const appId = tokenResponse.data.appId;
                  const accessToken = tokenResponse.data.accessToken;
                  tradeData.fyersAccessToken = `${appId}:${accessToken}`;
                } else {
                  throw new Error('Failed to get Fyers access token');
                }
              } catch (tokenError) {
                console.error('Failed to get Fyers access token:', tokenError);
                throw new Error('Fyers access token not available. Please relogin to Fyers.');
              }
            }
            
            await tradeFunction(tradeData);

            onTradeLog({
              message: `[${positionToClose.tradingMode}] ${positionToClose.exitReason} exit for ${positionToClose.symbol} at ${formatPrice(positionToClose.exitPrice)}.`,
              data: positionToClose
            });

            // Handle re-entry logic
            handlePositionClosed(positionToClose);

          } catch (error) {
            onTradeLog({
              message: `[${positionToClose.tradingMode}] EXIT FAILED for ${positionToClose.symbol}: ${error.message}`,
              data: { ...positionToClose, error: error.message },
              isError: true
            });
          }
        }

        // Update active positions
        setActivePositions(updatedPositions.filter(p => 
          !positionsToClose.some(close => close.id === p.id)
        ));

      } catch (error) {
        console.error('❌ Error in active position management:', error);
      }
    };

    const interval = setInterval(manageActivePositions, 2000);
    return () => clearInterval(interval);
  }, [activePositions, onTradeLog]);

  // HMA auto-refresh: Robust sync to 5-min candle close, with retry if new candle not available
  useEffect(() => {
    let hmaTimeout;
    let retryTimeout;
    let cancelled = false;
    let retryingSymbols = [];
    let nextRunTime = null;

    // Helper to get the next 5-min mark (e.g., 10:05:00, 10:10:00)
    function getNext5MinMark() {
      const now = new Date();
      const next = new Date(now);
      next.setSeconds(0, 0);
      let min = now.getMinutes();
      let add = 5 - (min % 5);
      if (add === 0) add = 5; // If we are exactly at a 5-min mark, schedule for the next one
      next.setMinutes(min + add);
      return next;
    }

    // Helper to get the timestamp (in seconds) for the just-closed 5-min candle
    function getLast5MinCandleTimestamp() {
      const now = new Date();
      now.setSeconds(0, 0);
      let min = now.getMinutes();
      let sub = min % 5;
      now.setMinutes(min - sub);
      return Math.floor(now.getTime() / 1000);
    }

    async function refreshHMAForSymbols(symbolsToRefresh) {
      if (cancelled || symbolsToRefresh.length === 0) return [];
      setIsRefreshingHMA(true);
      const lastCandleTs = getLast5MinCandleTimestamp();
      const failedSymbols = [];
      
      for (const symbol of symbolsToRefresh) {
        if (cancelled) break;
        try {
          if (symbol.hmaLastCandle === lastCandleTs) {
            console.log(`⏭️ Skipping ${symbol.symbol} - HMA already updated for this candle`);
            continue;
          }
          
          console.log(`🔄 Refreshing HMA for ${symbol.symbol}...`);
          const hmaData = await HMAService.fetchAndCalculateHMA(symbol.symbol);
          
          if (hmaData && hmaData.hmaValue) {
            console.log(`✅ HMA updated for ${symbol.symbol}: ${hmaData.hmaValue}`);
            
            // Update local state
            setMonitoredSymbols(prevSymbols => 
              prevSymbols.map(s => 
                s.id === symbol.id 
                  ? { 
                      ...s, 
                      hmaValue: hmaData.hmaValue, 
                      lastUpdate: new Date(),
                      hmaLastCandle: lastCandleTs
                    }
                  : s
              )
            );
            
            // Also update the backend state to prevent override
            try {
              await BackendMonitoringService.updateSymbolHMA(
                symbol.id, 
                hmaData.hmaValue, 
                new Date()
              );
              console.log(`💾 Backend HMA updated for ${symbol.symbol}`);
            } catch (backendError) {
              console.error(`❌ Failed to update backend HMA for ${symbol.symbol}:`, backendError);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Failed to refresh HMA for ${symbol.symbol}:`, error);
          failedSymbols.push(symbol);
        }
      }
      
      setIsRefreshingHMA(false);
      return failedSymbols;
    }

    async function refreshHMAWithRetry(symbolsToRefresh) {
      if (cancelled) return;
      const failedSymbols = await refreshHMAForSymbols(symbolsToRefresh);
      setLastHMARefresh(new Date());
      if (failedSymbols.length > 0) {
        // Retry after 5 seconds
        retryTimeout = setTimeout(() => {
          refreshHMAWithRetry(failedSymbols);
        }, 5000);
      }
    }

    async function scheduleOrRetry() {
      if (cancelled) return;
      nextRunTime = getNext5MinMark();
      setNextHMARefresh(nextRunTime);
      const msUntilNextRun = nextRunTime - new Date();
      hmaTimeout = setTimeout(() => {
        refreshHMAWithRetry(monitoredSymbols).then(() => scheduleOrRetry());
      }, msUntilNextRun);
    }

    scheduleOrRetry();

    return () => {
      cancelled = true;
      clearTimeout(hmaTimeout);
      clearTimeout(retryTimeout);
    };
  }, [monitoredSymbols, setMonitoredSymbols]);

  // Add countdown timer for CONFIRMING status
  useEffect(() => {
            const hasConfirmingSymbols = monitoredSymbols.some(s => s.triggerStatus === 'CONFIRMING' || s.triggerStatus === 'CONFIRMING_REVERSAL' || s.triggerStatus === 'CONFIRMING_ENTRY');
    
    if (hasConfirmingSymbols) {
      const interval = setInterval(() => {
        setCountdownTick(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [monitoredSymbols]);

  const handlePositionClosed = (closedPosition) => {
    console.log('Position closed:', closedPosition);
    
    // Remove from active positions
    setActivePositions(prevPositions => 
      prevPositions.filter(pos => pos.id !== closedPosition.id)
    );
    
    // Add to trade log
    if (onTradeLog) {
      onTradeLog({
        symbol: closedPosition.symbol,
        action: 'EXIT',
        price: closedPosition.currentPrice || closedPosition.boughtPrice,
        quantity: closedPosition.quantity || (Math.floor(closedPosition.lots || 1) * (closedPosition.index?.lotSize || 75)),
        pnl: closedPosition.pnl || 0,
        timestamp: new Date()
      });
    }
  };

  const handleExitPosition = async (position) => {
    try {
      console.log(`🔄 Exiting position for ${position.symbol}`);
      
      // Call backend API to exit position
      const response = await api.post('/monitoring/exit-position', {
        positionId: position.id
      });
      
      const result = response.data;
      
      if (result.success) {
        console.log(`✅ Position exited successfully for ${position.symbol}`);
        
        // Remove from active positions
        setActivePositions(prevPositions => 
          prevPositions.filter(pos => pos.id !== position.id)
        );
        
        // Add to trade log
        if (onTradeLog) {
          onTradeLog({
            symbol: position.symbol,
            action: 'MANUAL_EXIT',
            price: position.currentPrice || position.boughtPrice,
            quantity: position.quantity || (Math.floor(position.lots || 1) * (position.index?.lotSize || 75)),
            pnl: position.pnl || 0,
            timestamp: new Date()
          });
        }
      } else {
        console.error(`❌ Failed to exit position: ${result.message}`);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error(`❌ Error exiting position:`, error);
      // You could show a toast notification here
    }
  };

  const handleCancelPendingOrder = async (order) => {
    try {
      console.log('❌ Cancelling pending order:', order);
      
      // Call backend to cancel the order
      const response = await BackendMonitoringService.cancelOrder(order.orderId);
      
      if (response.success) {
        // Remove from pending orders
        setPendingOrders(prev => prev.filter(p => p.id !== order.id));
        
        // Add to trade log
        if (onTradeLog) {
          onTradeLog({
            type: 'ORDER_CANCELLED',
            symbol: order.symbol,
            orderId: order.orderId,
            timestamp: new Date()
          });
        }
        
        window.showToast(`Order cancelled successfully for ${order.symbol}`, 'success');
      } else {
        // Show detailed error message from backend
        const errorMessage = response.error || response.message || 'Failed to cancel order';
        window.showToast(`Failed to cancel order for ${order.symbol}: ${errorMessage}`, 'error');
        console.error('❌ Cancel order failed:', response);
      }
    } catch (error) {
      console.error('❌ Error cancelling pending order:', error);
      
      // Show detailed error information
      let errorMessage = 'Unknown error occurred';
      
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server - check your connection';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      window.showToast(`Error cancelling order: ${errorMessage}`, 'error');
    }
  };

  const handleStopMonitoring = (symbolId) => {
    const symbolToStop = monitoredSymbols.find(s => s.id === symbolId);
    setMonitoredSymbols(prev => prev.filter(s => s.id !== symbolId));
    setActivePositions(prev => prev.filter(p => p.id !== symbolId));
    if (symbolToStop) {
      onTradeLog({ message: `Monitoring stopped manually for ${symbolToStop.symbol}` });
    }
  };

  // Function to show rejection notifications
  const showRejectionNotification = (symbol, reason) => {
    let message = '';
    let type = 'error';
    
    if (reason.includes('blocked one day ahead of expiry')) {
      message = `${symbol}: Contract blocked - near expiry date. Symbol removed from monitoring.`;
      type = 'warning';
    } else if (reason.includes('Freeze qty including square off order')) {
      message = `${symbol}: Position limit exceeded. Try reducing lot size or check account limits.`;
      type = 'warning';
    } else if (reason.includes('Insufficient funds')) {
      message = `${symbol}: Insufficient funds to place order.`;
      type = 'error';
    } else if (reason.includes('Market closed')) {
      message = `${symbol}: Market is closed. Orders can only be placed during market hours.`;
      type = 'warning';
    } else {
      message = `${symbol}: Order rejected - ${reason}`;
      type = 'error';
    }
    
    window.showToast(message, type);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING_FOR_REVERSAL': return 'text-amber-400 bg-amber-900/20 border border-amber-700/30';
      case 'CONFIRMING_REVERSAL': return 'text-yellow-400 bg-yellow-900/20 border border-yellow-700/30';
      case 'WAITING_FOR_ENTRY': return 'text-brand bg-brand/20 border border-brand/30';
      case 'CONFIRMING_ENTRY': return 'text-orange-400 bg-orange-900/20 border border-orange-700/30';
      case 'WAITING': return 'text-yellow-400 bg-yellow-900/20 border border-yellow-700/30';
      case 'CONFIRMING': return 'text-orange-400 bg-orange-900/20 border border-orange-700/30';
      case 'ORDER_PLACED': return 'text-blue-400 bg-blue-900/20 border border-blue-700/30';
      case 'ORDER_REJECTED': return 'text-red-400 bg-red-900/20 border border-red-700/30';
      case 'ORDER_CANCELLED': return 'text-purple-400 bg-purple-900/20 border border-purple-700/30';
      case 'TARGET_HIT': return 'text-green-400 bg-green-900/20 border border-green-700/30';
      case 'TARGET_EXIT_PENDING': return 'text-emerald-400 bg-emerald-900/20 border border-emerald-700/30';
      case 'TARGET_EXIT_EXECUTED': return 'text-green-500 bg-green-900/30 border border-green-600/40';
      case 'TARGET_EXIT_FAILED': return 'text-red-400 bg-red-900/20 border border-red-700/30';
      case 'SL_HIT': return 'text-red-400 bg-red-900/20 border border-red-700/30';
      case 'WAITING_REENTRY': return 'text-cyan-400 bg-cyan-900/20 border border-cyan-700/30';
      case 'PENDING': return 'text-yellow-400 bg-yellow-900/20 border border-yellow-700/30';
      case 'FILLED': return 'text-green-400 bg-green-900/20 border border-green-700/30';
      case 'REJECTED': return 'text-red-400 bg-red-900/20 border border-red-700/30';
      case 'CANCELLED': return 'text-purple-400 bg-purple-900/20 border border-purple-700/30';
      default: return 'text-slate-400 bg-slate-900/20 border border-slate-700/30';
    }
  };

  const getStatusDescription = (symbol) => {
    // Map backend status to frontend display status
    switch (symbol.triggerStatus) {
      case 'WAITING_FOR_REVERSAL':
        return 'Waiting for Reversal';
      case 'CONFIRMING_REVERSAL':
        return 'Confirming Reversal';
      case 'WAITING_FOR_ENTRY':
        return 'Ready for Entry';
      case 'CONFIRMING_ENTRY':
        return 'Confirming Entry';
      case 'WAITING':
        return 'Waiting';
      case 'CONFIRMING':
        return 'Confirming';
      case 'ORDER_PLACED':
        return 'Order Placed';
      case 'ORDER_REJECTED':
        return 'Order Rejected';
      case 'ORDER_CANCELLED':
        return 'Order Cancelled';
      case 'TARGET_HIT':
        return 'Target Hit';
      case 'TARGET_EXIT_PENDING':
        return 'Target Exit Pending';
      case 'TARGET_EXIT_EXECUTED':
        return 'Target Exit Executed';
      case 'TARGET_EXIT_FAILED':
        return 'Target Exit Failed';
      case 'SL_HIT':
        return 'SL Hit';
      case 'WAITING_REENTRY':
        return 'Waiting Re-entry';
      default:
        return 'Waiting';
    }
  };

  const getRejectionReason = (symbol) => {
    // Check for specific rejection reasons in order remarks or status
    if (symbol.orderStatus === 'REJECTED' || symbol.triggerStatus === 'ORDER_REJECTED') {
      const remarks = symbol.orderRemarks || symbol.remarks || '';
      
      if (remarks.includes('blocked one day ahead of expiry')) {
        return 'Contract blocked - near expiry';
      } else if (remarks.includes('Freeze qty including square off order')) {
        return 'Position limit exceeded';
      } else if (remarks.includes('Insufficient funds')) {
        return 'Insufficient funds';
      } else if (remarks.includes('Market closed')) {
        return 'Market closed';
      } else if (remarks.includes('Invalid symbol')) {
        return 'Invalid symbol';
      } else if (remarks.includes('tick size')) {
        return 'Price not in tick size';
      } else {
        return 'Order rejected';
      }
    }
    
    return null;
  };

  // Add function to calculate countdown for CONFIRMING status
  const getConfirmingCountdown = (symbol) => {
    // Handle CONFIRMING_REVERSAL status (15-minute timer)
    if (symbol.triggerStatus === 'CONFIRMING_REVERSAL' && symbol.pendingSignal?.confirmationEndTime) {
      const now = new Date();
      const endTime = new Date(symbol.pendingSignal.confirmationEndTime);
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        return "Confirming...";
      }
      
      const minutesLeft = Math.floor(timeLeft / (60 * 1000));
      const secondsLeft = Math.floor((timeLeft % (60 * 1000)) / 1000);
      
      return `${minutesLeft}m ${secondsLeft}s left`;
    }
    
    // Handle CONFIRMING_ENTRY status (5-minute candle timer)
    if (symbol.triggerStatus === 'CONFIRMING_ENTRY' && symbol.pendingSignal?.confirmationEndTime) {
      const now = new Date();
      const endTime = new Date(symbol.pendingSignal.confirmationEndTime);
      const timeLeft = endTime - now;
      
      if (timeLeft <= 0) {
        return "Placing order...";
      }
      
      const minutesLeft = Math.floor(timeLeft / (60 * 1000));
      const secondsLeft = Math.floor((timeLeft % (60 * 1000)) / 1000);
      
      return `${minutesLeft}m ${secondsLeft}s left`;
    }
    
    // Handle old CONFIRMING status (5-minute candle timer)
    if (symbol.triggerStatus === 'CONFIRMING' && symbol.pendingSignal?.triggeredAt) {
      const now = new Date();
      const triggeredAt = new Date(symbol.pendingSignal.triggeredAt);
      
      // Calculate time until next 5-minute candle close (MM:59)
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      
      // Find the next 5-minute boundary (MM:59)
      const nextFiveMinBoundary = Math.ceil(currentMinute / 5) * 5 - 1; // 4, 9, 14, 19, etc.
      const minutesUntilBoundary = nextFiveMinBoundary - currentMinute;
      const secondsUntilBoundary = 59 - currentSecond;
      
      const totalSecondsLeft = minutesUntilBoundary * 60 + secondsUntilBoundary;
      
      if (totalSecondsLeft <= 0) {
        return "Placing order...";
      }
      
      const minutesLeft = Math.floor(totalSecondsLeft / 60);
      const secondsLeft = totalSecondsLeft % 60;
      
      return `${minutesLeft}m ${secondsLeft}s left`;
    }
    
    return null;
  };

  const calculateTargetSL = (currentLTP, targetPoints, stopLossPoints) => {
    if (!currentLTP) return { target: null, stopLoss: null };
    return {
      target: currentLTP + targetPoints,
      stopLoss: currentLTP - stopLossPoints
    };
  };

  const getLiveLtp = (symbol) => {
    const allSymbols = [...monitoredSymbols, ...activePositions];
    const found = allSymbols.find(s => s.symbol === symbol);
    return found?.currentLTP || found?.ltp || null;
  };

  // Memoized calculation for positions with live data
  const positionsWithLive = useMemo(() => activePositions.map(pos => {
      const ltp = pos.ltp || pos.currentPrice || pos.boughtPrice; // Use current price or fallback
      const quantity = pos.quantity || (Math.floor(pos.lots || 1) * (pos.index?.lotSize || 75));
      const pnl = (ltp - pos.boughtPrice) * quantity;
      return { ...pos, ltp, pnl };
  }), [activePositions]);
  
  const totalUnrealized = positionsWithLive.reduce((sum, p) => sum + (p.pnl ?? 0), 0);

  const handleStopAll = async () => {
    try {
      await BackendMonitoringService.clearAllMonitoring();
      setMonitoredSymbols([]);
      setActivePositions([]);
      console.log('✅ All monitoring stopped');
    } catch (error) {
      console.error('❌ Error stopping all monitoring:', error);
    }
  };

  const handleStopMonitoringSymbol = async (symbolId) => {
    try {
      await BackendMonitoringService.removeSymbolFromMonitoring(symbolId);
      // Refresh the monitored symbols list
      const symbols = await BackendMonitoringService.getMonitoredSymbols();
      setMonitoredSymbols(symbols);
      console.log('✅ Stopped monitoring for symbol:', symbolId);
    } catch (error) {
      console.error('❌ Error stopping monitoring for symbol:', error);
    }
  };

  const handleMoveStrikeToEntry = async (symbolId) => {
    try {
      console.log(`🚀 Manually moving strike ${symbolId} to Waiting for Entry`);
      
      const response = await api.post('/monitoring/move-strike-to-entry', {
        symbolId: symbolId
      });

      const result = response.data;
      
      if (result.success) {
        console.log('✅ Strike moved to Waiting for Entry successfully:', result.message);
        // Refresh the data to show updated status
        await loadDataFromBackend();
      } else {
        console.error('❌ Failed to move strike to entry:', result.message);
      }
    } catch (error) {
      console.error('❌ Error moving strike to entry:', error);
    }
  };

  const handlePlaceLimitOrder = async (symbol) => {
    try {
      console.log(`📋 Placing limit order for ${symbol.symbol}`);
      
      const response = await api.post('/monitoring/place-limit-order', {
        symbolId: symbol.id
      });

      const result = response.data;
      
      if (result.success) {
        console.log('✅ Limit order placed successfully:', result.message);
        // Refresh the data to show updated status
        await loadDataFromBackend();
      } else {
        console.error('❌ Failed to place limit order:', result.message);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('❌ Error placing limit order:', error);
    }
  };

  const handleViewSLOrder = (position) => {
    setViewSLOrderModal({ open: true, position });
  };

  const handleViewOrderModifications = (symbol) => {
    setOrderModificationsModal({ 
      open: true, 
      symbolId: symbol.id, 
      symbolName: symbol.symbol 
    });
  };

  // Manual HMA refresh handler
  const handleManualHMARefresh = async () => {
    if (isRefreshingHMA || monitoredSymbols.length === 0) return;
    
    setIsRefreshingHMA(true);
    console.log('🔄 Manual HMA refresh triggered');
    
    try {
      const lastCandleTs = Math.floor(new Date().setSeconds(0, 0) / 1000);
      const failedSymbols = [];
      
      for (const symbol of monitoredSymbols) {
        try {
          console.log(`🔄 Refreshing HMA for ${symbol.symbol}...`);
          const hmaData = await HMAService.fetchAndCalculateHMA(symbol.symbol);
          
          if (hmaData && hmaData.hmaValue) {
            console.log(`✅ HMA updated for ${symbol.symbol}: ${hmaData.hmaValue}`);
            
            // Update local state
            setMonitoredSymbols(prevSymbols => 
              prevSymbols.map(s => 
                s.id === symbol.id 
                  ? { 
                      ...s, 
                      hmaValue: hmaData.hmaValue, 
                      lastUpdate: new Date(),
                      hmaLastCandle: lastCandleTs
                    }
                  : s
              )
            );
            
            // Note: Backend HMA updates are handled by the automatic 5-minute refresh
            // The local state update is sufficient for immediate UI feedback
            console.log(`✅ Local HMA updated for ${symbol.symbol}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Failed to refresh HMA for ${symbol.symbol}:`, error);
          failedSymbols.push(symbol);
        }
      }
      
      setLastHMARefresh(new Date());
      console.log(`✅ Manual HMA refresh completed. Failed: ${failedSymbols.length}`);
      
    } catch (error) {
      console.error('❌ Manual HMA refresh failed:', error);
    } finally {
      setIsRefreshingHMA(false);
    }
  };

  const handleRecoverOrders = async () => {
    try {
      console.log('🔄 Manual order recovery triggered');
      
      // Try the debug endpoint first (no auth required)
      let result = await BackendMonitoringService.recoverOrdersDebug();
      
      if (!result.success) {
        console.log('🔄 Debug endpoint failed, trying authenticated endpoint...');
        result = await BackendMonitoringService.recoverOrders();
      }
      
      if (result.success) {
        console.log('✅ Order recovery completed successfully');
        // Refresh the data to show updated status
        await loadDataFromBackend();
      } else {
        console.error('❌ Order recovery failed:', result.message || result.error);
      }
    } catch (error) {
      console.error('❌ Error during order recovery:', error);
    }
  };

  if (monitoredSymbols.length === 0 && activePositions.length === 0) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Empty Waiting for Reversal Card */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 sm:p-8">
            <div className="flex items-center gap-2 mb-4 p-4 border-b border-slate-700/50">
              <Clock className="w-5 h-5 text-amber-400" />
              <h4 className="text-lg font-semibold text-white">Waiting for Reversal</h4>
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No symbols are currently being monitored</p>
              <p className="text-slate-500 text-xs mt-1">Select options and click "Start Monitoring" to begin</p>
            </div>
          </div>

          {/* Empty Waiting for Entry Card */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 sm:p-8">
            <div className="flex items-center gap-2 mb-4 p-4 border-b border-slate-700/50">
              <Eye className="w-5 h-5 text-brand" />
              <h4 className="text-lg font-semibold text-white">Waiting for Entry</h4>
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <Eye className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No symbols are currently being monitored</p>
              <p className="text-slate-500 text-xs mt-1">Select options and click "Start Monitoring" to begin</p>
            </div>
          </div>

          {/* Empty Active Positions Card */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 sm:p-8">
            <div className="flex items-center gap-2 mb-4 p-4 border-b border-slate-700/50">
              <TrendingUp className="w-5 h-5 text-brand" />
              <h4 className="text-lg font-semibold text-white">Active Positions</h4>
            </div>
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No active positions</p>
              <p className="text-slate-500 text-xs mt-1">Positions will appear here when trades are executed</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 sm:mb-6">
      <div className="space-y-3 sm:space-y-4">
        {/* System Status Bar */}
        {monitoredSymbols.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">System Status</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  Last HMA: {formatTime(lastHMARefresh)}
                </span>
                <span className="text-xs text-slate-500">
                  Next HMA Refresh: {formatTime(nextHMARefresh)}
                </span>
                <span className="text-xs text-slate-500">
                  Live Data: {formatTime(lastLiveDataUpdate)}
                </span>
                <button
                  onClick={handleRecoverOrders}
                  className="px-2 py-1 rounded-lg transition-colors text-xs bg-orange-800 text-white hover:bg-orange-700"
                  title="Recover order statuses from Fyers API (useful after connection issues)"
                >
                  Recover Orders
                </button>
                <button
                  onClick={handleManualHMARefresh}
                  disabled={isRefreshingHMA}
                  className={`px-2 py-1 rounded-lg transition-colors text-xs ${
                    isRefreshingHMA 
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-800 text-white hover:bg-blue-700'
                  }`}
                  title="Manually refresh HMA values"
                >
                  {isRefreshingHMA ? 'Refreshing...' : 'Refresh HMA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Waiting for Reversal Card */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 p-3 border-b border-slate-700/50">
            <Clock className="w-4 h-4 text-amber-400" />
            <h4 className="text-base font-semibold text-white">Waiting for Reversal</h4>
            <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full">
              LTP &gt; HMA
            </span>
            <span className="text-xs text-slate-400 ml-auto">
              {(() => {
                const reversalSymbols = monitoredSymbols.filter(s => 
                  s.triggerStatus === 'WAITING_FOR_REVERSAL' || 
                  s.triggerStatus === 'CONFIRMING_REVERSAL'
                );
                const confirmingCount = reversalSymbols.filter(s => s.triggerStatus === 'CONFIRMING_REVERSAL').length;
                return confirmingCount > 0 ? `${confirmingCount} confirming` : '';
              })()}
            </span>
          </div>
          {(() => {
            const reversalSymbols = monitoredSymbols.filter(s => 
              s.triggerStatus === 'WAITING_FOR_REVERSAL' || 
              s.triggerStatus === 'CONFIRMING_REVERSAL'
            );
            return reversalSymbols.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-1.5 px-2 text-xs font-medium text-slate-300">Symbol Name</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium text-slate-300">LTP</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium text-slate-300">HMA-55</th>
                      <th className="text-center py-1.5 px-2 text-xs font-medium text-slate-300">Status</th>
                      <th className="text-center py-1.5 px-2 text-xs font-medium text-slate-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reversalSymbols.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${item.type === 'CE' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>{item.type}</span>
                            <span className="text-xs font-medium text-white">{item.symbol}</span>
                            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-semibold ${item.tradingMode === 'LIVE' ? 'bg-blue-700/80 text-white border border-blue-400' : 'bg-slate-700/80 text-slate-300 border border-slate-500'}`}>
                              {item.tradingMode === 'LIVE' ? 'LIVE' : 'PAPER'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className={`text-xs font-semibold ${
                            item.triggerStatus === 'CONFIRMING_REVERSAL' 
                              ? 'text-yellow-400' 
                              : 'text-white'
                          }`}>
                            {formatPrice(item.currentLTP)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span className="text-xs font-semibold text-slate-300">
                            {formatPrice(item.hmaValue)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(item.triggerStatus)}`}
                                title={
                                  item.triggerStatus === 'CONFIRMING_REVERSAL' 
                                    ? `LTP crossed below HMA - 15-minute confirmation timer running. ${getConfirmingCountdown(item) || 'Confirming...'} remaining. If LTP stays below HMA for 15 minutes, symbol will move to "Waiting for Entry". If LTP goes back above HMA, timer will cancel.`
                                    : item.orderModificationReason 
                                      ? `Reason: ${item.orderModificationReason}` 
                                      : ''
                                }>
                            {getStatusDescription(item)}
                            {getConfirmingCountdown(item) && (
                              <span className="ml-1 text-xs text-slate-400">
                                ({getConfirmingCountdown(item)})
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex flex-col gap-1">
                            {item.triggerStatus === 'CONFIRMING_REVERSAL' && (
                              <button
                                onClick={() => handleMoveStrikeToEntry(item.id)}
                                className="px-1.5 py-0.5 bg-green-900/30 hover:bg-green-800/40 text-green-400 text-xs font-medium rounded-md"
                                title={`Manually move ${item.symbol} to Waiting for Entry (bypass 15-minute timer)`}
                              >
                                Move Strike
                              </button>
                            )}
                            <button
                              onClick={() => handleStopMonitoringSymbol(item.id)}
                              className="px-1.5 py-0.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 text-xs font-medium rounded-md"
                              title={`Stop monitoring ${item.symbol}`}
                            >
                              Stop Monitoring
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm">No symbols waiting for reversal</p>
                <p className="text-slate-500 text-xs mt-1">Symbols with LTP &gt; HMA will appear here</p>
              </div>
            );
          })()}
        </div>

        {/* Waiting for Entry Card */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 p-3 border-b border-slate-700/50">
            <Eye className="w-4 h-4 text-brand" />
            <h4 className="text-base font-semibold text-white">Waiting for Entry</h4>
            <span className="text-xs text-brand bg-brand/20 px-2 py-1 rounded-full">
              LTP &lt; HMA (Confirmed)
            </span>
          </div>
          {(() => {
            const entrySymbols = monitoredSymbols.filter(s => s.triggerStatus === 'WAITING_FOR_ENTRY' || s.triggerStatus === 'CONFIRMING_ENTRY');
            return entrySymbols.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="text-left py-1.5 px-2 text-xs font-medium text-slate-300">Symbol Name</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium text-slate-300">LTP</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium text-slate-300">HMA-55</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium text-slate-300">Target</th>
                      <th className="text-right py-1.5 px-2 text-xs font-medium text-slate-300">Stop Loss (SL)</th>
                      <th className="text-center py-1.5 px-2 text-xs font-medium text-slate-300">Status</th>
                      <th className="text-center py-1.5 px-2 text-xs font-medium text-slate-300">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrySymbols.map((item) => {
                      const { target, stopLoss } = calculateTargetSL(item.currentLTP, item.targetPoints, item.stopLossPoints);
                      return (
                        <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${item.type === 'CE' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>{item.type}</span>
                              <span className="text-xs font-medium text-white">{item.symbol}</span>
                              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-semibold ${item.tradingMode === 'LIVE' ? 'bg-blue-700/80 text-white border border-blue-400' : 'bg-slate-700/80 text-slate-300 border border-slate-500'}`}>
                                {item.tradingMode === 'LIVE' ? 'LIVE' : 'PAPER'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-xs font-semibold text-white">
                              {formatPrice(item.currentLTP)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-xs font-semibold text-slate-300">
                              {formatPrice(item.hmaValue)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-xs font-semibold text-green-400">
                              {formatPrice(target)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <span className="text-xs font-semibold text-red-400">
                              {formatPrice(stopLoss)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex flex-col gap-1">
                              <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(item.triggerStatus)}`}
                                    title={
                                      item.triggerStatus === 'CONFIRMING_ENTRY' 
                                        ? `LTP crossed above HMA - 5-minute candle confirmation timer running. ${getConfirmingCountdown(item) || 'Confirming...'} remaining. If LTP stays above HMA until candle close, market order will be placed. If LTP goes back below HMA, timer will cancel.`
                                        : item.orderModificationReason 
                                          ? `Reason: ${item.orderModificationReason}` 
                                          : ''
                                    }>
                                {getStatusDescription(item)}
                                {getConfirmingCountdown(item) && (
                                  <span className="ml-1 text-xs text-slate-400">
                                    ({getConfirmingCountdown(item)})
                                  </span>
                                )}
                              </span>
                              {getRejectionReason(item) && (
                                <span className="text-xs text-red-400 bg-red-900/20 px-1 py-0.5 rounded">
                                  {getRejectionReason(item)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleStopMonitoringSymbol(item.id)}
                                className="px-1.5 py-0.5 bg-red-900/30 hover:bg-red-800/40 text-red-400 text-xs font-medium rounded-md"
                                title={`Stop monitoring ${item.symbol}`}
                              >
                                Stop Monitoring
                              </button>
                              {item.triggerStatus === 'WAITING_FOR_ENTRY' && (
                                <button
                                  onClick={() => handlePlaceLimitOrder(item)}
                                  className="px-1.5 py-0.5 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 text-xs font-medium rounded-md"
                                  title={`Place limit order for ${item.symbol}`}
                                >
                                  Place Limit Order
                                </button>
                              )}
                              {(item.orderModificationCount > 0 || item.triggerStatus === 'ORDER_MODIFIED') && (
                                <button
                                  onClick={() => handleViewOrderModifications(item)}
                                  className="px-1.5 py-0.5 bg-orange-900/30 hover:bg-orange-800/40 text-orange-400 text-xs font-medium rounded-md"
                                  title={`View order modifications for ${item.symbol}`}
                                >
                                  <History className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                  <Eye className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm">No symbols ready for entry</p>
                <p className="text-slate-500 text-xs mt-1">Symbols with confirmed reversal will appear here</p>
              </div>
            );
          })()}
        </div>

        {/* Pending Orders Card */}
        {pendingOrders && pendingOrders.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 mb-3 p-3 border-b border-slate-700/50">
                <Clock className="w-4 h-4 text-yellow-400" />
                <h4 className="text-base font-semibold text-white">Pending Orders</h4>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Waiting for HMA trigger
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 px-3 text-sm font-medium text-slate-300">Symbol</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Order Price</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Trigger Price</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Current LTP</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">HMA</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Qty (Lots)</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-slate-300">Order ID</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-slate-300">Status</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${order.type === 'CE' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>{order.type}</span>
                            <span className="text-sm font-medium text-white">{order.symbol}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-white">
                          ₹{order.boughtPrice?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-yellow-400">
                          ₹{order.triggerPrice?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-white">
                          {formatPrice(getLiveLtp(order.symbol))}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-slate-300">
                          {formatPrice(order.hmaValue)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-white">
                          {Math.floor(order.lots || 1) * (order.index?.lotSize || 0)} ({Math.floor(order.lots || 1)} lots)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs font-mono text-slate-300">{order.orderId || '--'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs font-semibold rounded px-2 py-0.5 bg-yellow-900/30 text-yellow-400">
                          PENDING
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCancelPendingOrder(order)}
                            className="px-2 py-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 text-xs font-medium rounded-md"
                            title={`Cancel pending order ${order.symbol}`}
                          >
                            Cancel
                          </button>
                          {(order.orderModificationCount > 0 || order.triggerStatus === 'ORDER_MODIFIED') && (
                            <button
                              onClick={() => handleViewOrderModifications(order)}
                              className="px-2 py-1 bg-orange-900/30 hover:bg-orange-800/40 text-orange-400 text-xs font-medium rounded-md"
                              title={`View order modifications for ${order.symbol}`}
                            >
                              <History className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Positions Card - Always show */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 mb-3 p-3 border-b border-slate-700/50">
              <TrendingUp className="w-4 h-4 text-brand" />
              <h4 className="text-base font-semibold text-white">Active Positions</h4>
            </div>
            {activePositions.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Total P&L: <span className={`font-bold ${totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{totalUnrealized.toFixed(2)}</span>
                </span>
              </div>
            )}
          </div>
          {activePositions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 px-3 text-sm font-medium text-slate-300">Symbol</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">LTP</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">HMA</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Entry Price</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Target</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Stop Loss</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">Invested</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-slate-300">P&L</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-slate-300">Order ID</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-slate-300">Status</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positionsWithLive.map((position) => (
                    <tr key={position.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${position.type === 'CE' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>{position.type}</span>
                            <span className="text-sm font-medium text-white">{position.symbol}</span>
                          </div>
                          {/* Show modification count if any */}
                          {position.slModifications && position.slModifications.length > 0 && (
                            <span className="text-xs text-yellow-400">
                              {position.slModifications.length} SL modification{position.slModifications.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-white">
                          {formatPrice(position.ltp || position.currentPrice)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-slate-300">
                          {formatPrice(position.hmaValue)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-white">
                          ₹{position.boughtPrice?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-green-400">
                          ₹{position.target?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-red-400">
                          ₹{position.stopLoss?.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-white">
                          ₹{position.invested?.toFixed(2) || '--'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-sm font-bold ${position.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ₹{position.pnl?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs font-mono text-slate-300">{position.buyOrderId || '--'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(position.orderStatus || 'Active')}`}>
                          {position.orderStatus === 'PENDING' ? 'Waiting - Order Placed' :
                           position.orderStatus === 'FILLED' ? 'Successful - Order Placed' :
                           position.orderStatus === 'TARGET_EXIT_PENDING' ? 'Target Exit Pending' :
                           position.orderStatus === 'TARGET_EXIT_EXECUTED' ? 'Target Exit Executed' :
                           position.orderStatus === 'TARGET_EXIT_FAILED' ? 'Target Exit Failed' :
                           position.orderStatus === 'REJECTED' ? 'Order Rejected' :
                           position.orderStatus === 'CANCELLED' ? 'Order Cancelled' :
                           position.orderStatus || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {/* Show Cancel button for pending orders */}
                          {position.orderStatus === 'PENDING' && (
                            <button
                              onClick={() => handleCancelPendingOrder(position)}
                              className="px-2 py-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 text-xs font-medium rounded-md"
                              title={`Cancel pending order for ${position.symbol}`}
                            >
                              Cancel Order
                            </button>
                          )}
                          
                          {/* Show Exit button for filled orders */}
                          {position.orderStatus === 'FILLED' && (
                            <button
                              onClick={() => handleExitPosition(position)}
                              className="px-2 py-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 text-xs font-medium rounded-md"
                              title={`Exit position for ${position.symbol}`}
                            >
                              Exit Trade
                            </button>
                          )}
                          
                          {/* Show Modifications button for active positions */}
                          {position.orderStatus === 'FILLED' && (
                            <button
                              onClick={() => setSlmModal({ open: true, position })}
                              className="px-2 py-1 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 text-xs font-medium rounded-md"
                              title={`View modifications for ${position.symbol}`}
                            >
                              Modifications
                            </button>
                          )}
                          
                          {/* Show View SL Order button when SL order is placed */}
                          {position.slOrderDetails && (
                            <button
                              onClick={() => handleViewSLOrder(position)}
                              className="px-2 py-1 bg-blue-900/30 hover:bg-blue-800/40 text-blue-400 text-xs font-medium rounded-md"
                              title={`View SL order for ${position.symbol}`}
                            >
                              View SL Order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No active positions</p>
              <p className="text-slate-500 text-xs mt-1">Positions will appear here when trades are executed</p>
            </div>
          )}
        </div>
      </div>
      {slmModal.open && slmModal.position && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={e => { if (e.target === e.currentTarget) setSlmModal({ open: false, position: null }); }}>
          <div className="bg-slate-800 rounded-lg shadow-lg p-8 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-slate-400 hover:text-white text-3xl w-10 h-10 flex items-center justify-center" onClick={() => setSlmModal({ open: false, position: null })} aria-label="Close Modifications Modal">&times;</button>
            <h3 className="text-lg font-bold text-white mb-4">Stop Loss Modifications</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-semibold text-slate-300">Symbol:</span> <span className="text-white">{slmModal.position.symbol}</span></div>
                <div><span className="font-semibold text-slate-300">Entry Price:</span> <span className="text-white">₹{slmModal.position.boughtPrice?.toFixed(2)}</span></div>
                <div><span className="font-semibold text-slate-300">Current SL:</span> <span className="text-white">₹{slmModal.position.slStopPrice?.toFixed(2) || '--'}</span></div>
                <div><span className="font-semibold text-slate-300">Initial SL:</span> <span className="text-white">₹{slmModal.position.initialStopLoss?.toFixed(2)}</span></div>
                <div><span className="font-semibold text-slate-300">BUY Order ID:</span> <span className="text-white text-xs font-mono">{slmModal.position.buyOrderId || '--'}</span></div>
                <div><span className="font-semibold text-slate-300">SELL Order ID:</span> <span className="text-white text-xs font-mono">{slmModal.position.sellOrderId || '--'}</span></div>
              </div>
              
              {slmModal.position.slModifications && slmModal.position.slModifications.length > 0 ? (
                <div>
                  <span className="font-semibold text-slate-300">Modification History:</span>
                  <div className="mt-2 max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left py-1 px-2 text-slate-300">Time</th>
                          <th className="text-right py-1 px-2 text-slate-300">Old SL</th>
                          <th className="text-right py-1 px-2 text-slate-300">New SL</th>
                          <th className="text-left py-1 px-2 text-slate-300">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slmModal.position.slModifications.map((mod, idx) => (
                          <tr key={idx} className="border-b border-slate-700">
                            <td className="py-1 px-2 text-white">
                              {new Date(mod.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-1 px-2 text-right text-white">
                              ₹{mod.oldStopLoss?.toFixed(2)}
                            </td>
                            <td className="py-1 px-2 text-right text-green-400 font-semibold">
                              ₹{mod.newStopLoss?.toFixed(2)}
                            </td>
                            <td className="py-1 px-2 text-slate-300 text-xs">
                              {mod.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-slate-400">No modifications yet</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View SL Order Modal */}
      {viewSLOrderModal.open && viewSLOrderModal.position && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Stop Loss Order Details</h3>
              <button
                onClick={() => setViewSLOrderModal({ open: false, position: null })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Symbol:</span>
                <span className="text-white font-semibold">{viewSLOrderModal.position.symbol}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">SL Order ID:</span>
                <span className="text-white font-mono text-sm">{viewSLOrderModal.position.slOrderDetails?.orderId || '--'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Stop Loss Price (Limit):</span>
                <span className="text-red-400 font-semibold">₹{viewSLOrderModal.position.slOrderDetails?.stopPrice?.toFixed(2) || '--'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Trigger Price:</span>
                <span className="text-yellow-400 font-semibold">₹{viewSLOrderModal.position.slOrderDetails?.triggerPrice?.toFixed(2) || '--'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Order Type:</span>
                <span className="text-blue-400 font-semibold">SELL SL-L</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity:</span>
                <span className="text-white">{viewSLOrderModal.position.quantity || '--'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Placed At:</span>
                <span className="text-white text-sm">
                  {viewSLOrderModal.position.slOrderDetails?.placedAt 
                    ? new Date(viewSLOrderModal.position.slOrderDetails.placedAt).toLocaleTimeString() 
                    : '--'}
                </span>
              </div>
              
              <div className="mt-4 p-3 bg-slate-700 rounded">
                <div className="text-xs text-slate-300 mb-2">
                  <strong>Note:</strong> This is a Stop Limit (SL-L) order where:
                </div>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• <strong>Limit Price:</strong> Stop loss price (₹{viewSLOrderModal.position.slOrderDetails?.stopPrice?.toFixed(2) || '--'})</li>
                  <li>• <strong>Trigger Price:</strong> 0.5 points higher (₹{viewSLOrderModal.position.slOrderDetails?.triggerPrice?.toFixed(2) || '--'})</li>
                  <li>• Order executes when price hits trigger, but only at limit price or better</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewSLOrderModal({ open: false, position: null })}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Modifications Modal */}
      <OrderModificationsModal
        isOpen={orderModificationsModal.open}
        onClose={() => setOrderModificationsModal({ open: false, symbolId: null, symbolName: null })}
        symbolId={orderModificationsModal.symbolId}
        symbolName={orderModificationsModal.symbolName}
      />
    </div>
  );
};

const SummaryCard = ({ title, value, isPnl = false }) => {
    const pnlColor = value.startsWith('-') ? 'text-red-400' : 'text-green-400';
    return (
        <div className="bg-slate-900/50 p-4 rounded-lg">
            <div className="text-sm text-slate-400 mb-1">{title}</div>
            <div className={`text-2xl font-bold ${isPnl ? pnlColor : 'text-white'}`}>{value}</div>
        </div>
    );
  }
  
  export default MonitoringDashboard; 