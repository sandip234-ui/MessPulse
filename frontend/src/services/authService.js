import api from './api';

export const authService = {
  async register({ fullName, email, regNo, registrationNumber, password }) {
    const res = await api.post('/auth/register', {
      fullName,
      email,
      regNo: (regNo || registrationNumber || '').trim().toUpperCase(),
      password,
    });
    return res.data;
  },

  async login({ identifier, password }) {
    const res = await api.post('/auth/login', {
      identifier,
      password,
    });
    return res.data;
  },

  async logout() {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export default authService;
