import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
// Chỉ xoá token khi 401 từ endpoint /auth/me (checkStoredAuth)
// Tránh race condition: request cũ 401 làm mất token mới sau khi login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && url.includes('/auth/me')) {
      AsyncStorage.multiRemove(['authToken', 'userData']).catch(() => {});
    }
    return Promise.reject(error);
  }
);

export default api;
