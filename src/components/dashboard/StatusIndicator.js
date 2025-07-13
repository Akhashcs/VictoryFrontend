import React from 'react';

const StatusIndicator = ({ type, status, loading = false, onRefresh }) => {
  const getStatusConfig = (type, status) => {
    const configs = {
      maintenance: {
        active: {
          label: 'Maintenance',
          color: 'orange',
          dotColor: 'bg-orange-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        }
      },
      market: {
        open: {
          label: 'Market Open',
          color: 'emerald',
          dotColor: 'bg-emerald-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        closed: {
          label: 'Market Closed',
          color: 'red',
          dotColor: 'bg-red-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        }
      },
      server: {
        running: {
          label: 'Server Running',
          color: 'emerald',
          dotColor: 'bg-emerald-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        },
        stopped: {
          label: 'Server Stopped',
          color: 'red',
          dotColor: 'bg-red-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        },
        loading: {
          label: 'Connecting...',
          color: 'blue',
          dotColor: 'bg-blue-400',
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        }
      }
    };

    return configs[type]?.[status] || {
      label: 'Unknown',
      color: 'gray',
      dotColor: 'bg-slate-400',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">
        <div className="w-3 h-3 bg-slate-600 rounded animate-pulse"></div>
        <div className="h-3 bg-slate-600 rounded w-16 animate-pulse"></div>
      </div>
    );
  }

  const config = getStatusConfig(type, status);
  const colorClasses = {
    emerald: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
    red: 'bg-red-900/50 text-red-300 border-red-700',
    gray: 'bg-slate-700 text-slate-300 border-slate-600',
    blue: 'bg-blue-900/50 text-blue-300 border-blue-700',
    orange: 'bg-orange-900/50 text-orange-300 border-orange-700'
  };

  return (
    <div className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border ${colorClasses[config.color]}`}>
      {/* Mobile: Colored dot only */}
      <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor} sm:hidden`}></div>
      
      {/* Desktop: Icon and text */}
      <div className="flex-shrink-0 hidden sm:block">
        {React.cloneElement(config.icon, { className: 'w-3 h-3' })}
      </div>
      <span className="text-xs font-medium hidden sm:inline">
        {config.label}
      </span>
      
      {type === 'server' && onRefresh && (
        <button 
          onClick={onRefresh}
          className="ml-1 text-slate-400 hover:text-white transition-colors hidden sm:block"
          title="Refresh server status"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default StatusIndicator; 