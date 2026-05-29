/**
 * Push Notification Service
 *
 * Quản lý đăng ký push token và xử lý thông báo đến
 * cho Android (và iOS). Sử dụng Expo Notifications.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI } from '../api';

// Key lưu token trong AsyncStorage
const PUSH_TOKEN_KEY = 'expoPushToken';

// ======================== CẤU HÌNH ========================

/**
 * Cấu hình cách hiển thị notification khi app ở foreground.
 * Mặc định: show alert, sound, badge trên Android.
 */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,        // Hiện banner ngay cả khi app đang mở
      shouldPlaySound: true,        // Phát âm thanh
      shouldSetBadge: true,         // Cập nhật badge
      shouldShowBanner: true,       // Hiện banner trên Android
      shouldShowList: true,         // Hiện trong notification drawer
    }),
  });
}

// ======================== CHANNEL (Android 8+) ========================

/**
 * Tạo notification channel cho Android.
 * Channel là bắt buộc từ Android 8.0 (API 26).
 */
export async function createNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Channel chính - AI notifications
  await Notifications.setNotificationChannelAsync('ai-notifications', {
    name: 'AI Thông báo',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#6C5CE7',
    description: 'Thông báo từ AI về giao dịch, ngân sách và cảnh báo tài chính',
    sound: 'default',
    enableVibrate: true,
  });

  // Channel cho cảnh báo quan trọng (critical)
  await Notifications.setNotificationChannelAsync('ai-critical', {
    name: 'AI Cảnh báo quan trọng',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 100, 300, 100, 300],
    lightColor: '#FF3B30',
    description: 'Cảnh báo tài chính quan trọng như vượt ngân sách, giao dịch bất thường',
    sound: 'default',
    enableVibrate: true,
    bypassDnd: true,             // Cho phép vượt qua chế độ không làm phiền
  });

  // Channel cho thông tin chung
  await Notifications.setNotificationChannelAsync('ai-info', {
    name: 'AI Thông tin',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 100],
    lightColor: '#1565C0',
    description: 'Thông tin tổng kết và cập nhật từ AI',
    sound: 'default',
    enableVibrate: true,
  });

  console.log('[PushNotifications] Android channels created');
}

// ======================== LẤY PUSH TOKEN ========================

/**
 * Yêu cầu quyền và lấy Expo Push Token từ thiết bị.
 * Trả về token string hoặc null nếu thất bại.
 */
export async function registerForPushNotificationsAsync() {
  let token;

  // Chỉ chạy trên thiết bị thật (không phải simulator/emulator)
  if (!Device.isDevice) {
    console.log('[PushNotifications] Running on simulator/emulator — push tokens not available');
    return null;
  }

  // Kiểm tra permission trên Android (từ Android 13 trở đi)
  if (Platform.OS === 'android') {
    await Notifications.requestPermissionsAsync();
  }

  // Trên iOS cần request permission rõ ràng
  if (Platform.OS === 'ios') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted for iOS');
      return null;
    }
  }

  try {
    // Lấy Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Dùng projectId từ app.json nếu có
    });
    token = tokenData.data;
    console.log('[PushNotifications] Expo push token:', token);

    // Lưu token vào AsyncStorage để dùng sau
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    return token;
  } catch (err) {
    console.error('[PushNotifications] Failed to get push token:', err.message);
    return null;
  }
}

/**
 * Lấy push token đã lưu từ AsyncStorage.
 */
export async function getStoredPushToken() {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

// ======================== ĐĂNG KÝ TOKEN VỚI BACKEND ========================

/**
 * Gửi push token lên backend để server có thể gửi notification
 * đến thiết bị này.
 */
export async function syncPushTokenToBackend(token) {
  if (!token) {
    console.log('[PushNotifications] No token to sync');
    return;
  }

  try {
    await notificationsAPI.registerPushToken(token, Platform.OS);
    console.log('[PushNotifications] Token synced to backend');
  } catch (err) {
    console.error('[PushNotifications] Failed to sync token:', err.message);
  }
}

/**
 * Xoá push token trên backend (khi logout).
 */
export async function removePushTokenFromBackend() {
  try {
    await notificationsAPI.removePushToken();
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    console.log('[PushNotifications] Token removed from backend');
  } catch (err) {
    console.error('[PushNotifications] Failed to remove token:', err.message);
  }
}

// ======================== XỬ LÝ NOTIFICATION ĐẾN ========================

/**
 * Lắng nghe sự kiện khi user nhấn vào notification.
 * Có thể điều hướng đến màn hình chi tiết.
 */
export function addNotificationResponseListener(handler) {
  // Xử lý khi user nhấn vào notification khi app đang mở
  const foregroundSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('[PushNotifications] User tapped notification:', response.notification.request.content.data);
      handler(response.notification.request.content.data);
    }
  );

  return foregroundSubscription;
}

/**
 * Lắng nghe sự kiện khi notification đến khi app đang foreground.
 * (Đã được xử lý qua setNotificationHandler)
 */
export function addNotificationReceivedListener(handler) {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PushNotifications] Notification received:', notification.request.content.title);
    handler(notification);
  });

  return subscription;
}

/**
 * Lấy notification đã mở từ trạng thái cold start.
 * Hữu ích khi app bị kill và user mở lại từ notification.
 */
export async function getInitialNotification() {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification?.request?.content?.data || null;
  } catch {
    return null;
  }
}
