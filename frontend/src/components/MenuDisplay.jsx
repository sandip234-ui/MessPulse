import React from 'react';
import { getDishEmoji } from '../utils/dishEmoji';

const MEAL_META = {
  breakfast: {
    icon: '🌅',
    label: 'Breakfast',
    time: '08:00 – 09:30 AM',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    border: 'border-amber-500/30',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    accentColor: 'text-amber-600 dark:text-amber-400',
  },
  lunch: {
    icon: '☀️',
    label: 'Lunch',
    time: '12:00 – 02:00 PM',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
  },
  snacks: {
    icon: '🍩',
    label: 'Snacks',
    time: '05:00 – 06:00 PM',
    gradient: 'from-purple-500/10 via-violet-500/5 to-transparent',
    border: 'border-purple-500/30',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    accentColor: 'text-purple-600 dark:text-purple-400',
  },
  dinner: {
    icon: '🌙',
    label: 'Dinner',
    time: '08:00 – 10:00 PM',
    gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
    border: 'border-blue-500/30',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    accentColor: 'text-blue-600 dark:text-blue-400',
  },
};

const MealCard = ({ meal, items, isActive }) => {
  const meta = MEAL_META[meal] || MEAL_META.lunch;

  return (
    <div
      className={`glass-card rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
        isActive
          ? 'ring-2 ring-orange-500 border-orange-500/40 shadow-xl shadow-orange-500/10 scale-[1.02] z-10'
          : 'hover:-translate-y-1 hover:shadow-lg'
      }`}
    >
      {/* Subtle top color wash */}
      <div className={`absolute top-0 left-0 right-0 h-24 bg-linear-to-b ${meta.gradient} opacity-80 pointer-events-none`} />

      <div className="relative z-10">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform duration-200">
              {meta.icon}
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-gray-900 dark:text-white capitalize">
                {meal}
              </h3>
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                {meta.time}
              </p>
            </div>
          </div>

          {isActive && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-linear-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          )}
        </div>

        {/* Dish List */}
        <div className="space-y-2 mt-4">
          {items && items.length > 0 ? (
            items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-200/40 dark:border-gray-700/40 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-colors duration-150"
              >
                <span className="text-base shrink-0 select-none">
                  {getDishEmoji(item)}
                </span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {item}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
              Menu not published
            </p>
          )}
        </div>
      </div>

      {/* Card footer indicator */}
      <div className="mt-4 pt-3 border-t border-gray-200/40 dark:border-gray-700/40 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span>{items?.length || 0} items planned</span>
        <span className={`font-bold ${meta.accentColor}`}>View Details</span>
      </div>
    </div>
  );
};

const MenuDisplay = ({ dayName, menu, activeMeal }) => {
  const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Today's Curated Menu
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {dayName} Offerings
          </h2>
        </div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Prepared fresh by CUTM Central Mess Team
        </p>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {meals.map((meal) =>
          menu && menu[meal] ? (
            <MealCard
              key={meal}
              meal={meal}
              items={menu[meal]}
              isActive={meal === activeMeal}
            />
          ) : null
        )}
      </div>
    </div>
  );
};

export default MenuDisplay;