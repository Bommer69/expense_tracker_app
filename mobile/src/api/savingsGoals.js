import api from './client';

export const savingsGoalsAPI = {
  getAll: (month) => api.get('/savings-goals', { params: month ? { month } : {} }),
  createOrUpdate: (data) => api.post('/savings-goals', data),
  delete: (id) => api.delete(`/savings-goals/${id}`),
};
