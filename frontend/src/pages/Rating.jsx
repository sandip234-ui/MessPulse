import React, { useState, useEffect, useCallback } from 'react';
import RatingStars from '../components/RatingStars';
import { useAuth } from '../context/AuthContext';
import ratingService from '../services/ratingService';
import menuService from '../services/menuService';
import mealService from '../services/mealService';
import AuthModal from '../components/AuthModal';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

const MEAL_META = {
  breakfast: {
    icon: '🌅',
    label: 'Breakfast',
    time: '08:00 – 09:30 AM',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    border: 'border-amber-500/30',
    tag: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  lunch: {
    icon: '☀️',
    label: 'Lunch',
    time: '12:00 – 02:00 PM',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    border: 'border-emerald-500/30',
    tag: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  snacks: {
    icon: '🍩',
    label: 'Snacks',
    time: '05:00 – 06:00 PM',
    gradient: 'from-purple-500/10 via-violet-500/5 to-transparent',
    border: 'border-purple-500/30',
    tag: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  dinner: {
    icon: '🌙',
    label: 'Dinner',
    time: '08:00 – 10:00 PM',
    gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
    border: 'border-blue-500/30',
    tag: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
};

const RATING_LABELS = ['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Great 😄', 'Excellent 🤩'];

const Rating = () => {
  const { isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [dayName, setDayName] = useState('Today');
  const [todayMenu, setTodayMenu] = useState({});
  const [mealWindows, setMealWindows] = useState({});
  const [ratings, setRatings] = useState({
    breakfast: 0,
    lunch: 0,
    snacks: 0,
    dinner: 0,
  });
  const [ratedCount, setRatedCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [todayData, mealStatus] = await Promise.all([
        menuService.getTodayMenu(),
        mealService.getMealStatus(),
      ]);

      setDayName(todayData.day || todayData.dayName || 'Today');
      setTodayMenu(todayData.menu || {});
      setMealWindows(mealStatus.mealWindows || {});

      if (isAuthenticated) {
        const ratingData = await ratingService.getTodayRatings();
        const currentRatings = ratingData.ratings || { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
        const ratedValues = Object.values(currentRatings).filter((r) => r > 0);
        const count = ratedValues.length;
        const avg = count > 0 ? parseFloat((ratedValues.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0;

        setRatings(currentRatings);
        setRatedCount(ratingData.ratedCount ?? count);
        setAverageRating(ratingData.averageRating ?? avg);
      } else {
        setRatings({ breakfast: 0, lunch: 0, snacks: 0, dinner: 0 });
        setRatedCount(0);
        setAverageRating(0);
      }
    } catch (err) {
      console.error('Failed to load rating data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRate = async (meal, value) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      showToast('warn', 'Please sign in to rate your meals.');
      return;
    }

    const windowInfo = mealWindows[meal];
    const isAvailable = windowInfo
      ? (windowInfo.ratingOpen !== undefined ? windowInfo.ratingOpen : (windowInfo.isOpen ?? true))
      : true;

    if (!isAvailable) {
      showToast('warn', `${MEAL_META[meal]?.icon || '⚠️'} Rating window for ${MEAL_META[meal]?.label || meal} opens at ${windowInfo?.opensAt || 'meal start'}.`);
      return;
    }

    try {
      if (value === 0) {
        await ratingService.deleteRating(meal);
        showToast('success', `Rating for ${MEAL_META[meal]?.label || meal} cleared.`);
      } else {
        await ratingService.submitRating({ mealSlot: meal, rating: value });
        showToast('success', `${MEAL_META[meal]?.icon || '⭐'} ${MEAL_META[meal]?.label || meal} rated ${value}/5 — ${RATING_LABELS[value]}`);
      }
      // Refresh ratings from backend
      const updated = await ratingService.getTodayRatings();
      const newRatings = updated.ratings || { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 };
      const ratedValues = Object.values(newRatings).filter((r) => r > 0);
      const count = ratedValues.length;
      const avg = count > 0 ? parseFloat((ratedValues.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0;

      setRatings(newRatings);
      setRatedCount(updated.ratedCount ?? count);
      setAverageRating(updated.averageRating ?? avg);
    } catch (err) {
      showToast('warn', err.message || 'Failed to submit rating.');
      const updated = await ratingService.getTodayRatings().catch(() => null);
      if (updated) {
        setRatings(updated.ratings || { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 });
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-amber-500/20 bg-linear-to-r from-amber-500/90 via-orange-500/90 to-amber-600/85 text-white shadow-xl shadow-amber-500/10 backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/25 text-xs font-bold text-amber-100 mb-3">
            <span>⭐</span> Student Food Satisfaction
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Rate Today's Dining Experience
          </h1>
          <p className="text-amber-100 text-sm font-medium">
            {dayName} · <span className="font-bold text-white">{ratedCount} of 4 meals rated</span>
          </p>
        </div>
      </section>

      {/* ── Toast Alert ── */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-full shadow-2xl animate-bounce backdrop-blur-xl border border-white/20 flex items-center gap-2 ${
            toast.type === 'warn' ? 'bg-orange-600/90' : 'bg-gray-900/90 dark:bg-gray-800/90'
          }`}
        >
          <span>{toast.type === 'warn' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Meal Rating Cards ── */}
      {loading ? (
        <div className="glass-card rounded-3xl py-16 text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="font-medium text-sm">Loading meal ratings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {MEALS.map((meal) => {
            const meta = MEAL_META[meal];
            const items = todayMenu[meal] || [];
            const currentRating = ratings[meal] || 0;
            const windowInfo = mealWindows[meal] || {};
            const active = windowInfo.ratingOpen !== undefined ? windowInfo.ratingOpen : (windowInfo.isOpen ?? true);
            const opensAt = !active ? windowInfo.opensAt : null;

            return (
              <div
                key={meal}
                className={`glass-card rounded-3xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                  active
                    ? 'hover:shadow-lg border-amber-500/30'
                    : 'opacity-70 saturate-60 border-gray-200/40 dark:border-gray-700/40'
                }`}
              >
                {/* Subtle gradient wash */}
                <div className={`absolute top-0 left-0 right-0 h-20 bg-linear-to-b ${meta.gradient} opacity-60 pointer-events-none`} />

                <div className="relative z-10">
                  {/* Top row: icon + title + availability badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-2xl shrink-0">
                        {meta.icon}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white">
                          {meta.label}
                        </h3>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          {meta.time}
                        </p>
                      </div>
                    </div>

                    {/* Window Status Badge */}
                    {active ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Open
                      </span>
                    ) : opensAt ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                        ⏳ Opens at {opensAt}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        🔒 Locked
                      </span>
                    )}
                  </div>

                  {/* Menu items preview */}
                  <div className="mb-5 p-3 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/30 dark:border-gray-700/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                      Menu Selection
                    </p>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                      {items.length > 0 ? items.join(' · ') : 'Menu not announced'}
                    </p>
                  </div>

                  {/* Star rating widget */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <RatingStars
                        rating={currentRating}
                        onRate={(val) => handleRate(meal, val)}
                        size="md"
                        disabled={!active}
                      />
                      {currentRating > 0 && active && (
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 italic">
                          {RATING_LABELS[currentRating]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card footer: reset/status */}
                <div className="relative z-10 mt-5 pt-3 border-t border-gray-200/40 dark:border-gray-700/40 flex items-center justify-between text-xs">
                  {!active ? (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                      Rating opens when meal starts
                    </span>
                  ) : currentRating > 0 ? (
                    <button
                      onClick={() => handleRate(meal, 0)}
                      className="text-xs text-gray-400 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>✕</span> Clear rating
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      Tap a star to rate
                    </span>
                  )}
                  {active && currentRating > 0 && (
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Recorded ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Summary Strip ── */}
      {ratedCount > 0 && (
        <section className="glass-card-elevated rounded-3xl p-6 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <h2 className="font-display text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Today's Rating Breakdown
              </h2>
              <div className="flex items-center gap-5 flex-wrap">
                {MEALS.map((meal) =>
                  ratings[meal] > 0 ? (
                    <div key={meal} className="flex items-center gap-2">
                      <span className="text-xl">{MEAL_META[meal].icon}</span>
                      <RatingStars rating={ratings[meal]} size="sm" readonly />
                    </div>
                  ) : null
                )}
              </div>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200/50 dark:border-gray-700/50">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">Cumulative Score</p>
              <p className="font-display text-3xl font-black text-orange-500 dark:text-orange-400">
                {averageRating}
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / 5.0</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Auth Modal fallback */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default Rating;