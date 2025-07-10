import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Menu } from '@headlessui/react';
import TradeService from '../../services/tradeService';

const NotificationsIcon = () => {
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTodayLogs = async () => {
      setLoading(true);
      try {
        const logs = await TradeService.getTodayTradeLogs();
        setTodayLogs(logs);
      } catch (error) {
        console.error('Failed to fetch today logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayLogs();
  }, []);

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'REJECTED':
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'text-green-400';
      case 'REJECTED':
      case 'CANCELLED':
        return 'text-red-400';
      case 'PENDING':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <Menu.Button className="relative p-1.5 sm:p-2 text-slate-400 hover:text-white transition-colors">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {todayLogs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {todayLogs.length > 9 ? '9+' : todayLogs.length}
              </span>
            )}
          </Menu.Button>
          <Menu.Items className="absolute right-0 mt-2 w-72 sm:w-80 origin-top-right bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 focus:outline-none max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white">Today's Trades</h3>
              <p className="text-xs text-slate-400 mt-1">
                {todayLogs.length} trade{todayLogs.length !== 1 ? 's' : ''} today
              </p>
            </div>
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand"></div>
                </div>
              ) : todayLogs.length > 0 ? (
                <div className="space-y-2">
                  {todayLogs.slice(0, 10).map((log) => (
                    <div key={log.id || log._id || `${log.symbol}-${log.timestamp}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {log.symbol}
                        </div>
                        <div className="text-xs text-slate-400">
                          {log.action} • {log.quantity} qty
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {todayLogs.length > 10 && (
                    <div className="text-center py-2 text-xs text-slate-400 border-t border-slate-700 mt-2">
                      +{todayLogs.length - 10} more trades
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trades today</p>
                </div>
              )}
            </div>
          </Menu.Items>
        </>
      )}
    </Menu>
  );
};

export default NotificationsIcon; 