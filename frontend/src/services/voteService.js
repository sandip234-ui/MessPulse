import api from './api';

export const voteService = {
  async getTodayVotes() {
    const res = await api.get('/votes/today');
    return res.data;
  },

  async castVote({ dishId, dish, dishName, mealSlot, voteType }) {
    const payload = {
      voteType,
      mealSlot,
    };
    if (dishId) payload.dishId = dishId;
    if (dish || dishName) payload.dish = dish || dishName;
    const res = await api.post('/votes', payload);
    return res.data;
  },
};

export default voteService;
