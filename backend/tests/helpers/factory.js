/**
 * factory.js – Tạo dữ liệu test nhanh (user, category, account, transaction).
 */
const request = require('supertest');
const app = require('./app');

const BASE_URL = '';

/**
 * Đăng ký user mới và trả về { token, userId, email }
 */
async function createUser(overrides = {}) {
  const email = overrides.email || `test_${Date.now()}@example.com`;
  const password = overrides.password || 'password123';
  const name = overrides.name || 'Test User';

  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name });

  if (res.status !== 200) {
    throw new Error(`createUser failed: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, userId: res.body.user.id, email, password };
}

/**
 * Lấy danh sách categories của user (mặc định đã seed khi register)
 */
async function getCategories(token) {
  const res = await request(app)
    .get('/api/categories')
    .set('Authorization', `Bearer ${token}`);
  return res.body;
}

/**
 * Tạo giao dịch chi tiêu mẫu
 */
async function createTransaction(token, overrides = {}) {
  const categories = await getCategories(token);
  const expenseCategory = categories.find(c => c.type === 'expense');

  const res = await request(app)
    .post('/api/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      amount: overrides.amount ?? 100000,
      description: overrides.description ?? 'Ăn sáng',
      type: overrides.type ?? 'expense',
      categoryId: overrides.categoryId ?? expenseCategory._id,
      date: overrides.date ?? new Date().toISOString(),
      ...overrides,
    });

  if (res.status !== 200) {
    throw new Error(`createTransaction failed: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

module.exports = { createUser, getCategories, createTransaction };
