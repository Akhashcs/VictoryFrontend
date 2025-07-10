import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const IndexCard = ({ data, loading = false, index = 0, compact = false }) => {
  if (loading) {
    return (
      <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-700 rounded w-32"></div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-slate-700 rounded w-24"></div>
            <div className="h-6 bg-slate-700 rounded w-16"></div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-4 border-t border-slate-700">
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.spotData) {
    return (
      <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center min-h-[260px]">
        <div className="text-center text-slate-500">
          <svg className="w-10 h-10 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">No data available</p>
        </div>
      </div>
    );
  }

  const { indexName, spotData } = data;

  const getDisplayName = (indexName) => {
    const nameMap = {
      'NIFTY': 'NIFTY 50',
      'BANKNIFTY': 'BANK NIFTY',
      'SENSEX': 'SENSEX'
    };
    return nameMap[indexName] || indexName;
  };

  const formatNumber = (num, isChange = false) => {
    if (num === null || num === undefined) return '--';
    const rounded = Math.round(num * 100) / 100;
    const formatted = new Intl.NumberFormat('en-IN').format(rounded);
    if (isChange && rounded > 0) return `+${formatted}`;
    return formatted;
  };

  const formatPercentage = (num) => {
    if (num === null || num === undefined) return '--';
    const formatted = num.toFixed(2);
    if (num > 0) return `+${formatted}%`;
    return `${formatted}%`;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getTrendIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return null;
  };

  // Compact version
  if (compact) {
    return (
      <div className={`bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 ${index === 0 ? 'mt-8' : 'mt-0 sm:mt-8'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-300 font-medium text-lg">
            {getDisplayName(indexName)}
          </span>
          <div className="flex items-center gap-1">
            {getTrendIcon(spotData?.change)}
            <span className={`text-xs font-semibold ${getChangeColor(spotData?.change)}`}>
              {formatPercentage(spotData?.changePercent)}
            </span>
          </div>
        </div>

        {/* Price Section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="text-xl font-bold text-white mb-1">
              {formatNumber(spotData?.ltp)}
            </div>
            <div className={`text-xs font-semibold ${getChangeColor(spotData?.change)}`}>
              <span>{formatNumber(spotData?.change, true)}</span>
            </div>
          </div>
        </div>

        {/* OHLC Section */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-700/50">
          <OhlcItem label="Open" value={spotData?.open} compact />
          <OhlcItem label="High" value={spotData?.high} color="text-green-400" compact />
          <OhlcItem label="Low" value={spotData?.low} color="text-red-400" compact />
          <OhlcItem label="Prev. Close" value={spotData?.close} compact />
        </div>
      </div>
    );
  }

  // Original version
  return (
    <div className={`bg-slate-800/50 p-8 rounded-lg border border-slate-700/50 ${index === 0 ? 'mt-8' : 'mt-0 sm:mt-8'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-2">
        <span className="text-slate-300 font-medium text-xl">
          {getDisplayName(indexName)}
        </span>
        <div className="flex items-center gap-1">
          {getTrendIcon(spotData?.change)}
          <span className={`text-sm font-semibold ${getChangeColor(spotData?.change)}`}>
            {formatPercentage(spotData?.changePercent)}
          </span>
        </div>
      </div>

      {/* Price Section */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex-1">
          <div className="text-2xl font-bold text-white mb-1">
            {formatNumber(spotData?.ltp)}
          </div>
          <div className={`text-sm font-semibold ${getChangeColor(spotData?.change)}`}>
            <span>{formatNumber(spotData?.change, true)}</span>
          </div>
        </div>
      </div>

      {/* OHLC Section */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4 border-t border-slate-700/50">
        <OhlcItem label="Open" value={spotData?.open} />
        <OhlcItem label="High" value={spotData?.high} color="text-green-400" />
        <OhlcItem label="Low" value={spotData?.low} color="text-red-400" />
        <OhlcItem label="Prev. Close" value={spotData?.close} />
      </div>
    </div>
  );
};

const OhlcItem = ({ label, value, color = 'text-white', compact = false }) => (
  <div className="flex flex-col items-start">
    <div className={`text-xs text-slate-400 ${compact ? 'mb-0.5' : 'mb-1'}`}>{label}</div>
    <div className={`font-mono font-medium ${color} ${compact ? 'text-xs' : 'text-sm'}`}>{formatNumber(value)}</div>
  </div>
);

// Helper for formatting numbers in OhlcItem to avoid repetition
const formatNumber = (num) => {
  if (num === null || num === undefined) return '--';
  return new Intl.NumberFormat('en-IN').format(Math.round(num));
};

export default IndexCard;