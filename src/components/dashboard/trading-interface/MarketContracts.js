import React from 'react';

const MarketContracts = ({ inputs, handleInputChange, handleIndexChange, strikeSymbols }) => {
  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">1. Market & Contracts</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="index" className="text-sm font-medium text-slate-400">Index</label>
          <select
            id="index"
            name="index"
            value={inputs.index.name}
            onChange={(e) => handleIndexChange(e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          >
            <option value="NIFTY">NIFTY</option>
            <option value="BANKNIFTY">BANK NIFTY</option>
            <option value="SENSEX">SENSEX</option>
          </select>
        </div>
        <div>
          <label htmlFor="ce-option" className="text-sm font-medium text-slate-400">CE Option</label>
          <select
            id="ce-option"
            name="ceOptionType"
            value={inputs.ceSymbol}
            onChange={(e) => handleInputChange('ceSymbol', e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          >
            <option value="">Select CE</option>
            {strikeSymbols.ce.map((s, i) => <option key={i} value={s.symbol}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pe-option" className="text-sm font-medium text-slate-400">PE Option</label>
          <select
            id="pe-option"
            name="peOptionType"
            value={inputs.peSymbol}
            onChange={(e) => handleInputChange('peSymbol', e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          >
            <option value="">Select PE</option>
            {strikeSymbols.pe.map((s, i) => <option key={i} value={s.symbol}>{s.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default MarketContracts; 