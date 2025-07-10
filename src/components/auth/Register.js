import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Register = () => {
  const { register, error, setError } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState({});
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const validate = () => {
    const errors = {};
    if (!form.fullName) {
      errors.fullName = 'Full name is required';
    }
    if (!form.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Invalid email format';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError({ ...formError, [e.target.name]: undefined });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormError(errors);
      return;
    }
    setLoading(true);
    const result = await register(form.fullName, form.email, form.password, form.confirmPassword);
    setLoading(false);
    if (result.success) {
      setSuccess('Account created successfully! Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Victory</h1>
          <p className="text-slate-400">Join the ultimate trading platform</p>
        </div>
        
        <div className="card">
          <h2 className="text-2xl font-semibold mb-6 text-center text-white">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="input-field"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
                disabled={loading}
              />
              {formError.fullName && <div className="error-message">{formError.fullName}</div>}
            </div>
            
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
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />
              {formError.password && <div className="error-message">{formError.password}</div>}
            </div>
            
            <div>
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="input-field"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />
              {formError.confirmPassword && <div className="error-message">{formError.confirmPassword}</div>}
            </div>
            
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <div className="error-message text-center">{error}</div>
              </div>
            )}
            
            {success && (
              <div className="p-3 bg-emerald-900/50 border border-emerald-700 rounded-lg">
                <div className="success-message text-center">{success}</div>
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
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 