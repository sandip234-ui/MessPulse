import React, { useState, useEffect } from 'react';
import mealService from '../services/mealService';
import { formatRemaining } from '../utils/timeHelper';

const MealStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const data = await mealService.getMealStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch meal status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !status) {
    return (
      <div className="glass-card rounded-3xl p-6 flex items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent"></div>
        <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Checking live mess schedule...</p>
      </div>
    );
  }

  const activeMeal = status?.activeMeal;
  const minutesLeft = status?.minutesLeft || 0;
  const nextMeal = status?.nextMeal;
  const minutesUntilNext = status?.minutesUntilNext || 0;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl transition-all duration-500 ${
        activeMeal
          ? 'glass-card border-orange-500/30 dark:border-orange-500/30 ring-1 ring-orange-500/20 shadow-lg shadow-orange-500/5'
          : 'glass-card border-gray-200/60 dark:border-white/10'
      }`}
    >
      {/* Subtle top indicator bar */}
      <div
        className={`px-6 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center justify-between border-b ${
          activeMeal
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
            : 'bg-gray-100/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border-gray-200/40 dark:border-gray-700/40'
        }`}
      >
        <span className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${activeMeal ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
          {activeMeal ? 'Dining Hall Open' : 'Dining Hall Closed'}
        </span>
        <span className="text-[10px] tracking-normal font-medium text-gray-500 dark:text-gray-400">
          Live Status Engine
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {activeMeal ? (
          /* ── MEAL ACTIVE STATE ── */
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Meal info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-400 to-amber-500 flex items-center justify-center text-3xl shadow-md shadow-orange-500/20 shrink-0">
                {activeMeal.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Now Serving
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                    ACTIVE
                  </span>
                </div>
                <h3 className="font-display text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {activeMeal.label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  {activeMeal.display || `${activeMeal.startDisplay} – ${activeMeal.endDisplay}`}
                </p>
              </div>
            </div>

            {/* Time Countdown Pill */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20">
                <span className="text-xl">⏳</span>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Service Closes In</p>
                  <p className="text-base font-black text-orange-600 dark:text-orange-400 leading-none mt-0.5">
                    {formatRemaining(minutesLeft)}
                  </p>
                </div>
              </div>

              {/* Next meal preview */}
              {nextMeal && (
                <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gray-100/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50">
                  <span className="text-xl">{nextMeal.emoji}</span>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Up Next</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none mt-0.5">
                      {nextMeal.label} <span className="text-[10px] text-gray-400 font-normal">at {nextMeal.startDisplay}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── MEAL CLOSED STATE ── */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-200/80 dark:bg-gray-800 flex items-center justify-center text-3xl shrink-0">
                😴
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Kitchen Prep & Resting
                </span>
                <h3 className="font-display text-2xl font-black text-gray-800 dark:text-gray-200 tracking-tight">
                  Mess is Currently Closed
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Check the schedule below for the next serving time
                </p>
              </div>
            </div>

            {/* Next meal countdown */}
            {nextMeal && (
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-linear-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                <span className="text-2xl">{nextMeal.emoji}</span>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Next Scheduled Meal</p>
                  <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                    {nextMeal.label} <span className="text-xs font-medium text-gray-500 dark:text-gray-400">({nextMeal.startDisplay})</span>
                  </p>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                    Opens in {formatRemaining(minutesUntilNext)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealStatus;