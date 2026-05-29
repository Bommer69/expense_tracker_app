import React, { createContext, useState, useEffect, useCallback, useRef, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { notificationsAPI } from '../api/notifications';
import {
  configureNotificationHandler,
  createNotificationChannels,
  registerForPushNotificationsAsync,
  syncPushTokenToBackend,
  addNotificationResponseListener,
  removePushTokenFromBackend,
} from '../services/pushNotifications';

export const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const pollingRef = useRef(null);
  const lastKnownCountRef = useRef(0);
  const pushInitRef = useRef(false);

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

  // ===== Khởi tạo Push Notification =====
  useEffect(() => {
    if (!isAuthenticated) {
      if (pushInitRef.current) {
        removePushTokenFromBackend();
        pushInitRef.current = false;
      }
      return;
    }

    if (pushInitRef.current) return;
    pushInitRef.current = true;

    async function initPushNotifications() {
      try {
        // 1. Cấu hình handler (hiện alert khi app foreground)
        configureNotificationHandler();

        // 2. Tạo channel cho Android
        await createNotificationChannels();

        // 3. Lấy push token từ thiết bị
        const token = await registerForPushNotificationsAsync();

        // 4. Gửi token lên backend
        if (token) {
          await syncPushTokenToBackend(token);
        }
      } catch (err) {
        console.error('[NotificationContext] Push init error:', err.message);
      }
    }

    initPushNotifications();
  }, [isAuthenticated]);

  // Lắng nghe user nhấn vào notification
  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = addNotificationResponseListener((data) => {
      // Có thể điều hướng đến màn hình chi tiết nếu cần
      console.log('[NotificationContext] User opened notification with data:', data);
    });

    return () => {
      sub?.remove();
    };
  }, [isAuthenticated]);

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
