import React from 'react';

const RiskReentry = ({ inputs, handleInputChange }) => {
  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">3. Risk & Re-entry</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="target-points" className="text-sm font-medium text-slate-400">Target (Pts)</label>
          <input
            type="number"
            id="target-points"
            name="targetPoints"
            value={inputs.targetPoints}
            onChange={(e) => handleInputChange('targetPoints', e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          />
        </div>
        <div>
          <label htmlFor="stoploss-points" className="text-sm font-medium text-slate-400">Stop Loss (Pts)</label>
          <input
            type="number"
            id="stoploss-points"
            name="stopLossPoints"
            value={inputs.stopLossPoints}
            onChange={(e) => handleInputChange('stopLossPoints', e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          />
        </div>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              name="trailSlToCost"
              checked={inputs.trailSlToCost}
              onChange={(e) => handleInputChange('trailSlToCost', e.target.checked)}
              className="h-4 w-4 text-brand bg-slate-700 border-slate-600 rounded focus:ring-brand"
            />
            Trail SL to Cost
          </label>
        </div>
        <div>
          <label htmlFor="max-reentries" className="text-sm font-medium text-slate-400">Max Re-entries per Symbol</label>
          <select
            id="max-reentries"
            name="maxReEntries"
            value={inputs.maxReEntries}
            onChange={(e) => handleInputChange('maxReEntries', e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default RiskReentry; 