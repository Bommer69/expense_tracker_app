import api from './client';

export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications/clear'),

  // Push token endpoints
  registerPushToken: (token, platform) =>
    api.post('/notifications/push-token', { token, platform }),
  removePushToken: () =>
    api.delete('/notifications/push-token'),
};
