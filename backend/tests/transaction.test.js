/**
 * transaction.test.js – Kiểm thử module Giao dịch
 * Endpoint: GET/POST/PUT/DELETE /api/transactions, GET /api/transactions/summary
 */
const request = require('supertest');
const app = require('./helpers/app');
const { connect, clearAll, disconnect } = require('./helpers/db');
const { createUser, getCategories, createTransaction } = require('./helpers/factory');

// Mock service gọi Gemini và recurring để tránh side effects
jest.mock('../src/services/aiClassifier', () => ({
  classifyTransaction: jest.fn().mockResolvedValue({ category: 'Ăn uống', confidence: 0.9 }),
  chatWithAI: jest.fn().mockResolvedValue('Đây là câu trả lời test'),
  getSpendingAdvice: jest.fn().mockResolvedValue('Lời khuyên test'),
  clearUserMemory: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/services/recurringGenerator', () => ({
  generateRecurringTransactions: jest.fn().mockResolvedValue([]),
}));

let token, expenseCategoryId, incomeCategoryId;

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

beforeEach(async () => {
  await clearAll();
  const user = await createUser();
  token = user.token;
  const categories = await getCategories(token);
  expenseCategoryId = categories.find(c => c.type === 'expense')._id;
  incomeCategoryId  = categories.find(c => c.type === 'income')._id;
});

// ─── Tạo giao dịch ─────────────────────────────────────────────
describe('POST /api/transactions', () => {
  test('TC-TX-01: Tạo giao dịch chi hợp lệ – trả về object đầy đủ', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 150000,
        description: 'Ăn phở buổi sáng',
        type: 'expense',
        categoryId: expenseCategoryId,
        date: new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      amount: 150000,
      type: 'expense',
      description: 'Ăn phở buổi sáng',
    });
    expect(res.body).toHaveProperty('_id');
    expect(res.body.categoryId).toBeTruthy();
  });

  test('TC-TX-02: Tạo giao dịch thu hợp lệ', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 5000000,
        description: 'Lương tháng 5',
        type: 'income',
        categoryId: incomeCategoryId,
        date: new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('income');
    expect(res.body.amount).toBe(5000000);
  });

  test('TC-TX-03: Tạo giao dịch không có categoryId – AI tự phân loại', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 50000,
        description: 'Ăn cơm',
        type: 'expense',
        date: new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('aiCategory');
  });

  test('TC-TX-04: Thiếu amount – lỗi validation', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Thiếu amount',
        type: 'expense',
        categoryId: expenseCategoryId,
        date: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
  });

  test('TC-TX-05: Gọi không có token – 401', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .send({ amount: 100000, type: 'expense', categoryId: expenseCategoryId });

    expect(res.status).toBe(401);
  });
});

// ─── Lấy danh sách giao dịch ────────────────────────────────────
describe('GET /api/transactions', () => {
  beforeEach(async () => {
    // Tạo sẵn 5 giao dịch chi + 2 giao dịch thu
    for (let i = 0; i < 5; i++) {
      await createTransaction(token, { amount: (i + 1) * 10000, type: 'expense' });
    }
    await createTransaction(token, { amount: 3000000, type: 'income', categoryId: incomeCategoryId });
    await createTransaction(token, { amount: 2000000, type: 'income', categoryId: incomeCategoryId });
  });

  test('TC-TX-06: Lấy tất cả giao dịch – trả về array', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);
  });

  test('TC-TX-07: Lọc theo type=expense', async () => {
    const res = await request(app)
      .get('/api/transactions?type=expense')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.every(t => t.type === 'expense')).toBe(true);
    expect(res.body.length).toBe(5);
  });

  test('TC-TX-08: Lọc theo type=income', async () => {
    const res = await request(app)
      .get('/api/transactions?type=income')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('TC-TX-09: Giới hạn kết quả bằng limit', async () => {
    const res = await request(app)
      .get('/api/transactions?limit=3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  test('TC-TX-10: Không thấy giao dịch của user khác', async () => {
    const otherUser = await createUser({ email: 'other@example.com' });
    await createTransaction(otherUser.token, { amount: 999999, type: 'expense' });

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);

    const amounts = res.body.map(t => t.amount);
    expect(amounts).not.toContain(999999);
  });
});

// ─── Cập nhật giao dịch ─────────────────────────────────────────
describe('PUT /api/transactions/:id', () => {
  test('TC-TX-11: Cập nhật amount và description', async () => {
    const tx = await createTransaction(token, { amount: 100000 });

    const res = await request(app)
      .put(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 200000, description: 'Đã sửa' });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(200000);
    expect(res.body.description).toBe('Đã sửa');
  });

  test('TC-TX-12: Sửa giao dịch của user khác – 404', async () => {
    const tx = await createTransaction(token);
    const otherUser = await createUser({ email: 'other@example.com' });

    const res = await request(app)
      .put(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ amount: 1 });

    expect(res.status).toBe(404);
  });
});

// ─── Xóa giao dịch ──────────────────────────────────────────────
describe('DELETE /api/transactions/:id', () => {
  test('TC-TX-13: Xóa giao dịch thành công', async () => {
    const tx = await createTransaction(token);

    const res = await request(app)
      .delete(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Xác nhận đã bị xóa
    const listRes = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.find(t => t._id === tx._id)).toBeUndefined();
  });

  test('TC-TX-14: Xóa giao dịch của user khác – 404', async () => {
    const tx = await createTransaction(token);
    const otherUser = await createUser({ email: 'other2@example.com' });

    const res = await request(app)
      .delete(`/api/transactions/${tx._id}`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(res.status).toBe(404);
  });
});

// ─── Summary ─────────────────────────────────────────────────────
describe('GET /api/transactions/summary', () => {
  test('TC-TX-15: Summary tổng hợp thu/chi đúng trong tháng', async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    await createTransaction(token, { amount: 200000, type: 'expense' });
    await createTransaction(token, { amount: 100000, type: 'expense' });
    await createTransaction(token, { amount: 5000000, type: 'income', categoryId: incomeCategoryId });

    const res = await request(app)
      .get(`/api/transactions/summary?month=${currentMonth}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalExpense).toBe(300000);
    expect(res.body.totalIncome).toBe(5000000);
  });
});
