import api from './api';

export const ratingService = {
  async getTodayRatings() {
    const res = await api.get('/ratings/today');
    return res.data;
  },

  async submitRating({ mealSlot, meal, rating }) {
    const slot = mealSlot || meal;
    const res = await api.post('/ratings', { mealSlot: slot, rating });
    return res.data;
  },

  async deleteRating(meal) {
    const res = await api.delete(`/ratings/${meal}`);
    return res.data;
  },
};

export default ratingService;
