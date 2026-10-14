import api from './api';

export const analyticsService = {
  async getOverview() {
    const res = await api.get('/analytics/overview');
    return res.data;
  },
};

export default analyticsService;
