import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDown, LogOut, DollarSign, Loader2, Menu as MenuIcon, X as CloseIcon } from 'lucide-react';
import FyersModal from '../dashboard/FyersModal';
import StatusIndicator from '../dashboard/StatusIndicator';
import NotificationsIcon from '../dashboard/NotificationsIcon';
import FyersService from '../../services/fyersService';
import MarketService from '../../services/marketService';
import api, { setTokenExpirationHandler } from '../../services/api';
import logo from '../../assets/logo.svg';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [fyersModalOpen, setFyersModalOpen] = useState(false);
  const [fyersStatus, setFyersStatus] = useState({ connected: false, profileName: null });
  const [marketStatus, setMarketStatus] = useState('closed');
  const [serverStatus, setServerStatus] = useState('running');
  const [funds, setFunds] = useState(null);
  const [fundsLoading, setFundsLoading] = useState(false);
  const [fundsError, setFundsError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Set up global token expiration handler
  useEffect(() => {
    setTokenExpirationHandler(() => {
      console.log('🔄 Token expiration detected, showing modal...');
      // Handle token expiration if needed
    });

    return () => {
      setTokenExpirationHandler(null);
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadHeaderData();
    const statusInterval = setInterval(updateStatus, 10000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const loadHeaderData = async () => {
    try {
      // Load Fyers status
      try {
        const fyersData = await FyersService.getConnectionStatus();
        setFyersStatus(fyersData);
      } catch (error) {
        // Don't update state on error to keep existing state
      }

      // Load server status
      try {
        await refreshServerStatus();
      } catch (error) {
        // refreshServerStatus already handles setting the status
      }

      // Update market status
      try {
        const marketStatus = await MarketService.getMarketStatus();
        setMarketStatus(marketStatus);
      } catch (error) {
        console.error('Failed to get market status:', error);
        setMarketStatus('unknown');
      }
    } catch (error) {
      console.error('Failed to load header data:', error);
    }
  };

  const updateStatus = async () => {
    try {
      const serverHealth = await MarketService.checkServerHealth();
      setServerStatus(serverHealth);
      try {
        const marketStatus = await MarketService.getMarketStatus();
        setMarketStatus(marketStatus);
      } catch (error) {
        console.error('Failed to get market status:', error);
        setMarketStatus('unknown');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleFyersSuccess = (profile) => {
    setFyersStatus({
      connected: true,
      profileName: profile?.data?.name || 'Connected'
    });
  };

  const handleFyersDisconnect = async () => {
    try {
      await FyersService.disconnect();
      setFyersStatus({ connected: false, profileName: null });
    } catch (error) {
      console.error('Failed to disconnect Fyers:', error);
    }
  };

  // Manual refresh for server status with retry and ping
  const refreshServerStatus = async () => {
    try {
      setServerStatus('loading');
      
      // First, try to ping the server to wake it up if it's inactive
      console.log('[Header] Attempting to ping server...');
      const pingSuccess = await MarketService.pingServer();
      
      if (pingSuccess) {
        console.log('[Header] Server ping successful, checking health...');
        // Wait a moment for the server to fully wake up
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('[Header] Server ping failed, proceeding with health check...');
      }
      
      // Try up to 3 times with increasing delay
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const serverHealth = await MarketService.checkServerHealth();
          setServerStatus(serverHealth);
          console.log('[Header] Server health refreshed:', serverHealth);
          return; // Success, exit the function
        } catch (error) {
          console.log(`[Header] Server check attempt ${attempt + 1} failed:`, error);
          if (attempt < 2) {
            // Wait before retrying (1000ms, then 2000ms)
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      // If we get here, all attempts failed
      setServerStatus('stopped');
    } catch (error) {
      console.error('Failed to refresh server status:', error);
      setServerStatus('stopped');
    }
  };

  // Fetch funds when dropdown is opened
  const handleFundsDropdownOpen = async () => {
    setFundsLoading(true);
    setFundsError('');
    try {
      const data = await FyersService.getFunds();
      setFunds(data?.fund_limit || []);
    } catch (err) {
      setFundsError('Failed to fetch funds');
    } finally {
      setFundsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="w-full bg-slate-800/60 backdrop-blur-lg border-b border-slate-700/50 py-2 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Victory Logo" className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="text-white font-bold text-lg sm:text-xl tracking-tight">Victory</span>
        </div>
        <div className="hidden sm:block w-px h-6 bg-slate-600"></div>
        {/* Navigation (desktop only) */}
        <nav className="hidden sm:flex space-x-3 ml-3">
          <Link
            to="/options"
            className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              location.pathname === '/options'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            Options
          </Link>
          <Link
            to="/backtest"
            className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
              location.pathname === '/backtest'
                ? 'bg-slate-700 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            Backtest Zone
          </Link>
        </nav>
      </div>
      {/* Hamburger for mobile (extreme right) */}
      <div className="flex sm:hidden items-center ml-auto">
        <button
          className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      </div>
      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay (full page, above all content) */}
          <div className="fixed inset-0 bg-black bg-opacity-60 z-40" onClick={() => setMobileMenuOpen(false)}></div>
          {/* Drawer with its own background layer */}
          <div className="relative z-50 h-full">
            <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none" />
            <div className="relative bg-slate-800 w-64 max-w-full h-full shadow-xl p-6 flex flex-col">
              <button
                className="absolute top-4 right-4 p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
              {/* User info */}
              <div className="flex flex-col items-start gap-2 mb-8 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-lg">
                    {user?.name ? user.name[0] : <DollarSign className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-base truncate max-w-[120px]">{user?.name || 'User'}</div>
                    <div className="text-slate-400 text-xs truncate max-w-[120px]">{user?.email || ''}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center gap-2 px-3 py-1 bg-red-700 text-white rounded-md text-xs font-medium hover:bg-red-800"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
              {/* Navigation links */}
              <nav className="flex flex-col gap-2">
                <Link
                  to="/options"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/options'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Options
                </Link>
                <Link
                  to="/backtest"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/backtest'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Backtest Zone
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
      {/* Right side (status, notifications, fyers, etc.) */}
      <div className="hidden sm:flex items-center gap-2 min-w-0">
        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          <StatusIndicator type="market" status={marketStatus} />
          <StatusIndicator type="server" status={serverStatus} onRefresh={refreshServerStatus} />
        </div>
        {/* Fyers User Dropdown */}
        {fyersStatus.connected && fyersStatus.profileName && (
          <Menu as="div" className="relative">
            {({ open }) => (
              <>
                <Menu.Button
                  onClick={handleFundsDropdownOpen}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-300 text-xs font-medium hover:bg-emerald-800/70 transition-colors"
                >
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">{fyersStatus.profileName}</span>
                  <span className="sm:hidden">Funds</span>
                  <ChevronDown className="w-3 h-3 text-emerald-300" />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 focus:outline-none">
                  <div className="p-4">
                    <div className="mb-3 text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-brand" /> Available Funds
                    </div>
                    {fundsLoading ? (
                      <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin w-4 h-4" /> Loading...</div>
                    ) : fundsError ? (
                      <div className="text-red-400 text-xs">{fundsError}</div>
                    ) : (
                      <div className="space-y-2">
                        {['Available Balance', 'Utilized Amount', 'Clear Balance'].map((title) => {
                          const item = funds?.find(f => f.title === title);
                          return item ? (
                            <div key={item.id} className="flex justify-between text-xs">
                              <span className="text-slate-400">{item.title}</span>
                              <span className="text-white font-mono">₹{item.equityAmount?.toFixed(2) ?? '--'} <span className="text-slate-500">/</span> ₹{item.commodityAmount?.toFixed(2) ?? '--'}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-700 px-4 py-2 flex flex-col gap-2">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleFyersDisconnect}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm font-medium ${active ? 'bg-red-900/30 text-red-400' : 'text-red-400'}`}
                        >
                          <LogOut className="w-4 h-4" /> Logout from Fyers
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm font-medium ${active ? 'bg-slate-700/50 text-slate-200' : 'text-slate-400'}`}
                        >
                          <LogOut className="w-4 h-4" /> Logout from App
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </>
            )}
          </Menu>
        )}
        
        {/* Fyers Connect Button (if not connected) */}
        {!fyersStatus.connected && (
          <button
            onClick={() => setFyersModalOpen(true)}
            className="bg-brand hover:bg-brand-dark text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            <span className="hidden sm:inline">Connect to Fyers</span>
            <span className="sm:hidden">Connect</span>
          </button>
        )}
        
        {/* Notifications Icon */}
        <NotificationsIcon />
      </div>

      {/* Fyers Modal */}
      <FyersModal
        isOpen={fyersModalOpen}
        onClose={() => setFyersModalOpen(false)}
        onSuccess={handleFyersSuccess}
      />
    </header>
  );
};

export default Header; 