import React, { useState, useEffect } from 'react';
import { X, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const OrderModificationsModal = ({ isOpen, onClose, symbolId, symbolName }) => {
  const [modifications, setModifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (isOpen && symbolId) {
      fetchModifications();
    }
  }, [isOpen, symbolId]);

  const fetchModifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/monitoring/order-modifications/${symbolId}`);
      
      if (response.data.success) {
        const data = response.data.data;
        setModifications(data.modifications || []);
        setSummary({
          symbol: data.symbol,
          currentOrderId: data.currentOrderId,
          currentStatus: data.currentStatus,
          modificationCount: data.modificationCount,
          lastModification: data.lastModification
        });
      } else {
        setError(response.data.message || 'Failed to fetch modifications');
      }
    } catch (error) {
      console.error('Error fetching modifications:', error);
      setError(error.response?.data?.message || 'Failed to fetch modifications');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return price ? price.toFixed(2) : '--';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ORDER_PLACED': return 'text-blue-400 bg-blue-900/20 border border-blue-700/30';
      case 'ORDER_MODIFIED': return 'text-orange-400 bg-orange-900/20 border border-orange-700/30';
      case 'ORDER_REJECTED': return 'text-red-400 bg-red-900/20 border border-red-700/30';
      case 'CONFIRMING_ENTRY': return 'text-yellow-400 bg-yellow-900/20 border border-yellow-700/30';
      default: return 'text-slate-400 bg-slate-900/20 border border-slate-700/30';
    }
  };

  const getModificationIcon = (modificationType) => {
    switch (modificationType) {
      case 'BUY_ORDER_HMA_UPDATE':
        return <TrendingUp className="w-4 h-4 text-orange-400" />;
      case 'SELL_ORDER_SL_UPDATE':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Order Modifications</h3>
              <p className="text-sm text-slate-400">{symbolName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-red-400">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          ) : (
            <>
              {/* Summary Card */}
              {summary && (
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-600">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Current Status</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(summary.currentStatus)}`}>
                        {summary.currentStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Modifications</p>
                      <p className="text-sm font-semibold text-white">{summary.modificationCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Current Order ID</p>
                      <p className="text-xs font-mono text-slate-300">{summary.currentOrderId || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Last Modified</p>
                      <p className="text-xs text-slate-300">
                        {summary.lastModification ? formatTime(summary.lastModification) : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modifications List */}
              {modifications.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-4" />
                  <p className="text-slate-400">No modifications found</p>
                  <p className="text-sm text-slate-500">Order has not been modified yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white mb-3">Modification History</h4>
                  {modifications.map((mod, index) => (
                    <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getModificationIcon(mod.modificationType)}
                          <span className="text-sm font-medium text-white">
                            {mod.modificationType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{formatDate(mod.timestamp)}</p>
                          <p className="text-xs text-slate-500">{formatTime(mod.timestamp)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {/* HMA Changes */}
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400">HMA Value</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300">{formatPrice(mod.oldHmaValue)}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-sm font-semibold text-white">{formatPrice(mod.newHmaValue)}</span>
                            <div className={`flex items-center gap-1 ${getChangeColor(mod.hmaChange)}`}>
                              {getChangeIcon(mod.hmaChange)}
                              <span className="text-xs">
                                {mod.hmaChange > 0 ? '+' : ''}{mod.hmaChange.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Limit Price Changes */}
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400">Limit Price</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300">{formatPrice(mod.oldLimitPrice)}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-sm font-semibold text-white">{formatPrice(mod.newLimitPrice)}</span>
                            <div className={`flex items-center gap-1 ${getChangeColor(mod.priceChange)}`}>
                              {getChangeIcon(mod.priceChange)}
                              <span className="text-xs">
                                {mod.priceChange > 0 ? '+' : ''}{mod.priceChange.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Order IDs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-400">Old Order ID</p>
                          <p className="text-xs font-mono text-slate-300">{mod.oldOrderId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">New Order ID</p>
                          <p className="text-xs font-mono text-slate-300">{mod.newOrderId}</p>
                        </div>
                      </div>

                      {/* Reason */}
                      <div>
                        <p className="text-xs text-slate-400">Reason</p>
                        <p className="text-sm text-slate-300">{mod.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderModificationsModal; 