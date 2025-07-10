import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import BacktestService from '../../services/backtestService';

// Strategy templates (can be extended)
const STRATEGIES = [
  {
    key: 'hma',
    label: 'HMA Strategy',
    description: 'Hull Moving Average based strategy',
    params: [
      { name: 'hmaPeriod', label: 'HMA Length', type: 'number', default: 55, min: 1, max: 200 },
      { name: 'targetType', label: 'Target Type', type: 'select', options: [
        { value: 'points', label: 'Points' },
        { value: 'percentage', label: 'Percentage' }
      ], default: 'points' },
      { name: 'target', label: 'Target', type: 'number', default: 50, min: 1 },
      { name: 'stopLossType', label: 'Stop Loss Type', type: 'select', options: [
        { value: 'points', label: 'Points' },
        { value: 'percentage', label: 'Percentage' }
      ], default: 'points' },
      { name: 'stopLoss', label: 'Stop Loss', type: 'number', default: 30, min: 1 },
      { name: 'interval', label: 'Candle Interval', type: 'select', options: [
        { value: '1', label: '1 minute' },
        { value: '5', label: '5 minutes' },
        { value: '15', label: '15 minutes' },
        { value: '30', label: '30 minutes' },
        { value: '60', label: '1 hour' },
        { value: 'D', label: 'Daily' }
      ], default: '5' },
      { name: 'maxReEntries', label: 'Re-entry Times', type: 'number', default: 1, min: 0, max: 10 },
      { name: 'useTrailingStoploss', label: 'Trailing Stoploss', type: 'checkbox', default: false },
      { name: 'trailSlToCost', label: 'Trail SL to Entry', type: 'checkbox', default: false },
    ],
  },
  // Future: Hull Suite, etc.
  // {
  //   key: 'hull_suite',
  //   label: 'Hull Suite Strategy',
  //   description: 'Combination of HMA 55 & HMA 9',
  //   params: [
  //     { name: 'hma55', label: 'HMA 55 Length', type: 'number', default: 55 },
  //     { name: 'hma9', label: 'HMA 9 Length', type: 'number', default: 9 },
  //     // ... other params
  //   ],
  // },
];

// Helper to get default start date as 9:15 AM IST (3 days before today)
function getDefaultStartDateIST() {
  const now = new Date();
  // Use 3 days ago for better data availability
  const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
  // Set to 9:15 AM IST
  threeDaysAgo.setHours(9, 15, 0, 0);
  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const year = threeDaysAgo.getFullYear();
  const month = String(threeDaysAgo.getMonth() + 1).padStart(2, '0');
  const day = String(threeDaysAgo.getDate()).padStart(2, '0');
  const hours = String(threeDaysAgo.getHours()).padStart(2, '0');
  const minutes = String(threeDaysAgo.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper to get default end date as 3:30 PM IST (same day as start)
function getDefaultEndDateIST() {
  const now = new Date();
  
  // Get today's date in IST
  const today = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)); // Convert to IST
  
  // Check if market is currently open (9:15 AM to 3:30 PM IST)
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  const marketOpen = 9 * 60 + 15; // 9:15 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM
  
  let endHour, endMinute;
  
  if (currentTime >= marketOpen && currentTime < marketClose) {
    // Market is open - set to current time rounded down to nearest 5 minutes
    const roundedMinutes = Math.floor(currentMinute / 5) * 5;
    endHour = currentHour;
    endMinute = roundedMinutes;
  } else {
    // Market is closed or not yet open - set to 3:30 PM
    endHour = 15;
    endMinute = 30;
  }
  
  // Set the time
  today.setHours(endHour, endMinute, 0, 0);
  
  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const hours = String(today.getHours()).padStart(2, '0');
  const minutes = String(today.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper to convert local datetime to UTC ISO string for backend
function toUTCISOString(localDateString) {
  if (!localDateString) return '';
  
  // The frontend sends dates in IST format (YYYY-MM-DDTHH:mm)
  // The backend expects IST dates and converts them to UTC internally
  // So we should send the date as-is, not convert to UTC here
  
  // Parse the local datetime string (which is in IST)
  const localDate = new Date(localDateString);
  
  // Format as IST string for backend
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  
  // Return in IST format (YYYY-MM-DDTHH:mm)
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const getDefaultParams = (strategyKey) => {
  const strategy = STRATEGIES.find(s => s.key === strategyKey);
  const params = {};
  if (strategy) {
    strategy.params.forEach(p => {
      params[p.name] = p.default;
    });
  }
  return params;
};

const BacktestZone = () => {
  const [strategyKey, setStrategyKey] = useState('hma');
  const [formData, setFormData] = useState({
    // Strategy selection
    strategy: 'hma',
    
    // Symbol and quantity
    symbol: 'BSE:SENSEX-INDEX',
    quantity: 1,
    
    // Time and date
    startDate: getDefaultStartDateIST(),
    endDate: getDefaultEndDateIST(),
    
    // Strategy parameters (will be populated based on strategy)
    ...getDefaultParams('hma'),
  });

  const [loading, setLoading] = useState(false);
  const [historicalData, setHistoricalData] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [savedBacktests, setSavedBacktests] = useState([]);

  const currentStrategy = STRATEGIES.find(s => s.key === strategyKey);

  // Load saved backtests on component mount
  useEffect(() => {
    loadSavedBacktests();
  }, []);

  // Handle strategy change
  const handleStrategyChange = (e) => {
    const key = e.target.value;
    setStrategyKey(key);
    setFormData(prev => ({
      ...prev,
      strategy: key,
      ...getDefaultParams(key)
    }));
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle strategy parameter changes
  const handleParamChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate time constraints
  const validateTimeConstraints = () => {
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const now = new Date();
    
    // Check if dates are in the future
    if (startDate > now) {
      toast.error('Start date cannot be in the future. Please select a past date.');
      return false;
    }
    
    if (endDate > now) {
      toast.error('End date cannot be in the future. Please select a past date.');
      return false;
    }
    
    if (startDate >= endDate) {
      toast.error('Start date must be before end date');
      return false;
    }

    // Check if the date range is too old (more than 6 months)
    const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    if (startDate < sixMonthsAgo) {
      toast.error('Start date cannot be more than 6 months ago. Please select a more recent date for better data availability.');
      return false;
    }

    // Allow recent dates (within 24 hours) since backend handles prefill
    // The backend will automatically fetch prefill data for HMA calculations

    // Check time constraints (9:15 AM to 3:30 PM IST)
    const startHour = startDate.getHours();
    const startMinute = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinute = endDate.getMinutes();

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    const marketOpen = 9 * 60 + 15; // 9:15 AM
    const marketClose = 15 * 60 + 30; // 3:30 PM

    if (startTime < marketOpen || startTime > marketClose) {
      toast.error('Start time must be between 9:15 AM and 3:30 PM IST');
      return false;
    }

    if (endTime < marketOpen || endTime > marketClose) {
      toast.error('End time must be between 9:15 AM and 3:30 PM IST');
      return false;
    }

    return true;
  };

  // Fetch historical data
  const fetchHistoricalData = async () => {
    if (!formData.symbol.trim()) {
      toast.error('Please enter a symbol');
      return;
    }

    if (!validateTimeConstraints()) {
      return;
    }

    setLoading(true);
    try {
      const startDateUTC = toUTCISOString(formData.startDate);
      const endDateUTC = toUTCISOString(formData.endDate);
      
      console.log('🚀 Fetching historical data with params:');
      console.log('  Symbol:', formData.symbol);
      console.log('  Start Date (form):', formData.startDate);
      console.log('  End Date (form):', formData.endDate);
      console.log('  Start Date (UTC):', startDateUTC);
      console.log('  End Date (UTC):', endDateUTC);
      console.log('  Interval:', formData.interval);
      console.log('  HMA Period:', formData.hmaPeriod);
      
      const response = await BacktestService.fetchHistoricalData({
        symbol: formData.symbol,
        startDate: startDateUTC,
        endDate: endDateUTC,
        interval: formData.interval,
        hmaPeriod: formData.hmaPeriod
      });

      if (response.success) {
        setHistoricalData(response.data);
        toast.success(`Fetched ${response.data.count} candles for ${response.data.symbol}`);
      } else {
        toast.error(response.message || 'Failed to fetch historical data');
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      toast.error('Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };

  // Execute backtest
  const executeBacktest = async () => {
    if (!historicalData) {
      toast.error('Please fetch historical data first');
      return;
    }

    setLoading(true);
    try {
      const response = await BacktestService.executeBacktest({
        ...formData,
        startDate: toUTCISOString(formData.startDate),
        endDate: toUTCISOString(formData.endDate),
        candles: historicalData.candles // Include the candles array
      });

      if (response.success) {
        setBacktestResults(response.data);
        toast.success('Backtest executed successfully');
      } else {
        toast.error(response.message || 'Failed to execute backtest');
      }
    } catch (error) {
      console.error('Error executing backtest:', error);
      toast.error('Failed to execute backtest');
    } finally {
      setLoading(false);
    }
  };

  // Save backtest
  const saveBacktest = async () => {
    if (!backtestResults) {
      toast.error('No backtest results to save');
      return;
    }

    if (!saveName.trim()) {
      toast.error('Please enter a name for the backtest');
      return;
    }

    setLoading(true);
    try {
      const response = await BacktestService.saveBacktest({
        name: saveName,
        ...formData,
        startDate: toUTCISOString(formData.startDate),
        endDate: toUTCISOString(formData.endDate),
        results: backtestResults
      });

      if (response.success) {
        toast.success('Backtest saved successfully');
        setShowSaveModal(false);
        setSaveName('');
        // Reload saved backtests
        loadSavedBacktests();
      } else {
        toast.error(response.message || 'Failed to save backtest');
      }
    } catch (error) {
      console.error('Error saving backtest:', error);
      toast.error('Failed to save backtest');
    } finally {
      setLoading(false);
    }
  };

  // Load saved backtests
  const loadSavedBacktests = async () => {
    try {
      const response = await BacktestService.getSavedBacktests();
      if (response.success) {
        setSavedBacktests(response.data);
      } else {
        console.error('Failed to load saved backtests:', response.message);
      }
    } catch (error) {
      console.error('Error loading saved backtests:', error);
    }
  };

  // Load backtest details
  const loadBacktestDetails = async (id) => {
    try {
      const response = await BacktestService.getBacktestDetails(id);
      if (response.success) {
        const backtest = response.data;
        
        // Update form data with saved backtest details
        setFormData(prev => ({
          ...prev,
          strategy: backtest.strategy,
          symbol: backtest.symbol,
          quantity: backtest.quantity,
          startDate: backtest.startDate,
          endDate: backtest.endDate,
          hmaPeriod: backtest.hmaPeriod,
          target: backtest.target,
          stopLoss: backtest.stopLoss,
          targetType: backtest.targetType || 'points',
          stopLossType: backtest.stopLossType || 'points',
          interval: backtest.interval || '5',
          maxReEntries: backtest.maxReEntries || 1,
          useTrailingStoploss: backtest.useTrailingStoploss || false,
          trailSlToCost: backtest.trailSlToCost || false,
        }));
        
        setStrategyKey(backtest.strategy);
        setBacktestResults(backtest.results);
        setHistoricalData({
          symbol: backtest.symbol,
          count: backtest.results?.trades?.length || 0,
          startDate: backtest.startDate,
          endDate: backtest.endDate
        });
        
        toast.success('Backtest loaded successfully');
      } else {
        toast.error(response.message || 'Failed to load backtest details');
      }
    } catch (error) {
      console.error('Error loading backtest details:', error);
      toast.error('Failed to load backtest details');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format duration
  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Layout - 1/4 for saved strategies, 3/4 for backtest parameters */}
        <div className="flex gap-6">
          {/* Saved Strategies List - 1/4 width */}
          <div className="w-1/4">
            <div className="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Saved Strategies</h2>
              
              {savedBacktests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-slate-400 text-6xl mb-4">📊</div>
                  <p className="text-slate-400 text-sm mb-2">No saved backtests yet</p>
                  <p className="text-slate-500 text-xs">Run a backtest and save it to see it here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {savedBacktests.map((backtest) => (
                    <div key={backtest._id} className="border border-slate-600 rounded-lg p-3 hover:bg-slate-700 cursor-pointer transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm text-white truncate">{backtest.name}</h4>
                        <button
                          onClick={() => loadBacktestDetails(backtest._id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Load
                        </button>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Strategy:</span>
                          <span className="text-white font-medium">{backtest.strategy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Symbol:</span>
                          <span className="text-white font-medium truncate">{backtest.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Signals:</span>
                          <span className="text-white font-medium">{backtest.kpis?.entrySignals || backtest.kpis?.totalTrades || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Completed:</span>
                          <span className="text-white font-medium">{backtest.kpis?.completedTrades || backtest.kpis?.totalTrades || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Win Rate:</span>
                          <span className="text-white font-medium">{backtest.kpis?.winRate || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">PnL:</span>
                          <span className={`font-medium ${(backtest.kpis?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ₹{backtest.kpis?.totalPnL || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Created:</span>
                          <span className="text-white font-medium text-xs">{formatDate(backtest.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Backtest Parameters - 3/4 width */}
          <div className="w-3/4">
            {/* Backtest Form */}
            <div className="bg-slate-800 rounded-lg shadow-md p-6 mb-8 border border-slate-700">
              <h2 className="text-xl font-semibold mb-6 text-white">Backtest Parameters</h2>
              
              {/* Symbol and Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="e.g., NSE:NIFTY2571025350CE, NSE:RELIANCE-EQ"
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white placeholder-slate-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min={1}
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Time and Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date & Time (IST) *
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    End Date & Time (IST) *
                  </label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                  />
                </div>
              </div>
              
              {/* Date selection help */}
              <div className="mb-6 p-3 bg-slate-700 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-300">
                  💡 <strong>Date Selection Tips:</strong> You can select any past date within 6 months. 
                  For single-day backtests, the system automatically fetches prefill data from previous days for accurate HMA calculations. 
                  Market hours: 9:15 AM - 3:30 PM IST.
                </p>
              </div>

              {/* Strategy Parameters */}
              {currentStrategy && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-white">Strategy Parameters</h3>
                  
                  {/* Prefill info */}
                  <div className="mb-4 p-3 bg-blue-900/20 rounded-lg border border-blue-700/50">
                    <p className="text-xs text-blue-300">
                      🔄 <strong>Prefill Data:</strong> The system automatically fetches {formData.hmaPeriod} additional candles 
                      from before your start date to ensure accurate HMA calculations. 
                      Total data fetched: {formData.hmaPeriod} prefill + your selected period.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Strategy and HMA Length on first row */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Strategy *
                      </label>
                      <select
                        value={strategyKey}
                        onChange={handleStrategyChange}
                        className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                      >
                        {STRATEGIES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                      {currentStrategy && (
                        <p className="text-sm text-slate-400 mt-1">{currentStrategy.description}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        HMA Length
                      </label>
                      <input
                        type="number"
                        name="hmaPeriod"
                        value={formData.hmaPeriod}
                        onChange={handleInputChange}
                        min={1}
                        max={200}
                        className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Candle Interval
                      </label>
                      <select
                        name="interval"
                        value={formData.interval}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                      >
                        <option value="1">1 minute</option>
                        <option value="5">5 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="D">Daily</option>
                      </select>
                    </div>
                    
                    {/* Checkbox options */}
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="useTrailingStoploss"
                          checked={formData.useTrailingStoploss}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        <span className="text-slate-300">Trailing Stoploss</span>
                      </label>
                    </div>
                    
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="trailSlToCost"
                          checked={formData.trailSlToCost}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        <span className="text-slate-300">Trail SL to Entry</span>
                      </label>
                    </div>
                    
                    {/* Target and Stop Loss with Type Selection */}
                    <div className="md:col-span-3">
                      <div className="grid grid-cols-4 gap-4">
                        {/* Target Type */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Target Type
                          </label>
                          <select
                            name="targetType"
                            value={formData.targetType}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                          >
                            <option value="points">Points</option>
                            <option value="percentage">Percentage</option>
                          </select>
                        </div>
                        
                        {/* Target Value */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Target ({formData.targetType === 'percentage' ? '%' : 'Points'})
                          </label>
                          <input
                            type="number"
                            name="target"
                            value={formData.target}
                            onChange={handleInputChange}
                            min={1}
                            max={formData.targetType === 'percentage' ? 100 : 1000}
                            className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                          />
                        </div>
                        
                        {/* Stop Loss Type */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Stop Loss Type
                          </label>
                          <select
                            name="stopLossType"
                            value={formData.stopLossType}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                          >
                            <option value="points">Points</option>
                            <option value="percentage">Percentage</option>
                          </select>
                        </div>
                        
                        {/* Stop Loss Value */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Stop Loss ({formData.stopLossType === 'percentage' ? '%' : 'Points'})
                          </label>
                          <input
                            type="number"
                            name="stopLoss"
                            value={formData.stopLoss}
                            onChange={handleInputChange}
                            min={1}
                            max={formData.stopLossType === 'percentage' ? 100 : 1000}
                            className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white"
                          />
                        </div>
                      </div>
                      
                      {/* Help text for percentage examples */}
                      {(formData.targetType === 'percentage' || formData.stopLossType === 'percentage') && (
                        <div className="mt-2 text-xs">
                          {formData.targetType === 'percentage' && (
                            <span className="text-green-400 mr-4">Target: 10% on ₹200 = ₹220 target</span>
                          )}
                          {formData.stopLossType === 'percentage' && (
                            <span className="text-red-400">Stop Loss: 5% on ₹200 = ₹190 stop loss</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={fetchHistoricalData}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Fetching...' : 'Get Data'}
                </button>
                
                <button
                  onClick={executeBacktest}
                  disabled={loading || !historicalData}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Executing...' : 'Execute Backtest'}
                </button>
              </div>
            </div>

            {/* Historical Data Summary */}
            {historicalData && (
              <div className="bg-slate-800 rounded-lg shadow-md p-6 mb-8 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-white">Historical Data Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-blue-400 font-medium">Symbol</div>
                    <div className="text-lg font-semibold text-white">{historicalData.symbol}</div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-green-400 font-medium">Candles</div>
                    <div className="text-lg font-semibold text-white">{historicalData.count}</div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-yellow-400 font-medium">Start Date</div>
                    <div className="text-sm font-semibold text-white">{formatDate(historicalData.startDate)}</div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-purple-400 font-medium">End Date</div>
                    <div className="text-sm font-semibold text-white">{formatDate(historicalData.endDate)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Backtest Results */}
            {backtestResults && (
              <div className="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-white">Backtest Results</h2>
                
                {/* Trade Count Explanation */}
                <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-700/50">
                  <div className="flex items-start space-x-3">
                    <div className="text-blue-400 text-xl">💡</div>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-300 mb-1">Trade Count Explanation</h4>
                      <p className="text-xs text-blue-200">
                        <strong>Entry Signals:</strong> Number of HMA crossover signals (same regardless of target/stop loss). 
                        <strong>Completed Trades:</strong> Number of trades that hit target, stop loss, or end of day (3:20 PM IST). 
                        This varies based on your target/stop loss settings - tighter targets = more completed trades, 
                        wider targets = fewer completed trades (more exit at end of day).
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-blue-400 font-medium">Entry Signals</div>
                    <div className="text-2xl font-bold text-white">{backtestResults.entrySignals || backtestResults.totalTrades}</div>
                    <div className="text-xs text-slate-400 mt-1">HMA Crossovers</div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-green-400 font-medium">Completed Trades</div>
                    <div className="text-2xl font-bold text-white">{backtestResults.completedTrades || backtestResults.totalTrades}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {backtestResults.openTrades > 0 ? `${backtestResults.openTrades} open` : 'All closed'}
                    </div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-yellow-400 font-medium">Win Rate</div>
                    <div className="text-2xl font-bold text-white">{backtestResults.winRate.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="text-sm text-purple-400 font-medium">Total PnL</div>
                    <div className={`text-2xl font-bold ${backtestResults.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{backtestResults.totalPnL.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Strategy Parameters */}
                <div className="bg-slate-700 p-4 rounded-lg mb-6 border border-slate-600">
                  <h3 className="text-lg font-semibold mb-2 text-white">Strategy Parameters</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-slate-400">Strategy:</span>
                      <span className="ml-2 font-medium text-white">{currentStrategy?.label}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-400">Symbol:</span>
                      <span className="ml-2 font-medium text-white">{backtestResults.symbol}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-400">Quantity:</span>
                      <span className="ml-2 font-medium text-white">{backtestResults.quantity}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-400">HMA Period:</span>
                      <span className="ml-2 font-medium text-white">{backtestResults.hmaPeriod}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-400">Target:</span>
                      <span className="ml-2 font-medium text-white">{backtestResults.target} points</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-400">Stop Loss:</span>
                      <span className="ml-2 font-medium text-white">{backtestResults.stopLoss} points</span>
                    </div>
                  </div>
                </div>

                {/* Trades Table */}
                {backtestResults.trades && backtestResults.trades.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-white">Trade Details</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-slate-800 border border-slate-600">
                        <thead>
                          <tr className="bg-slate-700">
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Entry</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Exit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Entry Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Exit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">PnL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Duration</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-600">
                          {backtestResults.trades.map((trade, index) => (
                            <tr key={index} className="hover:bg-slate-700">
                              <td className="px-4 py-2 text-sm text-white">{formatDate(trade.entryTime)}</td>
                              <td className="px-4 py-2 text-sm text-white">{formatDate(trade.exitTime)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-white">₹{trade.entryPrice.toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm font-medium text-white">₹{trade.exitPrice.toFixed(2)}</td>
                              <td className={`px-4 py-2 text-sm font-medium ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ₹{trade.pnl.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-sm text-white">{formatDuration(trade.duration)}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  trade.exitReason === 'TARGET' ? 'bg-green-900 text-green-300' :
                                  trade.exitReason === 'STOP_LOSS' ? 'bg-red-900 text-red-300' :
                                  trade.exitReason === 'END_OF_DAY' ? 'bg-orange-900 text-orange-300' :
                                  'bg-slate-600 text-slate-300'
                                }`}>
                                  {trade.exitReason === 'END_OF_DAY' ? 'END OF DAY' : trade.exitReason.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Save Backtest Button */}
                <div className="mt-6">
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Save Backtest
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Backtest Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-white">Save Backtest</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Backtest Name *
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Enter a name for this backtest"
                  className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white placeholder-slate-400"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={saveBacktest}
                  disabled={loading || !saveName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setSaveName('');
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 text-slate-300 rounded-md hover:bg-slate-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestZone; 