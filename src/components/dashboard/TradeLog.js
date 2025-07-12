import React, { useState, useEffect } from 'react';
import { DollarSign, Eye, X, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import TradeService from '../../services/tradeService';
import { useAuth } from '../../contexts/AuthContext';

const TradeLogService = {
  getTodayLogs: async () => await TradeService.getTodayTradeLogs(),
  getHistoricLogs: async () => await TradeService.getAllTradeLogs(),
};

// const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');

const TradeLog = () => {
  const [logs, setLogs] = useState([]);
  const [showAll, setShowAll] = useState(false);
  
  // Safely get user from auth context
  let user = null;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch (error) {
    console.warn('[TradeLog] Auth context not available:', error);
  }

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      console.log('[TradeLog] Fetching today\'s logs...');
      const todayLogs = await TradeLogService.getTodayLogs();
      console.log('[TradeLog] Received logs:', todayLogs.length, 'entries');
      if (isMounted) {
        // Deduplicate logs by orderId and action, prioritizing FYERS logs
        const dedupedLogs = deduplicateLogs(todayLogs);
        setLogs(dedupedLogs);
      }
    };
    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for real-time trade log updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const handleTradeLogUpdate = (data) => {
      console.log('[TradeLog] Received real-time trade log update:', data);
      setLogs(prevLogs => {
        // Add new log to the beginning
        const newLogs = [data, ...prevLogs];
        // Deduplicate and return
        return deduplicateLogs(newLogs);
      });
    };

    console.log('[TradeLog] Registering for trade log updates...');
    // Register for trade log updates using the TradeService
    TradeService.onTradeLogUpdate(handleTradeLogUpdate);
    console.log('[TradeLog] Trade log update callback registered');

    return () => {
      // Note: The WebSocket service handles cleanup automatically
      console.log('[TradeLog] Component unmounting, callback cleanup handled by WebSocket service');
    };
  }, [user]);

  // Function to deduplicate logs, preferring Fyers logs over app logs
  const deduplicateLogs = (logs) => {
    const uniqueMap = new Map();
    
    // First pass - collect all logs by orderId + action
    logs.forEach(log => {
      const key = `${log.orderId || log._id}-${log.action}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, []);
      }
      uniqueMap.get(key).push(log);
    });
    
    // Second pass - for each group, prefer FYERS over APP logs
    const result = [];
    uniqueMap.forEach(logGroup => {
      if (logGroup.length === 1) {
        result.push(logGroup[0]);
      } else {
        // Find Fyers log or use the first one
        const fyersLog = logGroup.find(log => log.details?.source === 'FYERS');
        result.push(fyersLog || logGroup[0]);
      }
    });
    
    return result.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
  };

  // Listen for real-time order updates from backend
  // useEffect(() => {
  //   function handleOrderUpdate(order) {
  //     setTradeLog(prev => [
  //       {
  //         type: 'ORDER_UPDATE',
  //         message: `Order update for ${order.symbol}: Status ${order.status}, Order ID: ${order.id || order.orderNumber || order.exchOrdId}`,
  //         order
  //       },
  //       ...prev
  //     ]);
  //   }
  //   socket.on('orderUpdate', handleOrderUpdate);
  //   return () => {
  //     socket.off('orderUpdate', handleOrderUpdate);
  //   };
  // }, []);

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-8">
      <div className="flex justify-between items-center p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-brand" />
          Trade Logs
        </h3>
        <button
          onClick={() => setShowAll(true)}
          className="px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand-light text-xs font-bold rounded-md transition-colors"
        >
          View All Trades
        </button>
      </div>
      <TradeLogTable logs={logs} />
      {showAll && <AllTradesModal onClose={() => setShowAll(false)} deduplicateLogs={deduplicateLogs} />}
    </div>
  );
};

const TradeLogTable = ({ logs }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="text-slate-400">
        <tr>
          <th className="px-4 py-2 text-left">Symbol</th>
          <th className="px-4 py-2 text-center">Action</th>
          <th className="px-4 py-2 text-right">Qty</th>
          <th className="px-4 py-2 text-right">Price</th>
          <th className="px-4 py-2 text-center">Status</th>
          <th className="px-4 py-2 text-right">P&L</th>
          <th className="px-4 py-2 text-left">Details</th>
          <th className="px-4 py-2 text-right">Time</th>
        </tr>
      </thead>
      <tbody>
        {logs.length > 0 ? logs.map(log => (
          <tr key={log._id || log.id} className="border-t border-slate-800 hover:bg-slate-700/20">
            <td className="px-4 py-3 font-medium text-white">{log.symbol}</td>
            <td className="px-4 py-3 text-center"><ActionLabel action={log.action} side={log.side} /></td>
            <td className="px-4 py-3 text-right font-mono">{log.quantity}</td>
            <td className="px-4 py-3 text-right font-mono">{`₹${log.price?.toFixed(2)}`}</td>
            <td className="px-4 py-3 text-center"><StatusBadge status={log.status} source={log.details?.source} /></td>
            <td className={`px-4 py-3 text-right font-mono font-bold ${(log.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {log.pnl ? `₹${log.pnl.toFixed(2)}` : '--'}
            </td>
            <td className="px-4 py-3 text-xs text-slate-300">
              {getLogDetails(log)}
            </td>
            <td className="px-4 py-3 text-right text-xs text-slate-500">
              {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan="8" className="text-center py-8 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              No trade logs for today.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const AllTradesModal = ({ onClose, deduplicateLogs }) => {
  const [historicLogs, setHistoricLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [actionType, setActionType] = useState('ALL');
  const [sourceType, setSourceType] = useState('ALL');  // Added source filter
  const [filteredLogs, setFilteredLogs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      console.log('[AllTradesModal] Fetching historic logs...');
      const allLogs = await TradeLogService.getHistoricLogs();
      console.log('[AllTradesModal] Received logs:', allLogs.length, 'entries');
      if (isMounted) {
        // Deduplicate logs by orderId and action, prioritizing FYERS logs
        const dedupedLogs = deduplicateLogs(allLogs);
        setHistoricLogs(dedupedLogs);
      }
    };
    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [deduplicateLogs]);

  useEffect(() => {
    let logs = [...historicLogs];
    if (search) {
      logs = logs.filter(log =>
        log.symbol?.toLowerCase().includes(search.toLowerCase()) ||
        getLogDetails(log).toLowerCase().includes(search.toLowerCase())
      );
    }
    if (date) {
      logs = logs.filter(log => {
        const timestamp = log.timestamp || log.createdAt;
        const logDate = new Date(timestamp).toISOString().slice(0, 10);
        return logDate === date;
      });
    }
    if (actionType !== 'ALL') {
      logs = logs.filter(log => log.action === actionType);
    }
    // Filter by source
    if (sourceType !== 'ALL') {
      logs = logs.filter(log => log.details?.source === sourceType);
    }
    setFilteredLogs(logs);
  }, [search, date, actionType, sourceType, historicLogs]);

  // KPIs
  const totalTrades = filteredLogs.length;
  const overallPnL = filteredLogs.reduce((sum, log) => sum + (log.pnl || 0), 0);
  const winTrades = filteredLogs.filter(log => (log.pnl || 0) > 0).length;
  const winRatio = totalTrades ? ((winTrades / totalTrades) * 100).toFixed(1) : '0.0';
  const targetHits = filteredLogs.filter(log => log.action === 'TARGET_HIT').length;
  const slHits = filteredLogs.filter(log => log.action === 'STOP_LOSS_HIT').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 border border-slate-700/50 rounded-none flex flex-col">
      {/* Sticky Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-700/50 bg-slate-900/95 sticky top-0 z-10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Eye className="w-6 h-6 text-brand" /> All Trade Logs
        </h2>
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-500 rounded-full"><X /></button>
      </div>
      {/* KPIs & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 border-b border-slate-700/50 bg-slate-900/95 sticky top-[72px] z-10">
        {/* KPIs */}
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col items-start">
            <span className="text-xs text-slate-400">Total Trades</span>
            <span className="text-lg font-bold text-white">{totalTrades}</span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-slate-400">Overall P&L</span>
            <span className={`text-lg font-bold ${overallPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>₹{overallPnL.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-slate-400">Win Ratio</span>
            <span className="text-lg font-bold text-white">{winRatio}%</span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-slate-400">Target Hits</span>
            <span className="text-lg font-bold text-white">{targetHits}</span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-slate-400">SL Hits</span>
            <span className="text-lg font-bold text-white">{slHits}</span>
          </div>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search symbol or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <select
            value={actionType}
            onChange={e => setActionType(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="ALL">All Actions</option>
            <option value="ORDER_PLACED">Orders Placed</option>
            <option value="ORDER_FILLED">Orders Filled</option>
            <option value="ORDER_REJECTED">Orders Rejected</option>
            <option value="TARGET_HIT">Target Hit</option>
            <option value="STOP_LOSS_HIT">Stop Loss Hit</option>
            <option value="POSITION_CLOSED">Manual Exits</option>
          </select>
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="ALL">All Sources</option>
            <option value="FYERS">Fyers Only</option>
            <option value="APP">App Only</option>
          </select>
        </div>
      </div>
      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <TradeLogTable logs={filteredLogs} />
      </div>
    </div>
  );
};

// Helper function to generate human-readable details for each log entry
const getLogDetails = (log) => {
  // First, try to use the remarks field for better descriptions
  if (log.remarks) {
    return log.remarks;
  }
  
  // Fallback to fyersRemarks if available
  if (log.fyersRemarks) {
    return log.fyersRemarks;
  }

  // Fallback to generated details
  let details = '';

  switch (log.action) {
    case 'ORDER_PLACED':
      details = `${log.orderType} order placed`;
      break;
    case 'ORDER_FILLED':
      details = `${log.orderType} order filled`;
      break;
    case 'ORDER_REJECTED':
      details = log.details?.errorMessage || 'Order rejected';
      break;
    case 'TARGET_HIT':
      details = `Target hit at ₹${log.price}, entry: ₹${log.details?.entryPrice || 'N/A'}`;
      break;
    case 'STOP_LOSS_HIT':
      details = `Stop loss hit at ₹${log.price}, entry: ₹${log.details?.entryPrice || 'N/A'}`;
      break;
    case 'POSITION_CLOSED':
      details = `Manual exit, entry: ₹${log.details?.entryPrice || 'N/A'}`;
      break;
    default:
      details = log.reason || '';
  }

  // Add source indicator for technical users
  if (log.details?.source) {
    details += ` [${log.details.source}]`;
  }

  return details;
};

const ActionLabel = ({ action, side }) => {
  let displayAction = action;
  let color = "text-slate-400";
  let icon = null;

  switch (action) {
    case 'ORDER_PLACED':
      displayAction = side || "ORDER";
      icon = side === 'BUY' ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
      color = side === 'BUY' ? 'text-green-400' : 'text-red-400';
      break;
    case 'ORDER_FILLED':
      displayAction = side || "FILLED";
      icon = side === 'BUY' ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
      color = side === 'BUY' ? 'text-green-400' : 'text-red-400';
      break;
    case 'ORDER_REJECTED':
      displayAction = "REJECTED";
      color = "text-red-400";
      icon = <XCircle size={14} />;
      break;
    case 'TARGET_HIT':
      displayAction = "TARGET";
      color = "text-green-400";
      icon = <CheckCircle size={14} />;
      break;
    case 'STOP_LOSS_HIT':
      displayAction = "STOP LOSS";
      color = "text-red-400";
      icon = <AlertCircle size={14} />;
      break;
    case 'POSITION_CLOSED':
      displayAction = "EXIT";
      color = "text-slate-400";
      break;
    default:
      displayAction = action.replace(/_/g, ' ');
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
      {icon}
      {displayAction}
    </span>
  );
};

const StatusBadge = ({ status, source }) => {
  const styles = {
    FILLED: 'bg-green-500/10 text-green-400',
    REJECTED: 'bg-red-500/10 text-red-400',
    PENDING: 'bg-yellow-500/10 text-yellow-400',
    COMPLETED: 'bg-green-500/10 text-green-400',
  }[status] || 'bg-slate-500/10 text-slate-400';
  
  const icon = {
    FILLED: <CheckCircle size={14} />,
    REJECTED: <XCircle size={14} />,
    PENDING: <Clock size={14} />,
    COMPLETED: <CheckCircle size={14} />,
  }[status] || <AlertCircle size={14} />;
  
  // Add Fyers badge for Fyers logs
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
        {icon}
        {status}
      </span>
      {source === 'FYERS' && (
        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 rounded-sm">
          FYERS
        </span>
      )}
    </div>
  );
};

export default TradeLog; 