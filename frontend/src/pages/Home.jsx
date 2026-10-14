import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import MenuDisplay from '../components/MenuDisplay';
import MealStatus from '../components/MealStatus';
import menuService from '../services/menuService';
import mealService from '../services/mealService';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

const Home = () => {
  const [menuInfo, setMenuInfo] = useState({ dayName: '', menu: null });
  const [activeMeal, setActiveMeal] = useState('Closed');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [todayData, mealStatus] = await Promise.all([
        menuService.getTodayMenu(),
        mealService.getMealStatus(),
      ]);

      setMenuInfo({
        dayName: todayData.day || todayData.dayName || 'Today',
        menu: todayData.menu,
      });

      setActiveMeal(mealStatus.activeMeal ? mealStatus.activeMeal.key : 'Closed');
    } catch (err) {
      console.error('Failed to load Home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  const today = menuInfo.dayName || 'Today';
  const todayMenu = menuInfo.menu;

  return (
    <div className="space-y-8 sm:space-y-10">
      
      {/* ── Hero Banner with Frosted Glass Look ── */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-orange-500/20 bg-linear-to-r from-orange-500/90 via-orange-600/90 to-amber-500/85 text-white shadow-xl shadow-orange-500/10 backdrop-blur-xl">
        {/* Ambient decorative elements */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/25 text-xs font-bold text-amber-100 mb-4 backdrop-blur-md">
            <span>👋</span> Good {getGreeting()}, Centurions
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-3">
            What's cooking on campus today?
          </h1>
          <p className="text-orange-100 text-sm sm:text-base font-medium leading-relaxed">
            Real-time daily menu, instant meal rating, dish voting, and direct mess council feedback for <span className="font-bold text-white underline decoration-amber-300 decoration-2 underline-offset-4">{today}</span>.
          </p>
        </div>
      </section>

      {/* ── Meal Status Live Card ── */}
      <section>
        <MealStatus />
      </section>

      {/* ── Today's Menu Display ── */}
      <section>
        {loading ? (
          <div className="glass-card rounded-3xl py-16 text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent mx-auto mb-4" />
            <p className="font-medium text-sm">Fetching today's menu from database...</p>
          </div>
        ) : todayMenu ? (
          <MenuDisplay dayName={today} menu={todayMenu} activeMeal={activeMeal} />
        ) : (
          <div className="glass-card rounded-3xl py-16 text-center text-gray-500 dark:text-gray-400">
            <span className="text-5xl block mb-3">🍽️</span>
            <p className="text-base font-bold text-gray-800 dark:text-gray-200">No menu published for today.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Check back once the mess council updates the schedule.</p>
          </div>
        )}
      </section>

      {/* ── Quick Action Cards Group ── */}
      <section className="pt-2">
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
            Quick Actions &amp; Participation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              to: '/rating',
              icon: '⭐',
              title: 'Rate Meals',
              description: 'Rate today’s breakfast, lunch, snacks, and dinner.',
              accent: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
              iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            },
            {
              to: '/voting',
              icon: '🗳️',
              title: 'Dish Polls',
              description: 'Upvote or downvote individual dishes on the menu.',
              accent: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10',
              iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            },
            {
              to: '/feedback',
              icon: '💬',
              title: 'Give Feedback',
              description: 'Submit issues or hygiene suggestions to the council.',
              accent: 'hover:border-blue-500/40 hover:shadow-blue-500/10',
              iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            },
          ].map(({ to, icon, title, description, accent, iconBg }) => (
            <NavLink
              key={to}
              to={to}
              className={`glass-card rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex items-start gap-4 group ${accent}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-200 ${iconBg}`}>
                {icon}
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;