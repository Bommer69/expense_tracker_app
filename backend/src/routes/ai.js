const express = require('express');
const { chat, getStats, advice } = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', chat);
router.get('/stats', getStats);
router.get('/advice', advice);

module.exports = router;