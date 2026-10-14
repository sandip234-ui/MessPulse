import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import menuService from '../services/menuService';
import MenuEditor from '../components/MenuEditor';

const ManageMenu = () => {
  const navigate = useNavigate();
  const [weeklyMenu, setWeeklyMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMenu = async () => {
    try {
      setLoading(true);
      const menu = await menuService.getWeeklyMenu();
      setWeeklyMenu(menu);
    } catch (err) {
      setError(err.message || 'Failed to load weekly menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* ── Admin Menu Header ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-indigo-500/20 bg-linear-to-r from-indigo-700/90 via-blue-700/90 to-slate-800/85 text-white shadow-xl shadow-indigo-500/10 backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold text-indigo-200 mb-3">
              <span>⚙️</span> Kitchen Operations Control
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-1 text-white">
              Manage 7-Day Weekly Menu
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm font-medium">
              Synchronized directly with PostgreSQL database master schedules
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="self-start sm:self-auto px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm shrink-0"
          >
            <span>←</span> Back to Dashboard
          </button>
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Menu Editor ── */}
      {loading ? (
        <div className="glass-card rounded-3xl py-16 text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="font-medium text-sm">Loading weekly schedule from database...</p>
        </div>
      ) : weeklyMenu ? (
        <MenuEditor menuData={weeklyMenu} onMenuChange={setWeeklyMenu} />
      ) : null}
    </div>
  );
};

export default ManageMenu;