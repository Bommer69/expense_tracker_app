const express = require('express');
const { chat, getStats, advice, clearHistory } = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', chat);
router.get('/stats', getStats);
router.get('/advice', advice);
router.delete('/chat/history', clearHistory);

module.exports = router;