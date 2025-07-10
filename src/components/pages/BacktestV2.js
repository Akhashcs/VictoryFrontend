import React, { useState } from 'react';
import BacktestService from '../../services/backtestService';

// Strategy templates (can be extended)
const STRATEGIES = [
  {
    key: 'hma',
    label: 'HMA',
    params: [
      { name: 'hmaPeriod', label: 'HMA Length', type: 'number', default: 55 },
      { name: 'target', label: 'Target', type: 'number', default: 50 },
      { name: 'stopLoss', label: 'Stop Loss', type: 'number', default: 30 },
      { name: 'interval', label: 'Candle Interval', type: 'select', options: ['1', '5', '15', '30', '60', 'D'], default: '5' },
      { name: 'maxReEntries', label: 'Re-entry Times', type: 'number', default: 1 },
      { name: 'useTrailingStoploss', label: 'Trailing Stoploss', type: 'checkbox', default: false },
      { name: 'trailSlToCost', label: 'Trail SL to Entry', type: 'checkbox', default: false },
    ],
  },
  // Future: Hull Suite, etc.
];

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

const BacktestV2 = () => {
  const [strategyKey, setStrategyKey] = useState('hma');
  const [params, setParams] = useState(getDefaultParams('hma'));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleParamChange = (name, value) => {
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleStrategyChange = (e) => {
    const key = e.target.value;
    setStrategyKey(key);
    setParams(getDefaultParams(key));
  };

  const handleBacktest = async () => {
    setLoading(true);
    setResult(null);
    try {
      // In future, pass strategyKey to backend for strategy selection
      const payload = { strategy: strategyKey, ...params };
      const res = await BacktestService.executeBacktest(payload);
      setResult(res.data || res);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const strategy = STRATEGIES.find(s => s.key === strategyKey);

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-4">Backtest (Modular)</h1>
        <div className="mb-4">
          <label className="block text-slate-300 mb-1">Strategy</label>
          <select value={strategyKey} onChange={handleStrategyChange} className="w-full px-3 py-2 rounded bg-slate-700 text-white">
            {STRATEGIES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        {strategy && strategy.params.map(param => (
          <div className="mb-3" key={param.name}>
            <label className="block text-slate-300 mb-1">{param.label}</label>
            {param.type === 'number' && (
              <input type="number" value={params[param.name]} onChange={e => handleParamChange(param.name, e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700 text-white" />
            )}
            {param.type === 'select' && (
              <select value={params[param.name]} onChange={e => handleParamChange(param.name, e.target.value)} className="w-full px-3 py-2 rounded bg-slate-700 text-white">
                {param.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            )}
            {param.type === 'checkbox' && (
              <input type="checkbox" checked={params[param.name]} onChange={e => handleParamChange(param.name, e.target.checked)} />
            )}
          </div>
        ))}
        <button onClick={handleBacktest} disabled={loading} className="w-full py-2 mt-4 bg-blue-600 text-white rounded hover:bg-blue-700">
          {loading ? 'Running...' : 'Run Backtest'}
        </button>
        {result && (
          <div className="mt-6 bg-slate-700 p-4 rounded text-white">
            {result.error ? (
              <div className="text-red-400">Error: {result.error}</div>
            ) : (
              <pre>{JSON.stringify(result, null, 2)}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestV2; 