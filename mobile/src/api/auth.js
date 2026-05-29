import api from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  getMe: () => api.get('/auth/me'),
  updateProfile: async (formData) => {
    // Dùng fetch thay vì axios instance để tránh conflict Content-Type header
    const token = await AsyncStorage.getItem('authToken');
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        // KHÔNG set Content-Type — fetch tự động set multipart/form-data với boundary
      },
      body: formData,
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw errData;
    }
    return { data: await response.json() };
  },
};
