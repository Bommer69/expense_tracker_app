import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      AsyncStorage.multiRemove(['authToken', 'userData']);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  getSummary: (month) => api.get('/transactions/summary', { params: { month } }),
};

export const savingsGoalsAPI = {
  getAll: (month) => api.get('/savings-goals', { params: month ? { month } : {} }),
  createOrUpdate: (data) => api.post('/savings-goals', data),
  delete: (id) => api.delete(`/savings-goals/${id}`),
};

export const recurringTransactionsAPI = {
  getAll: () => api.get('/recurring-transactions'),
  create: (data) => api.post('/recurring-transactions', data),
  update: (id, data) => api.put(`/recurring-transactions/${id}`, data),
  delete: (id) => api.delete(`/recurring-transactions/${id}`),
};

// Budgets API
export const budgetsAPI = {
  getAll: (month) => api.get('/budgets', { params: { month } }),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

// Categories API
export const categoriesAPI = {
  getAll: (type) => api.get('/categories', { params: { type } }),
  create: (data) => api.post('/categories', data),
  remove: (id) => api.delete(`/categories/${id}`),
};

// AI API (Google Gemini)
export const aiAPI = {
  getStats: () => api.get('/ai/stats'),
  chat: (message) => api.post('/ai/chat', { message }),
  getAdvice: () => api.get('/ai/advice'),
};

// Accounts API
export const accountsAPI = {
  getAll: () => api.get('/accounts'),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  getBalance: () => api.get('/accounts/balance'),
};

export default api;