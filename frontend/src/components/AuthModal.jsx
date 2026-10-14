import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  
  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !loginPassword.trim()) {
      setError('Please enter your identifier and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ identifier: identifier.trim(), password: loginPassword });
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedRegNo = registrationNumber.trim().toUpperCase();

    if (!trimmedFullName || !trimmedEmail || !trimmedRegNo || !registerPassword) {
      setError('All fields are required.');
      return;
    }

    if (registerPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(registerPassword) || !/[0-9]/.test(registerPassword)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    try {
      setSubmitting(true);
      await register({
        fullName: trimmedFullName,
        email: trimmedEmail,
        regNo: trimmedRegNo,
        password: registerPassword,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card-elevated rounded-3xl w-full max-w-md overflow-hidden border border-white/40 dark:border-white/10 shadow-2xl transition-all duration-300 transform scale-100">
        
        {/* Modal Header with Ambient Gradient */}
        <div className="relative p-6 sm:p-7 bg-linear-to-br from-orange-500/90 via-orange-600/90 to-amber-500/90 text-white backdrop-blur-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-lg w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all duration-150 cursor-pointer active:scale-95"
            aria-label="Close modal"
          >
            ✕
          </button>
          
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-base">
              🍽️
            </div>
            <span className="font-display font-bold text-sm tracking-wider uppercase text-amber-100">
              MessPulse Authentication
            </span>
          </div>

          <h2 className="font-display text-2xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back!' : 'Create Student Account'}
          </h2>
          <p className="text-orange-100/90 text-xs mt-1">
            {mode === 'login'
              ? 'Sign in using your CUTM Email or Registration Number'
              : 'Join MessPulse to rate meals and submit dining feedback'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl">
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm shadow-orange-500/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm shadow-orange-500/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
              <span className="text-sm">⚠️</span>
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Email or Registration Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 230301120115 or student@cutm.ac.in"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="glass-input w-full text-sm rounded-xl px-4 py-2.5 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  Accepts either your university Roll No. or official CUTM Email.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="glass-input w-full text-sm rounded-xl px-4 py-2.5 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-linear-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In →</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="glass-input w-full text-sm rounded-xl px-3.5 py-2 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  CUTM Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. 230301120115@cutm.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full text-sm rounded-xl px-3.5 py-2 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 230301120115"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="glass-input w-full text-sm rounded-xl px-3.5 py-2 font-medium uppercase placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Password (min 8 chars, 1 letter & 1 number)
                </label>
                <input
                  type="password"
                  placeholder="Min 8 chars, 1 letter, 1 number"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="glass-input w-full text-sm rounded-xl px-3.5 py-2 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-linear-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account →</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
