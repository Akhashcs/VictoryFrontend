import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import RateLimitWarning from '../common/RateLimitWarning';
import logo from '../../assets/logo1.svg';

const Login = () => {
  const { login, error, setError } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState({});
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const errors = {};
    if (!form.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Invalid email format';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    }
    return errors;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError({ ...formError, [e.target.name]: undefined });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormError(errors);
      return;
    }
    setLoading(true);
    
    try {
      const result = await login(form.email, form.password);
      
      if (result.success) {
        // Save credentials for auto-refresh if checkbox is checked
        if (saveCredentials) {
          localStorage.setItem('fyers_email', form.email);
          localStorage.setItem('fyers_password', form.password);
          console.log('✅ Credentials saved for auto-refresh');
        } else {
          // Clear any previously saved credentials
          localStorage.removeItem('fyers_email');
          localStorage.removeItem('fyers_password');
        }
        
        navigate('/dashboard');
      } else if (result.isRateLimited) {
        setShowRateLimitWarning(true);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      {showRateLimitWarning && (
        <RateLimitWarning
          message="Too many login attempts. Please wait 15 minutes before trying again."
          onClose={() => setShowRateLimitWarning(false)}
        />
      )}
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Victory Logo" className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Victory</h1>
          <p className="text-slate-400">Welcome back to your trading dashboard</p>
        </div>
        
        <div className="card">
          <h2 className="text-2xl font-semibold mb-6 text-center text-white">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input-field"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                disabled={loading}
              />
              {formError.email && <div className="error-message">{formError.email}</div>}
            </div>
            
            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input-field"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                disabled={loading}
              />
              {formError.password && <div className="error-message">{formError.password}</div>}
            </div>
            
            {/* Save Credentials Checkbox */}
            <div className="flex items-center">
              <input
                id="saveCredentials"
                type="checkbox"
                checked={saveCredentials}
                onChange={(e) => setSaveCredentials(e.target.checked)}
                className="w-4 h-4 text-brand bg-slate-700 border-slate-600 rounded focus:ring-brand focus:ring-2"
                disabled={loading}
              />
              <label htmlFor="saveCredentials" className="ml-2 text-sm text-slate-300">
                Save credentials for auto-refresh (Fyers token expires daily at 6 AM)
              </label>
            </div>
            
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <div className="error-message text-center">{error}</div>
              </div>
            )}
            
            <button 
              type="submit" 
              className="btn-primary w-full py-3 text-lg" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 