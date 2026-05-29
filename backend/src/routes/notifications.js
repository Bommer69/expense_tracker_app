const express = require('express');
const router = express.Router();
const {
  getAll,
  getUnreadCount,
  markRead,
  markAllRead,
  remove,
  clearAll,
  cronDailySummary,
  cronEvaluateAnomalies,
  registerPushToken,
  removePushToken,
  getPushTokens,
} = require('../controllers/notificationController');

router.get('/', getAll);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/clear', clearAll);
router.delete('/:id', remove);

// Push token endpoints
router.post('/push-token', registerPushToken);
router.delete('/push-token', removePushToken);
router.get('/push-tokens', getPushTokens);

// Cron job endpoints (protected by API key)
router.post('/cron/daily-summary', cronDailySummary);
router.post('/cron/evaluate-anomalies', cronEvaluateAnomalies);

module.exports = router;
