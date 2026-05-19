const express = require('express');
const { chat, getStats, advice, getChatHistory, clearHistory } = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', chat);
router.get('/stats', getStats);
router.get('/advice', advice);
router.get('/chat/history', getChatHistory);
router.delete('/chat/history', clearHistory);

module.exports = router;
