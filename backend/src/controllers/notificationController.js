/**
 * Notification Controller
 *
 * Quản lý thông báo AI trigger cho người dùng.
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const { getUserId } = require('../utils/auth');
const { generateDailySummary, evaluateAnomalies } = require('../services/aiTriggerService');

/**
 * GET /api/notifications
 * Lấy danh sách thông báo, phân trang, có thể lọc theo read/unread
 */
async function getAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { limit = 20, offset = 0, read, type } = req.query;

    const query = { userId };
    if (read === 'true') query.read = true;
    else if (read === 'false') query.read = false;
    if (type) query.type = type;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(Math.min(parseInt(limit), 50))
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.json({
      notifications: notifications.map(n => ({
        ...n,
        id: n._id,
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('[Notification.getAll] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/notifications/unread-count
 * Lấy số lượng thông báo chưa đọc
 */
async function getUnreadCount(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const count = await Notification.countDocuments({ userId, read: false });
    res.json({ count });
  } catch (err) {
    console.error('[Notification.getUnreadCount] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/notifications/:id/read
 * Đánh dấu một thông báo đã đọc
 */
async function markRead(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (err) {
    console.error('[Notification.markRead] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PUT /api/notifications/read-all
 * Đánh dấu tất cả thông báo đã đọc
 */
async function markAllRead(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Notification.markAllRead] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/notifications/:id
 * Xóa một thông báo
 */
async function remove(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Notification.remove] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/notifications
 * Xóa tất cả thông báo của user
 */
async function clearAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await Notification.deleteMany({ userId });

    res.json({ success: true });
  } catch (err) {
    console.error('[Notification.clearAll] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/notifications/cron/daily-summary
 * Endpoint cho cron job — tạo tổng kết cuối ngày cho tất cả user
 * Bảo vệ bằng API key để tránh abuse
 */
async function cronDailySummary(req, res) {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CRON_API_KEY || 'expense-tracker-cron-key';
    if (apiKey !== expectedKey) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await User.find({}).select('_id');
    let count = 0;
    for (const user of users) {
      try {
        await generateDailySummary(user._id);
        count++;
      } catch (err) {
        console.error(`[Cron] daily summary failed for user ${user._id}:`, err.message);
      }
    }

    res.json({ success: true, usersProcessed: count });
  } catch (err) {
    console.error('[Cron] daily summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/notifications/cron/evaluate-anomalies
 * Endpoint cho cron job — quét bất thường cho tất cả user (chạy mỗi vài giờ)
 */
async function cronEvaluateAnomalies(req, res) {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.CRON_API_KEY || 'expense-tracker-cron-key';
    if (apiKey !== expectedKey) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await User.find({}).select('_id');
    let count = 0;
    for (const user of users) {
      try {
        await evaluateAnomalies(user._id);
        count++;
      } catch (err) {
        console.error(`[Cron] anomaly eval failed for user ${user._id}:`, err.message);
      }
    }

    res.json({ success: true, usersProcessed: count });
  } catch (err) {
    console.error('[Cron] anomaly eval error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, getUnreadCount, markRead, markAllRead, remove, clearAll, cronDailySummary, cronEvaluateAnomalies };
