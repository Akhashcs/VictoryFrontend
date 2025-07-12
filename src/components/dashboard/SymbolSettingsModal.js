import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Save, Edit } from 'lucide-react';
import api from '../../services/api';

const SymbolSettingsModal = ({ isOpen, onClose, onSymbolsUpdated }) => {
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState(null);
  
  // Form state for adding/editing symbols
  const [formData, setFormData] = useState({
    symbolName: '',
    symbolInput: '',
    tabType: 'index', // 'index', 'stock', 'commodity'
    optionSymbolFormat: '{STRIKE}{TYPE}',
    nextExpiry: 'monthly', // Default to monthly expiry
    expiryDate: '', // New field for specific date
    nearExpiryDate: '', // New field for current cycle expiry date
    strikeInterval: 50,
    lotSize: 1
  });

  // Load symbols from backend
  const loadSymbols = async () => {
    try {
      setLoading(true);
      const response = await api.get('/market/config');
      setSymbols(response.data.data || []);
    } catch (error) {
      console.error('Error loading symbols:', error);
      // Initialize with empty array if API fails
      setSymbols([]);
    } finally {
      setLoading(false);
    }
  };

  // Get default symbols configuration
  const getDefaultSymbols = () => {
    return [
      // Indices
      { id: 1, symbolName: 'NIFTY', symbolInput: 'NIFTY50-INDEX', tabType: 'index', optionSymbolFormat: 'NSE:NIFTY{expiry}{strike}{type}', nextExpiry: 'weekly', strikeInterval: 50 },
      { id: 2, symbolName: 'BANKNIFTY', symbolInput: 'NIFTYBANK-INDEX', tabType: 'index', optionSymbolFormat: 'NSE:BANKNIFTY{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 100 },
      { id: 3, symbolName: 'SENSEX', symbolInput: 'SENSEX-INDEX', tabType: 'index', optionSymbolFormat: 'BSE:SENSEX{expiry}{strike}{type}', nextExpiry: 'weekly', strikeInterval: 100 },
      
      // Stocks
      { id: 4, symbolName: 'RELIANCE', symbolInput: 'NSE:RELIANCE-EQ', tabType: 'stock', optionSymbolFormat: 'NSE:RELIANCE{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 50 },
      { id: 5, symbolName: 'TCS', symbolInput: 'NSE:TCS-EQ', tabType: 'stock', optionSymbolFormat: 'NSE:TCS{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 50 },
      { id: 6, symbolName: 'INFY', symbolInput: 'NSE:INFY-EQ', tabType: 'stock', optionSymbolFormat: 'NSE:INFY{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 50 },
      { id: 7, symbolName: 'HDFC', symbolInput: 'NSE:HDFCBANK-EQ', tabType: 'stock', optionSymbolFormat: 'NSE:HDFCBANK{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 50 },
      { id: 8, symbolName: 'ICICIBANK', symbolInput: 'NSE:ICICIBANK-EQ', tabType: 'stock', optionSymbolFormat: 'NSE:ICICIBANK{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 50 },
      
      // Commodities
      { id: 9, symbolName: 'GOLD', symbolInput: 'MCX:GOLD{expiry}FUT', tabType: 'commodity', optionSymbolFormat: 'MCX:GOLD{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 100 },
      { id: 10, symbolName: 'SILVER', symbolInput: 'MCX:SILVER{expiry}FUT', tabType: 'commodity', optionSymbolFormat: 'MCX:SILVER{expiry}{strike}{type}', nextExpiry: 'quarterly', strikeInterval: 100 },
      { id: 11, symbolName: 'CRUDEOIL', symbolInput: 'MCX:CRUDEOIL{expiry}FUT', tabType: 'commodity', optionSymbolFormat: 'MCX:CRUDEOIL{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 100 },
      { id: 12, symbolName: 'COPPER', symbolInput: 'MCX:COPPER{expiry}FUT', tabType: 'commodity', optionSymbolFormat: 'MCX:COPPER{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 5 },
      { id: 13, symbolName: 'NICKEL', symbolInput: 'MCX:NICKEL{expiry}FUT', tabType: 'commodity', optionSymbolFormat: 'MCX:NICKEL{expiry}{strike}{type}', nextExpiry: 'monthly', strikeInterval: 10 }
    ];
  };

  useEffect(() => {
    if (isOpen) {
      loadSymbols();
    }
  }, [isOpen]);

  const handleAddSymbol = async () => {
    if (!formData.symbolName || !formData.symbolInput) {
      window.alert('Please fill in all required fields');
      return;
    }

    try {
      const newSymbol = {
        id: Date.now(),
        ...formData
      };

      // Add to backend
      await api.post('/market/config', newSymbol);
      
      // Add to local state
      setSymbols(prev => [...prev, newSymbol]);
      
      // Reset form
      setFormData({
        symbolName: '',
        symbolInput: '',
        tabType: 'index',
        optionSymbolFormat: '{STRIKE}{TYPE}',
        nextExpiry: 'monthly', // Default to monthly expiry
        expiryDate: '',
        nearExpiryDate: '',
        strikeInterval: 50,
        lotSize: 1
      });

      // Notify parent
      onSymbolsUpdated?.();
    } catch (error) {
      console.error('Error adding symbol:', error);
      window.alert('Failed to add symbol');
    }
  };

  const handleEditSymbol = (symbol) => {
    setEditingSymbol(symbol);
    setFormData({
      symbolName: symbol.symbolName,
      symbolInput: symbol.symbolInput,
      tabType: symbol.tabType,
      optionSymbolFormat: symbol.optionSymbolFormat,
      nextExpiry: symbol.nextExpiry,
      expiryDate: symbol.expiryDate || '',
      nearExpiryDate: symbol.nearExpiryDate || '',
      strikeInterval: symbol.strikeInterval,
      lotSize: symbol.lotSize || 1
    });
  };

  const handleUpdateSymbol = async (symbol) => {
    // Add debug log
    console.log('Updating symbol:', symbol);
    if (!symbol._id) {
      window.showToast('Symbol _id is missing. Cannot update.', 'error');
      return;
    }
    try {
      const updatedSymbol = {
        ...symbol,
        ...formData
      };

      // Update in backend
      await api.put(`/market/config/${symbol._id}`, updatedSymbol);
      
      // Update in local state
      setSymbols(prev => prev.map(s => s._id === symbol._id ? updatedSymbol : s));
      
      // Reset form and editing state
      setEditingSymbol(null);
      setFormData({
        symbolName: '',
        symbolInput: '',
        tabType: 'index',
        optionSymbolFormat: '',
        nextExpiry: 'monthly', // Default to monthly expiry
        expiryDate: '',
        nearExpiryDate: '',
        strikeInterval: 50,
        lotSize: 1
      });

      // Notify parent
      onSymbolsUpdated?.();
    } catch (error) {
      console.error('Error updating symbol:', error);
      window.alert('Failed to update symbol');
    }
  };

  const handleDeleteSymbol = async (symbolId) => {
    if (!window.confirm('Are you sure you want to delete this symbol?')) return;

    try {
      // Delete from backend
      await api.delete(`/market/config/${symbolId}`);
      
      // Remove from local state
      setSymbols(prev => prev.filter(s => s._id !== symbolId));

      // Notify parent
      onSymbolsUpdated?.();
    } catch (error) {
      console.error('Error deleting symbol:', error);
      window.alert('Failed to delete symbol');
    }
  };

  const handleCancelEdit = () => {
    setEditingSymbol(null);
          setFormData({
        symbolName: '',
        symbolInput: '',
        tabType: 'index',
        optionSymbolFormat: '',
        nextExpiry: 'monthly', // Default to monthly expiry
        expiryDate: '',
        nearExpiryDate: '',
        strikeInterval: 50,
        lotSize: 1
      });
  };

  const getTabTypeLabel = (type) => {
    const labels = {
      'index': 'Indices',
      'stock': 'Stocks',
      'commodity': 'Commodities'
    };
    return labels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700/50 w-full max-w-[95vw] max-h-[98vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-white">Symbol Management</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  // Clean the symbols data - remove id fields and ensure all required fields are present
                  const cleanSymbols = symbols.map(symbol => ({
                    symbolName: symbol.symbolName,
                    symbolInput: symbol.symbolInput,
                    tabType: symbol.tabType,
                    optionSymbolFormat: symbol.optionSymbolFormat || '',
                    nextExpiry: symbol.nextExpiry || 'monthly',
                    expiryDate: symbol.expiryDate || '',
                    nearExpiryDate: symbol.nearExpiryDate || '',
                    strikeInterval: symbol.strikeInterval || 50,
                    lotSize: symbol.lotSize || 1
                  }));
                  
                  console.log('Sending cleaned symbols to backend:', cleanSymbols);
                  await api.post('/market/config/bulk', { symbols: cleanSymbols });
                  window.alert('All symbols saved to database!');
                  onSymbolsUpdated?.();
                  onClose();
                } catch (error) {
                  console.error('Error saving symbols:', error);
                  window.alert('Failed to save symbols!');
                }
              }}
              className="px-4 py-1 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors font-semibold text-sm"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors font-semibold text-sm"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex h-[calc(98vh-70px)]">
          {/* Add Symbol Section - 25% width */}
          <div className="w-1/4 p-3 border-r border-slate-700/50 overflow-y-auto">
            <h3 className="text-base font-semibold text-white mb-2">
              {editingSymbol ? 'Edit Symbol' : 'Add Spot/Underlying'}
            </h3>
            
            <div className="space-y-2">
              {/* All labels and inputs: smaller font, less padding */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Symbol Name
                </label>
                <input
                  type="text"
                  value={formData.symbolName}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbolName: e.target.value }))}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand"
                  placeholder="e.g., NIFTY, RELIANCE"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Symbol Input
                </label>
                <input
                  type="text"
                  value={formData.symbolInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbolInput: e.target.value }))}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand"
                  placeholder="e.g., NSE:NIFTY50-INDEX"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tab Type
                </label>
                <select
                  value={formData.tabType}
                  onChange={(e) => setFormData(prev => ({ ...prev, tabType: e.target.value }))}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-brand"
                >
                  <option value="index">Indices</option>
                  <option value="stock">Stocks</option>
                  <option value="commodity">Commodities</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Option Symbol Format
                </label>
                <input
                  type="text"
                  value={formData.optionSymbolFormat}
                  onChange={(e) => setFormData(prev => ({ ...prev, optionSymbolFormat: e.target.value }))}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand"
                  placeholder="e.g., NSE:NIFTY{expiry}{strike}{type}"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Next Expiry
                </label>
                <select
                  value={formData.nextExpiry}
                  onChange={(e) => setFormData(prev => ({ ...prev, nextExpiry: e.target.value }))}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-brand"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="custom">Custom Date</option>
                  <option value="none">No Expiry</option>
                </select>
              </div>

              {/* Always show Near Expiry Date picker */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Near Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.nearExpiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, nearExpiryDate: e.target.value }))}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-brand"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-slate-400 mt-1">Set the actual expiry date for the current cycle (e.g., this week's Thursday or Friday)</p>
              </div>

              {formData.nextExpiry === 'custom' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-brand"
                    min={new Date().toISOString().split('T')[0]} // Don't allow past dates
                  />
                  <p className="text-xs text-slate-400 mt-1">Select the specific expiry date for this symbol</p>
                </div>
              )}

              {formData.nextExpiry === 'none' && (
                <div>
                  <p className="text-xs text-slate-400 mt-1">This symbol has no expiry (e.g., stocks)</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Strike Interval
                </label>
                <input
                  type="number"
                  value={formData.strikeInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, strikeInterval: parseInt(e.target.value) || 50 }))}
                  className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-brand"
                  min="1"
                />
              </div>

              <div className="col-span-1">
                <label htmlFor="lot-size" className="block text-xs font-medium text-slate-400 mb-1">Lot Size</label>
                <input
                  type="number"
                  id="lot-size"
                  name="lotSize"
                  min="1"
                  value={formData.lotSize}
                  onChange={e => setFormData({ ...formData, lotSize: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-md border border-slate-600 bg-slate-800 text-white px-2 py-1 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-4">
                {editingSymbol ? (
                  <>
                    <button
                      onClick={() => handleUpdateSymbol(editingSymbol)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Update
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAddSymbol}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Symbol
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Symbols Table - 75% width */}
          <div className="w-3/4 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Current Symbols</h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Symbol Name</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Symbol Input</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Tab Type</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Option Format</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Next Expiry</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Expiry Date</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Near Expiry Date</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Strike Interval</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Lot Size</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map((symbol) => (
                      <tr key={symbol._id || symbol.symbolName} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                        <td className="py-3 px-4 text-white font-medium">{symbol.symbolName}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-xs">{symbol.symbolInput}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-600 text-white">
                            {getTabTypeLabel(symbol.tabType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-xs">{symbol.optionSymbolFormat}</td>
                        <td className="py-3 px-4 text-slate-300">{symbol.nextExpiry}</td>
                        <td className="py-3 px-4 text-slate-300">{symbol.expiryDate || '-'}</td>
                        <td className="py-3 px-4 text-slate-300">{symbol.nearExpiryDate || '-'}</td>
                        <td className="py-3 px-4 text-slate-300">{symbol.strikeInterval}</td>
                        <td className="py-3 px-4 text-slate-300">{symbol.lotSize}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditSymbol(symbol)}
                              className="p-1 text-slate-400 hover:text-brand transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSymbol(symbol._id)}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymbolSettingsModal; 