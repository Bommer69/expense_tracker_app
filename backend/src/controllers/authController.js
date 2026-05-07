/**
 * Auth Controller
 */

const User = require('../models/User');
const Category = require('../models/Category');
const Account = require('../models/Account');
const { generateToken } = require('../utils/auth');

const DEFAULT_CATEGORIES = [
  { name: 'Ăn uống', icon: '🍔', color: '#FF5733', type: 'expense', isDefault: true },
  { name: 'Đi lại', icon: '🚗', color: '#33FF57', type: 'expense', isDefault: true },
  { name: 'Mua sắm', icon: '🛍️', color: '#3357FF', type: 'expense', isDefault: true },
  { name: 'Bills', icon: '📄', color: '#FF33F5', type: 'expense', isDefault: true },
  { name: 'Giải trí', icon: '🎮', color: '#FF9933', type: 'expense', isDefault: true },
  { name: 'Sức khỏe', icon: '💊', color: '#33CCCC', type: 'expense', isDefault: true },
  { name: 'Giáo dục', icon: '📚', color: '#9966FF', type: 'expense', isDefault: true },
  { name: 'Lương', icon: '💰', color: '#33FF99', type: 'income', isDefault: true },
  { name: 'Thưởng', icon: '🎁', color: '#9933FF', type: 'income', isDefault: true },
  { name: 'Khoản thu khác', icon: '💵', color: '#66CC33', type: 'income', isDefault: true },
];

const DEFAULT_ACCOUNTS = [
  { name: 'Tiền mặt', type: 'cash', balance: 0, isDefault: true },
  { name: 'Ngân hàng', type: 'bank', balance: 0, isDefault: false },
];

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  console.log('[AUTH] Register request received:', { email: req.body?.email, name: req.body?.name });
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      console.log('[AUTH] Register failed: missing required fields');
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }

    if (!EMAIL_REGEX.test(email)) {
      console.log('[AUTH] Register failed: invalid email format');
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    if (password.length < 6) {
      console.log('[AUTH] Register failed: password too short');
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    if (name.trim().length < 2) {
      console.log('[AUTH] Register failed: name too short');
      return res.status(400).json({ error: 'Họ tên phải có ít nhất 2 ký tự' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log('[AUTH] Register failed: email already exists');
      return res.status(400).json({ error: 'Email này đã được sử dụng' });
    }

    console.log('[AUTH] Creating new user...');
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash: password,
      name: name.trim()
    });
    console.log('[AUTH] User created:', user.email);

    // Create default categories for user
    console.log('[AUTH] Creating default categories...');
    const categories = DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user._id }));
    await Category.insertMany(categories);

    // Create default accounts for user
    console.log('[AUTH] Creating default accounts...');
    const accounts = DEFAULT_ACCOUNTS.map(a => ({ ...a, userId: user._id }));
    await Account.insertMany(accounts);

    const token = generateToken(user._id);
    console.log('[AUTH] Register successful for user:', user.email);

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.' });
  }
}

async function login(req, res) {
  console.log('[AUTH] Login request received:', { email: req.body?.email });
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('[AUTH] Login failed: missing email or password');
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }

    console.log('[AUTH] Looking up user:', email.toLowerCase().trim());
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log('[AUTH] Login failed: user not found');
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const passwordMatch = await user.comparePassword(password);
    console.log('[AUTH] Password match result:', passwordMatch);

    if (!passwordMatch) {
      console.log('[AUTH] Login failed: incorrect password');
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    const token = generateToken(user._id);
    console.log('[AUTH] Login successful for user:', user.email);

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.' });
  }
}

async function getMe(req, res) {
  console.log('[AUTH] getMe request received');
  try {
    const { getUserId } = require('../utils/auth');
    const userId = getUserId(req);
    console.log('[AUTH] getMe userId:', userId);

    if (!userId) {
      console.log('[AUTH] getMe failed: no userId from token');
      return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn' });
    }

    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      console.log('[AUTH] getMe failed: user not found in database');
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    console.log('[AUTH] getMe successful for user:', user.email);
    res.json({ id: user._id, email: user.email, name: user.name });
  } catch (err) {
    console.error('[AUTH] getMe error:', err);
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

module.exports = { register, login, getMe };