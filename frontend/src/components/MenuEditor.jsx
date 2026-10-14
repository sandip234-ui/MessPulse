import React, { useState, useEffect } from 'react';
import menuService from '../services/menuService';
import { getDishEmoji } from '../utils/dishEmoji';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '☀️',
  snacks: '🍩',
  dinner: '🌙',
};

const MenuEditor = ({ menuData, onMenuChange }) => {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [localMenu, setLocalMenu] = useState(menuData || {});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [newDishInputs, setNewDishInputs] = useState({
    breakfast: '',
    lunch: '',
    snacks: '',
    dinner: '',
  });

  useEffect(() => {
    if (menuData) {
      setLocalMenu(menuData);
    }
  }, [menuData]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDishChange = (meal, index, value) => {
    const updated = JSON.parse(JSON.stringify(localMenu || {}));
    if (!updated[selectedDay]) {
      updated[selectedDay] = { breakfast: [], lunch: [], snacks: [], dinner: [] };
    }
    if (!updated[selectedDay][meal]) {
      updated[selectedDay][meal] = [];
    }
    updated[selectedDay][meal][index] = value;
    setLocalMenu(updated);
  };

  const removeDish = (meal, index) => {
    const updated = JSON.parse(JSON.stringify(localMenu || {}));
    if (!updated[selectedDay] || !updated[selectedDay][meal]) return;
    updated[selectedDay][meal].splice(index, 1);
    setLocalMenu(updated);
  };

  const addDish = (meal) => {
    const dishName = newDishInputs[meal]?.trim();
    if (!dishName) return;

    const updated = JSON.parse(JSON.stringify(localMenu || {}));
    if (!updated[selectedDay]) {
      updated[selectedDay] = { breakfast: [], lunch: [], snacks: [], dinner: [] };
    }
    if (!updated[selectedDay][meal]) {
      updated[selectedDay][meal] = [];
    }
    updated[selectedDay][meal].push(dishName);
    setLocalMenu(updated);

    setNewDishInputs((prev) => ({ ...prev, [meal]: '' }));
  };

  const handleSave = async () => {
    try {
      // Validate that each meal slot on the currently selected day has at least one valid dish
      const currentDay = localMenu[selectedDay] || {};
      for (const meal of MEALS) {
        const dishes = (currentDay[meal] || [])
          .map((d) => (typeof d === 'string' ? d.trim() : ''))
          .filter(Boolean);
        if (dishes.length === 0) {
          showToast(
            'error',
            `Please add at least one dish for ${meal.charAt(0).toUpperCase() + meal.slice(1)} on ${selectedDay}.`
          );
          return;
        }
      }

      setSaving(true);
      const saved = await menuService.updateWeeklyMenu(localMenu, menuData);
      if (onMenuChange) onMenuChange(saved);
      showToast('success', 'Weekly menu saved to database successfully!');
    } catch (err) {
      let msg = err.message || 'Failed to save menu changes.';
      if (err.details && Array.isArray(err.details) && err.details.length > 0) {
        const detailList = err.details
          .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
          .join(', ');
        msg = `Validation Error: ${detailList}`;
      }
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const currentDayMenu = localMenu[selectedDay] || { breakfast: [], lunch: [], snacks: [], dinner: [] };


  return (
    <div className="glass-card-elevated rounded-3xl overflow-hidden space-y-6 transition-all duration-300">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-full shadow-2xl animate-bounce backdrop-blur-xl flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-600/90' : 'bg-emerald-600/90'
          }`}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Editor Top Bar */}
      <div className="p-6 sm:p-7 border-b border-gray-200/50 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/40 dark:bg-gray-800/40">
        <div>
          <h2 className="font-display font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <span>📝</span> Weekly Menu Configuration
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            Modify dish items for any day of the week
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Saving to DB...</span>
            </>
          ) : (
            <span>💾 Save Menu Changes</span>
          )}
        </button>
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        {/* Day Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                selectedDay === day
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-100'
                  : 'bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-orange-500/10 hover:text-orange-500 border border-gray-200/50 dark:border-gray-700/50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Meal Slot Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {MEALS.map((meal) => {
            const dishes = currentDayMenu[meal] || [];
            return (
              <div
                key={meal}
                className="glass-card rounded-2xl p-5 space-y-4 border border-gray-200/40 dark:border-gray-700/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-200/40 dark:border-gray-700/40 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{MEAL_ICONS[meal]}</span>
                      <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white capitalize">
                        {meal} Slot
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                      {dishes.length} items
                    </span>
                  </div>

                  {/* Dishes Input List */}
                  <div className="space-y-2">
                    {dishes.map((dish, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-lg w-7 text-center shrink-0 select-none">
                          {getDishEmoji(dish)}
                        </span>
                        <input
                          type="text"
                          value={dish}
                          onChange={(e) => handleDishChange(meal, idx, e.target.value)}
                          className="glass-input flex-1 text-xs sm:text-sm rounded-xl px-3 py-2 font-medium"
                          placeholder="Dish name"
                        />
                        <button
                          onClick={() => removeDish(meal, idx)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-bold cursor-pointer"
                          title="Remove dish from this day"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {dishes.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                        No dishes configured for {selectedDay} {meal}.
                      </p>
                    )}
                  </div>
                </div>

                {/* Add New Dish Inline Form */}
                <div className="pt-3 border-t border-gray-200/40 dark:border-gray-700/40 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Add dish to ${meal}...`}
                    value={newDishInputs[meal]}
                    onChange={(e) => setNewDishInputs({ ...newDishInputs, [meal]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDish(meal))}
                    className="glass-input flex-1 text-xs sm:text-sm rounded-xl px-3 py-2 font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <button
                    onClick={() => addDish(meal)}
                    className="px-3.5 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-bold text-xs transition-colors cursor-pointer border border-orange-500/20 active:scale-95"
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MenuEditor;