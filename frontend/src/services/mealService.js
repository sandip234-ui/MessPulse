import api from './api';

export const mealService = {
  async getMealStatus() {
    const res = await api.get('/meals/status');
    return res.data;
  },
};

export default mealService;
