const express = require('express');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);
router.put('/profile', requireAuth, updateProfile);

module.exports = router;
