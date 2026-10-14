import React, { useState, useEffect, useCallback } from 'react';
import VotePoll from '../components/VotePoll';
import { useAuth } from '../context/AuthContext';
import voteService from '../services/voteService';
import menuService from '../services/menuService';
import mealService from '../services/mealService';
import { MEAL_SCHEDULE } from '../utils/timeHelper';
import AuthModal from '../components/AuthModal';

const Voting = () => {
  const { isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [dayName, setDayName] = useState('Today');
  const [todayMenu, setTodayMenu] = useState(null);
  const [mealWindows, setMealWindows] = useState({});
  const [activeMealKey, setActiveMealKey] = useState('Closed');

  const [votesState, setVotesState] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [totalVotesAcrossAll, setTotalVotesAcrossAll] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [todayData, mealStatus, voteData] = await Promise.all([
        menuService.getTodayMenu(),
        mealService.getMealStatus(),
        voteService.getTodayVotes(),
      ]);

      setDayName(todayData.day || todayData.dayName || 'Today');
      setTodayMenu(todayData.menu);
      setMealWindows(mealStatus.mealWindows || {});
      setActiveMealKey(mealStatus.activeMeal?.key || 'Closed');

      const votesMap = voteData?.votes || {};
      const userVotesMap = voteData?.userVotes || {};

      if (Array.isArray(voteData?.dishes)) {
        voteData.dishes.forEach((d) => {
          const dishKey = d.dishName || d.dish_name || d.name;
          if (dishKey) {
            votesMap[dishKey] = {
              dishId: d.dishId || d.dish_id || d.id,
              dish: dishKey,
              dishName: dishKey,
              emoji: d.emoji,
              mealSlot: d.mealSlot || d.meal_slot,
              up: d.upVotes ?? d.up_votes ?? d.up ?? 0,
              down: d.downVotes ?? d.down_votes ?? d.down ?? 0,
              total: d.total ?? d.total_votes ?? 0,
              net: d.net ?? d.net_score ?? 0,
              approval: d.approval ?? d.approval_percentage ?? 0,
            };
            if (d.userVote) {
              userVotesMap[dishKey] = d.userVote;
            }
          }
        });
      }

      setVotesState(votesMap);
      setUserVotes(userVotesMap);
      setTotalVotesAcrossAll(voteData?.totalVotesToday ?? voteData?.totalVotesAcrossAll ?? 0);
      setLeaderboard(voteData?.leaderboard || []);
    } catch (err) {
      console.error('Failed to load voting data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleVote = async (dish, mealKey, type) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      showToast('warn', 'Please sign in to vote for dishes.');
      return;
    }

    const windowInfo = mealWindows[mealKey];
    const isOpen = windowInfo
      ? (windowInfo.votingOpen !== undefined ? windowInfo.votingOpen : (windowInfo.isOpen ?? true))
      : true;

    if (!isOpen) {
      showToast('warn', `Voting for ${mealKey} is locked until ${windowInfo?.opensAt || 'meal start'}.`);
      return;
    }

    try {
      const dishInfo = votesState[dish];
      await voteService.castVote({
        dishId: dishInfo?.dishId,
        dish,
        mealSlot: mealKey || dishInfo?.mealSlot,
        voteType: type,
      });

      showToast('success', `Vote recorded for ${dish}!`);

      // Refresh votes and leaderboard from backend
      const voteData = await voteService.getTodayVotes();
      const votesMap = voteData?.votes || {};
      const userVotesMap = voteData?.userVotes || {};

      if (Array.isArray(voteData?.dishes)) {
        voteData.dishes.forEach((d) => {
          const dishKey = d.dishName || d.dish_name || d.name;
          if (dishKey) {
            votesMap[dishKey] = {
              dishId: d.dishId || d.dish_id || d.id,
              dish: dishKey,
              dishName: dishKey,
              emoji: d.emoji,
              mealSlot: d.mealSlot || d.meal_slot,
              up: d.upVotes ?? d.up_votes ?? d.up ?? 0,
              down: d.downVotes ?? d.down_votes ?? d.down ?? 0,
              total: d.total ?? d.total_votes ?? 0,
              net: d.net ?? d.net_score ?? 0,
              approval: d.approval ?? d.approval_percentage ?? 0,
            };
            if (d.userVote) {
              userVotesMap[dishKey] = d.userVote;
            }
          }
        });
      }

      setVotesState(votesMap);
      setUserVotes(userVotesMap);
      setTotalVotesAcrossAll(voteData?.totalVotesToday ?? voteData?.totalVotesAcrossAll ?? 0);
      setLeaderboard(voteData?.leaderboard || []);
    } catch (err) {
      console.error('Failed to cast vote:', err);
      showToast('warn', err.message || 'Failed to cast vote.');
      // Re-sync
      const voteData = await voteService.getTodayVotes().catch(() => null);
      if (voteData) {
        setVotesState(voteData.votes || {});
        setUserVotes(voteData.userVotes || {});
        setLeaderboard(voteData.leaderboard || []);
      }
    }
  };

  const allTodayDishes = todayMenu ? [
    ...(todayMenu.breakfast || []),
    ...(todayMenu.lunch || []),
    ...(todayMenu.snacks || []),
    ...(todayMenu.dinner || []),
  ] : [];
  const uniqueTodayDishes = [...new Set(allTodayDishes)];

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-emerald-500/20 bg-linear-to-r from-emerald-600/90 via-teal-600/90 to-cyan-600/85 text-white shadow-xl shadow-emerald-500/10 backdrop-blur-xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/25 text-xs font-bold text-teal-100 mb-3">
            <span>🗳️</span> Democratic Dining Polls
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight mb-2">
            Vote on Today's Dishes
          </h1>
          <p className="text-teal-100 text-sm font-medium">
            <span className="font-bold text-white">{dayName} · {uniqueTodayDishes.length} menu items</span>
            {totalVotesAcrossAll > 0 && <span className="ml-2 opacity-90">({totalVotesAcrossAll} total community votes)</span>}
          </p>
        </div>
      </section>

      {/* ── Meal Poll Sections ── */}
      {loading ? (
        <div className="glass-card rounded-3xl py-16 text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p className="font-medium text-sm">Loading dish polls from database...</p>
        </div>
      ) : todayMenu ? (
        <div className="space-y-10">
          {MEAL_SCHEDULE.map((meal) => {
            const mealDishes = todayMenu[meal.key] || [];
            const windowInfo = mealWindows[meal.key] || {};
            const isOpen = windowInfo.votingOpen !== undefined ? windowInfo.votingOpen : (windowInfo.isOpen !== undefined ? windowInfo.isOpen : true);
            const isActive = activeMealKey === meal.key;

            if (mealDishes.length === 0) return null;

            return (
              <div
                key={meal.key}
                className={`space-y-4 rounded-3xl p-2 sm:p-4 transition-all duration-500 ${
                  isActive ? 'bg-orange-500/5 dark:bg-orange-500/5 ring-1 ring-orange-500/20' : ''
                }`}
              >
                {/* Meal Slot Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meal.emoji}</span>
                    <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white capitalize">
                      {meal.label}
                    </h2>
                    {isActive && (
                      <span className="bg-linear-to-r from-orange-500 to-amber-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-sm">
                        Now Serving
                      </span>
                    )}
                  </div>

                  {!isOpen && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      ⏳ Opens at {windowInfo.opensAt || meal.startDisplay}
                    </span>
                  )}
                </div>

                {/* Dishes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {mealDishes.map((dish) => (
                    <VotePoll
                      key={`${meal.key}-${dish}`}
                      dish={dish}
                      votes={votesState[dish] || { up: 0, down: 0 }}
                      userVote={userVotes[dish]}
                      onVote={(type) => handleVote(dish, meal.key, type)}
                      isLocked={!isOpen}
                      opensAt={windowInfo.opensAt || meal.startDisplay}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-3xl py-16 text-center text-gray-500 dark:text-gray-400">
          <span className="text-5xl block mb-3">😴</span>
          <p className="text-base font-bold text-gray-800 dark:text-gray-200">No menu available for today.</p>
        </div>
      )}

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

      {/* ── Community Dish Leaderboard ── */}
      <section className="glass-card-elevated rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Live Aggregation
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
              Campus Taste Leaderboard
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
            {leaderboard.length} dishes tracked
          </span>
        </div>

        {leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((item, idx) => {
              const dishName = item.dishName || item.dish || 'Dish';
              const total = item.total || 0;
              const net = item.net || 0;
              const approval = item.approval || 0;
              const up = item.upVotes ?? item.up ?? 0;
              const down = item.downVotes ?? item.down ?? 0;
              const hasVotes = total > 0;
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <div
                  key={`${dishName}-${idx}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/40 dark:border-gray-700/40 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-150"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center font-black text-gray-400 dark:text-gray-500">
                      {hasVotes ? (medals[idx] || `${idx + 1}.`) : `${idx + 1}.`}
                    </span>
                    <div>
                      <h3 className={`text-sm font-bold ${hasVotes ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {dishName}
                      </h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {total} total vote{total !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">👍 {up}</span>
                      <span className="text-rose-500 dark:text-rose-400">👎 {down}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                          net > 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : net < 0
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {net > 0 ? `+${net}` : net}
                      </span>
                    </div>

                    <div className="w-32 hidden sm:block">
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-semibold mb-1">
                        <span>Approval</span>
                        <span>{approval}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            approval >= 70 ? 'bg-emerald-500' : approval >= 40 ? 'bg-amber-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${approval}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">No dish votes recorded today yet.</p>
          </div>
        )}
      </section>

      {/* Auth Modal fallback */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default Voting;