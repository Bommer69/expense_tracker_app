import api from './client';

export const budgetsAPI = {
  getAll: (month) => api.get('/budgets', { params: { month } }),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};
