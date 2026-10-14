import api from './api';

export const menuService = {
  async getWeeklyMenu() {
    const res = await api.get('/menu/weekly');
    return res.data?.menu || res.data?.weeklyMenu || res.data;
  },

  async getTodayMenu() {
    const res = await api.get('/menu/today');
    const data = res.data || {};
    return {
      day: data.day || data.dayName,
      dayName: data.day || data.dayName,
      date: data.date,
      activeMealKey: data.activeMealKey,
      menu: data.menu,
      details: data.details,
    };
  },

  async updateMenuSlot({ day, meal, dishes }) {
    const cleanDishes = (dishes || [])
      .map((d) => (typeof d === 'string' ? d.trim() : d?.name?.trim() || ''))
      .filter(Boolean);
    const res = await api.put('/menu/manage', { day, meal, dishes: cleanDishes });
    return res.data;
  },

  async updateWeeklyMenu(weeklyMenu, originalMenu = null) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];
    const updates = [];

    for (const day of days) {
      if (!weeklyMenu[day]) continue;
      for (const meal of meals) {
        const currentDishes = (weeklyMenu[day][meal] || [])
          .map((d) => (typeof d === 'string' ? d.trim() : d?.name?.trim() || ''))
          .filter(Boolean);

        if (originalMenu && originalMenu[day] && originalMenu[day][meal]) {
          const origDishes = (originalMenu[day][meal] || [])
            .map((d) => (typeof d === 'string' ? d.trim() : d?.name?.trim() || ''))
            .filter(Boolean);
          const isSame =
            currentDishes.length === origDishes.length &&
            currentDishes.every((d, i) => d === origDishes[i]);
          if (isSame) continue;
        }

        if (currentDishes.length > 0) {
          updates.push({ day, meal, dishes: currentDishes });
        }
      }
    }

    // If no differences detected against originalMenu (e.g. user clicked save on current day), save current day slots
    if (updates.length === 0) {
      for (const day of days) {
        if (!weeklyMenu[day]) continue;
        for (const meal of meals) {
          const currentDishes = (weeklyMenu[day][meal] || [])
            .map((d) => (typeof d === 'string' ? d.trim() : d?.name?.trim() || ''))
            .filter(Boolean);
          if (currentDishes.length > 0) {
            updates.push({ day, meal, dishes: currentDishes });
          }
        }
      }
    }

    for (const update of updates) {
      await this.updateMenuSlot(update);
    }

    return this.getWeeklyMenu();
  },
};

export default menuService;

