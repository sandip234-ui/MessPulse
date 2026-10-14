import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Rating from './pages/Rating';
import Feedback from './pages/Feedback';
import Voting from './pages/Voting';
import Dashboard from './pages/Dashboard';
import ManageMenu from './pages/ManageMenu';

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-6 rounded-2xl flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-orange-500 border-t-transparent"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Checking permissions...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card-elevated p-8 rounded-3xl flex flex-col items-center gap-4 max-w-xs w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-2xl shadow-lg shadow-orange-500/20 animate-pulse">
            🍽️
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white">MessPulse</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Connecting campus dining...</p>
          </div>
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-orange-500 border-t-transparent mt-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex-1 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <Routes>
            {/* ── Student / Public Routes ── */}
            <Route
              path="/"
              element={isAdmin ? <Navigate to="/dashboard" replace /> : <Home />}
            />
            <Route
              path="/rating"
              element={isAdmin ? <Navigate to="/dashboard" replace /> : <Rating />}
            />
            <Route
              path="/feedback"
              element={isAdmin ? <Navigate to="/dashboard" replace /> : <Feedback />}
            />
            <Route
              path="/voting"
              element={isAdmin ? <Navigate to="/dashboard" replace /> : <Voting />}
            />

            {/* ── Admin Routes (Protected) ── */}
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <Dashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/manage-menu"
              element={
                <AdminRoute>
                  <ManageMenu />
                </AdminRoute>
              }
            />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;