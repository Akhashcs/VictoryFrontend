import React from 'react';

const MonitoringPreview = ({ ceHMA, peHMA, ceSymbol, peSymbol, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-5 bg-slate-700 rounded w-full"></div>
          <div className="h-5 bg-slate-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">HMA Preview</h3>
      <div className="space-y-3">
        <HMALineItem label="CE HMA" symbol={ceSymbol} hma={ceHMA} />
        <HMALineItem label="PE HMA" symbol={peSymbol} hma={peHMA} />
      </div>
    </div>
  );
};

const HMALineItem = ({ label, symbol, hma }) => (
  <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-md">
    <div>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className="text-xs text-slate-500">{symbol || 'Not selected'}</p>
    </div>
    <p className="text-lg font-bold text-brand">
      {hma ? `₹${hma.toFixed(2)}` : '--'}
    </p>
  </div>
);

export default MonitoringPreview; 