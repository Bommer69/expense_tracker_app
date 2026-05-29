import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { notificationsAPI } from '../api';
import { AuthContext } from '../context/AuthContext';

export const useNotifications = (limit = 20) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const ctx = useContext(AuthContext);
  const isAuthenticated = ctx?.isAuthenticated ?? false;

  const fetchNotifications = useCallback(async (params = {}) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsAPI.getAll({ limit, ...params });
      setNotifications(response.data.notifications || []);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [limit, isAuthenticated]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return 0;
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
      return response.data.count;
    } catch {
      return 0;
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id || n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err.message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read error:', err.message);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => (n._id !== id && n.id !== id)));
    } catch (err) {
      console.error('Delete notification error:', err.message);
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Clear all error:', err.message);
    }
  }, []);

  // Polling: tự động cập nhật số thông báo chưa đọc mỗi 30 giây (chỉ khi authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchUnreadCount();

    pollingRef.current = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isAuthenticated, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };
};

export default useNotifications;
