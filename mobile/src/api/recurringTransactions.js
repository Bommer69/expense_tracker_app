import api from './client';

export const recurringTransactionsAPI = {
  getAll: () => api.get('/recurring-transactions'),
  create: (data) => api.post('/recurring-transactions', data),
  update: (id, data) => api.put(`/recurring-transactions/${id}`, data),
  delete: (id) => api.delete(`/recurring-transactions/${id}`),
};
