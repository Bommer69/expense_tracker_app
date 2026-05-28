import api from './client';

export const aiAPI = {
  getStats: () => api.get('/ai/stats'),
  chat: (message) => api.post('/ai/chat', { message }),
  getAdvice: () => api.get('/ai/advice'),
  getHistory: () => api.get('/ai/chat/history'),
  clearHistory: () => api.delete('/ai/chat/history'),
};
