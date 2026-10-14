import api from './api';

export const feedbackService = {
  async getFeedback(params = {}) {
    const res = await api.get('/feedback', { params });
    const items = res.data?.items || res.data?.feedback || [];
    return {
      ...res.data,
      feedback: items,
      items,
      total: res.data?.total || items.length,
    };
  },

  async submitFeedback({ category, message }) {
    const res = await api.post('/feedback', { category, message });
    return res.data;
  },

  async deleteFeedback(id) {
    const res = await api.delete(`/feedback/${id}`);
    return res.data;
  },

  async updateFeedbackStatus(id, status) {
    const res = await api.patch(`/feedback/${id}/status`, { status });
    return res.data;
  },
};

export default feedbackService;
