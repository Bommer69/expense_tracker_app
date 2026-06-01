const express = require('express');
const { chat, getStats, advice, getChatHistory, clearHistory } = require('../controllers/aiController');
const { generateMonthlySummary } = require('../services/aiTriggerService');
const { getUserId } = require('../utils/auth');

const router = express.Router();

router.post('/chat', chat);
router.get('/stats', getStats);
router.get('/advice', advice);
router.get('/chat/history', getChatHistory);
router.delete('/chat/history', clearHistory);

// Manual trigger: tổng kết tháng bằng AI
router.post('/monthly-summary', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    await generateMonthlySummary(userId);
    res.json({ success: true, message: 'Đã tạo báo cáo tổng kết tháng.' });
  } catch (err) {
    console.error('[MonthlySummary] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
