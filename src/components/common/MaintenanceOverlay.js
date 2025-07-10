import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import FyersService from '../../services/fyersService';

const MaintenanceOverlay = ({ isVisible, onClose }) => {
  const [maintenanceInfo, setMaintenanceInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        setLoading(true);
        const response = await FyersService.getMaintenanceStatus();
        setMaintenanceInfo(response.maintenance);
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isVisible) {
      fetchMaintenanceStatus();
      // Refresh every minute
      const interval = setInterval(fetchMaintenanceStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            <span className="ml-3 text-slate-300">Checking maintenance status...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!maintenanceInfo?.inMaintenance) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">
          Fyers Maintenance Window
        </h2>

        {/* Description */}
        <p className="text-slate-400 mb-6">
          Fyers is currently undergoing scheduled maintenance. Trading services will be unavailable during this period.
        </p>

        {/* Time Info */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <span className="text-orange-400 font-semibold">Maintenance Active</span>
          </div>
          <div className="text-sm text-slate-300">
            <div>Ends at: <span className="font-mono text-white">{maintenanceInfo.endTime}</span></div>
            <div className="mt-1">Time remaining: <span className="font-mono text-orange-400">{maintenanceInfo.timeUntilEnd}</span></div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <div className="text-blue-400 font-semibold text-sm mb-1">What to expect:</div>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• You'll need to re-authenticate after 8:00 AM</li>
                <li>• All existing connections will be cleared</li>
                <li>• Market data will resume after maintenance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          I Understand
        </button>

        {/* Auto-refresh notice */}
        <p className="text-xs text-slate-500 mt-4">
          This overlay will automatically update every minute
        </p>
      </div>
    </div>
  );
};

export default MaintenanceOverlay; 