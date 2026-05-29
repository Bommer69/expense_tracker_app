/**
 * Push Notification Service
 *
 * Gửi push notification qua Expo Push API đến các thiết bị
 * Android/iOS đã đăng ký.
 *
 * Sử dụng expo-server-sdk:
 *   https://docs.expo.dev/push-notifications/sending-notifications/
 */

const { Expo } = require('expo-server-sdk');

// Tạo Expo SDK client (dùng chung một instance)
let expo = new Expo();

// ======================== CẤU HÌNH ========================

// Map notification type → Android channel
const CHANNEL_MAP = {
  critical: 'ai-critical',
  warning: 'ai-critical',
  info: 'ai-info',
};

const DEFAULT_CHANNEL = 'ai-notifications';

// Map severity → Android channel
function getChannel(severity) {
  return CHANNEL_MAP[severity] || DEFAULT_CHANNEL;
}

// ======================== GỬI PUSH NOTIFICATION ========================

/**
 * Gửi push notification đến một user cụ thể.
 *
 * @param {Object} user - User document (phải có pushTokens array)
 * @param {Object} notification - Notification document từ MongoDB
 * @param {Object} [options] - Các tuỳ chọn bổ sung
 * @param {number} [options.badge] - Số badge muốn set (iOS)
 * @returns {Promise<Array>} Danh sách kết quả gửi
 */
async function sendPushToUser(user, notification, options = {}) {
  const tokens = user.pushTokens || [];

  if (tokens.length === 0) {
    console.log(`[PushService] No push tokens for user ${user._id}`);
    return [];
  }

  // Lọc token hợp lệ (Expo push token hợp lệ)
  const validTokens = tokens.filter(t => Expo.isExpoPushToken(t.token));

  if (validTokens.length === 0) {
    console.log(`[PushService] No valid Expo push tokens for user ${user._id}`);
    return [];
  }

  // Tạo messages
  const messages = validTokens.map(t => ({
    to: t.token,
    sound: 'default',
    title: notification.title,
    body: notification.message,
    badge: options.badge ?? undefined,
    channelId: getChannel(notification.severity),
    priority: notification.severity === 'critical' ? 'high' : 'normal',
    data: {
      notificationId: String(notification._id || notification.id),
      type: notification.type,
      severity: notification.severity,
      timestamp: notification.createdAt || new Date().toISOString(),
      ...(notification.data?.transactionId && {
        transactionId: String(notification.data.transactionId),
      }),
      ...(notification.data?.accountId && {
        accountId: String(notification.data.accountId),
      }),
      ...(notification.data?.amount != null && {
        amount: notification.data.amount,
      }),
    },
    _displayInForeground: true,
  }));

  try {
    // Chia nhỏ messages thành chunks (Expo giới hạn 100 messages/chunk)
    const chunks = expo.chunkPushNotifications(messages);
    const results = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        results.push(...ticketChunk);

        // Log kết quả
        ticketChunk.forEach((ticket, idx) => {
          if (ticket.status === 'error') {
            console.error(
              `[PushService] Failed to send to token ${validTokens[idx]?.token?.slice(0, 20)}...:`,
              ticket.message
            );
          }
        });
      } catch (chunkErr) {
        console.error('[PushService] Error sending chunk:', chunkErr.message);
      }
    }

    // Xử lý receipt sau đó (tuỳ chọn)
    // Có thể gọi handlePushReceipts sau vài giây
    results._ticketIds = results
      .filter(r => r.status === 'ok')
      .map(r => r.id);

    console.log(
      `[PushService] Sent ${messages.length} push(es) to user ${user._id}, ` +
      `${results.filter(r => r.status === 'ok').length} OK`
    );

    return results;
  } catch (err) {
    console.error('[PushService] sendPushToUser error:', err.message);
    return [];
  }
}

/**
 * Gửi push notification đến nhiều user cùng lúc.
 *
 * @param {Array<Object>} users - Mảng user documents
 * @param {Object} notification - Notification document
 * @param {Object} [options]
 * @returns {Promise<{total: number, success: number, failed: number}>}
 */
async function sendPushToUsers(users, notification, options = {}) {
  let total = 0;
  let success = 0;
  let failed = 0;

  for (const user of users) {
    const results = await sendPushToUser(user, notification, options);
    total += results.length;
    success += results.filter(r => r.status === 'ok').length;
    failed += results.filter(r => r.status === 'error').length;
  }

  return { total, success, failed };
}

/**
 * Xoá push token không hợp lệ khỏi user.
 * Gọi khi nhận được error từ Expo về token không hợp lệ.
 */
async function removeInvalidToken(userId, invalidToken) {
  try {
    const User = require('../models/User');
    await User.updateOne(
      { _id: userId },
      { $pull: { pushTokens: { token: invalidToken } } }
    );
    console.log(`[PushService] Removed invalid token for user ${userId}`);
  } catch (err) {
    console.error('[PushService] Failed to remove invalid token:', err.message);
  }
}

/**
 * Kiểm tra và xử lý receipts từ Expo.
 * Gọi định kỳ hoặc sau khi gửi batch lớn.
 */
async function handlePushReceipts(ticketIds) {
  if (!ticketIds || ticketIds.length === 0) return;

  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ticketIds);

    for (const chunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'error') {
            console.error(
              `[PushService] Receipt error for ${receiptId}:`,
              receipt.message
            );

            // Xoá token nếu lỗi DeviceNotRegistered
            if (receipt.details?.error === 'DeviceNotRegistered') {
              // Cần tìm user dựa vào token — có thể implement sau
              console.warn(
                `[PushService] Device not registered, should remove token for receipt ${receiptId}`
              );
            }
          }
        }
      } catch (chunkErr) {
        console.error('[PushService] Error checking receipts:', chunkErr.message);
      }
    }
  } catch (err) {
    console.error('[PushService] handlePushReceipts error:', err.message);
  }
}

module.exports = {
  sendPushToUser,
  sendPushToUsers,
  removeInvalidToken,
  handlePushReceipts,
  getChannel,
};
