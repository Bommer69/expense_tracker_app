import api from './client';

export const categoriesAPI = {
  getAll: (type) => api.get('/categories', { params: { type } }),
  create: (data) => api.post('/categories', data),
  remove: (id) => api.delete(`/categories/${id}`),
};
