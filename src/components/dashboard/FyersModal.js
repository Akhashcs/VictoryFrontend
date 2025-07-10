import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';

const DEFAULT_FORM = {
  appId: 'XJFL311ATX-100',
  secret: '3XH3ZT7OID',
  redirectUri: 'https://trade.fyers.in/api-login/redirect-uri/index.html'
};

const FyersModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState('credentials'); // 'credentials' or 'auth-code'
  const [form, setForm] = useState(DEFAULT_FORM);
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep('credentials');
      setForm(DEFAULT_FORM);
      setAuthCode('');
      setError('');
      setAuthUrl('');
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [isOpen]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/fyers/generate-auth-url', form);
      setAuthUrl(response.data.url);
      setStep('auth-code');
      
      // Open Fyers auth URL in new tab
      window.open(response.data.url, '_blank');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate auth URL');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthCodeSubmit = async (e) => {
    e.preventDefault();
    if (!authCode.trim()) {
      setError('Please enter the auth code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/fyers/authorize', {
        ...form,
        code: authCode
      });
      
      // No need to store Fyers access token in localStorage; always fetch from backend when needed
      
      onSuccess(response.data.profile);
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to authorize with Fyers');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteAuthCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAuthCode(text);
    } catch (error) {
      setError('Failed to paste from clipboard. Please paste manually.');
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              {step === 'credentials' ? 'Connect Fyers' : 'Complete Authorization'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="form-label" htmlFor="appId">Fyers App ID</label>
                <input
                  id="appId"
                  type="text"
                  className="input-field"
                  placeholder="Enter your Fyers App ID"
                  value={form.appId}
                  onChange={(e) => setForm({ ...form, appId: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="secret">Secret Key</label>
                <input
                  id="secret"
                  type="password"
                  className="input-field"
                  placeholder="Enter your secret key"
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="redirectUri">Redirect URI</label>
                <input
                  id="redirectUri"
                  type="url"
                  className="input-field"
                  placeholder="https://your-app.com/callback"
                  value={form.redirectUri}
                  onChange={(e) => setForm({ ...form, redirectUri: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <div className="error-message text-center">{error}</div>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Connecting...
                  </div>
                ) : (
                  'Connect'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthCodeSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-slate-300 text-sm">
                  Please complete the authorization in the new tab, then paste the auth code below.
                </p>
              </div>

              <div>
                <label className="form-label" htmlFor="authCode">Auth Code</label>
                <div className="relative">
                  <input
                    id="authCode"
                    type="text"
                    className="input-field pr-12"
                    placeholder="Paste the auth code here"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handlePasteAuthCode}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                  <div className="error-message text-center">{error}</div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="btn-secondary flex-1 py-3"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 py-3"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Authorizing...
                    </div>
                  ) : (
                    'Authorize'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal outside the Layout component hierarchy
  return createPortal(modalContent, document.body);
};

export default FyersModal; 