/**
 * Authentication Middleware
 * 
 * Extracts and verifies JWT token from Authorization header,
 * attaches userId to req.userId.
 */

const { getUserId } = require('../utils/auth');

/**
 * Middleware: yêu cầu đăng nhập
 * Trả về 401 nếu token không hợp lệ hoặc thiếu
 */
function requireAuth(req, res, next) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Vui lòng đăng nhập.' });
  }
  req.userId = userId;
  next();
}

/**
 * Middleware: tùy chọn — gắn userId nếu có token, không block nếu thiếu
 */
function optionalAuth(req, res, next) {
  req.userId = getUserId(req) || null;
  next();
}

module.exports = { requireAuth, optionalAuth };
