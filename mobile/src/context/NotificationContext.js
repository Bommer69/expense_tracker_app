import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { notificationsAPI } from '../api/notifications';

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const pollingRef = useRef(null);
  const lastKnownCountRef = useRef(0);

  const { isAuthenticated } = useContext(AuthContext);

  const fetchLatestUnread = useCallback(async () => {
    try {
      const response = await notificationsAPI.getAll({ limit: 1, unread: true });
      const notifs = response.data?.notifications || response.data?.data || [];
      if (notifs.length > 0) {
        setLatestNotification(notifs[0]);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await notificationsAPI.getUnreadCount();
      const count = response.data?.count ?? 0;

      // Nếu số lượng tăng → có thông báo mới
      if (count > lastKnownCountRef.current) {
        fetchLatestUnread();
      }
      lastKnownCountRef.current = count;
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, [isAuthenticated, fetchLatestUnread]);

  const dismissLatestNotification = useCallback(() => {
    setLatestNotification(null);
  }, []);

  // Polling định kỳ
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setLatestNotification(null);
      return;
    }

    fetchUnreadCount();

    pollingRef.current = setInterval(() => {
      fetchUnreadCount();
    }, 10000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        latestNotification,
        dismissLatestNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
