/**
 * budget.test.js – Kiểm thử module Ngân sách
 * Endpoint: GET/POST/PUT/DELETE /api/budgets, GET /api/budgets/alerts
 */
const request = require('supertest');
const app = require('./helpers/app');
const { connect, clearAll, disconnect } = require('./helpers/db');
const { createUser, getCategories, createTransaction } = require('./helpers/factory');

jest.mock('../src/services/aiClassifier', () => ({
  classifyTransaction: jest.fn().mockResolvedValue({ category: 'Ăn uống', confidence: 0.9 }),
  chatWithAI: jest.fn().mockResolvedValue('mock'),
  getSpendingAdvice: jest.fn().mockResolvedValue('mock'),
  clearUserMemory: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/services/recurringGenerator', () => ({
  generateRecurringTransactions: jest.fn().mockResolvedValue([]),
}));

let token, expenseCategoryId;
const currentMonth = new Date().toISOString().slice(0, 7);

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

beforeEach(async () => {
  await clearAll();
  const user = await createUser();
  token = user.token;
  const categories = await getCategories(token);
  expenseCategoryId = categories.find(c => c.type === 'expense')._id;
});

// ─── Tạo / cập nhật ngân sách ───────────────────────────────────
describe('POST /api/budgets', () => {
  test('TC-BUD-01: Tạo ngân sách mới hợp lệ', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 2000000, month: currentMonth });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ amount: 2000000, month: currentMonth });
    expect(res.body).toHaveProperty('_id');
  });

  test('TC-BUD-02: Upsert – POST cùng categoryId + month cập nhật thay vì tạo mới', async () => {
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 3000000, month: currentMonth });

    const listRes = await request(app)
      .get('/api/budgets')
      .set('Authorization', `Bearer ${token}`);

    const budgets = listRes.body.filter(b => b.categoryId && b.month === currentMonth);
    expect(budgets.length).toBe(1);
    expect(budgets[0].amount).toBe(3000000);
  });

  test('TC-BUD-03: Thiếu token – 401', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    expect(res.status).toBe(401);
  });
});

// ─── Lấy danh sách ngân sách ────────────────────────────────────
describe('GET /api/budgets', () => {
  test('TC-BUD-04: Lấy danh sách ngân sách có spent tính từ transactions', async () => {
    // Tạo ngân sách 2 triệu
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 2000000, month: currentMonth });

    // Tạo 2 giao dịch chi trong tháng
    await createTransaction(token, { amount: 300000, type: 'expense', categoryId: expenseCategoryId });
    await createTransaction(token, { amount: 200000, type: 'expense', categoryId: expenseCategoryId });

    const res = await request(app)
      .get(`/api/budgets?month=${currentMonth}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const budget = res.body.find(b => b.month === currentMonth);
    expect(budget).toBeTruthy();
    expect(budget.spent).toBe(500000);
    expect(budget.amount).toBe(2000000);
  });

  test('TC-BUD-05: Không thấy ngân sách của user khác', async () => {
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 2000000, month: currentMonth });

    const otherUser = await createUser({ email: 'other@example.com' });

    const res = await request(app)
      .get('/api/budgets')
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });
});

// ─── Cập nhật ngân sách ─────────────────────────────────────────
describe('PUT /api/budgets/:id', () => {
  test('TC-BUD-06: Cập nhật amount ngân sách', async () => {
    const createRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    const budgetId = createRes.body._id;

    const res = await request(app)
      .put(`/api/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1500000 });

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(1500000);
  });

  test('TC-BUD-07: Cập nhật ngân sách của user khác – 404', async () => {
    const createRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    const budgetId = createRes.body._id;
    const otherUser = await createUser({ email: 'other3@example.com' });

    const res = await request(app)
      .put(`/api/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ amount: 1 });

    expect(res.status).toBe(404);
  });
});

// ─── Xóa ngân sách ──────────────────────────────────────────────
describe('DELETE /api/budgets/:id', () => {
  test('TC-BUD-08: Xóa ngân sách thành công', async () => {
    const createRes = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    const budgetId = createRes.body._id;

    const res = await request(app)
      .delete(`/api/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Alerts ngân sách ───────────────────────────────────────────
describe('GET /api/budgets/alerts', () => {
  test('TC-BUD-09: Không cảnh báo khi chi tiêu dưới 80%', async () => {
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    // Chi 500k / 1 triệu = 50%
    await createTransaction(token, { amount: 500000, type: 'expense', categoryId: expenseCategoryId });

    const res = await request(app)
      .get('/api/budgets/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  test('TC-BUD-10: Cảnh báo warning khi chi tiêu 80–100%', async () => {
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    // Chi 850k / 1 triệu = 85%
    await createTransaction(token, { amount: 850000, type: 'expense', categoryId: expenseCategoryId });

    // Refresh spent field in Budget (getAlerts uses stored spent, not realtime)
    await request(app).get(`/api/budgets?month=${currentMonth}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/budgets/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].status).toBe('warning');
    expect(res.body[0].percent).toBe(85);
  });

  test('TC-BUD-11: Cảnh báo exceeded khi chi tiêu vượt 100%', async () => {
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: expenseCategoryId, amount: 1000000, month: currentMonth });

    // Chi 1.2 triệu / 1 triệu = 120%
    await createTransaction(token, { amount: 1200000, type: 'expense', categoryId: expenseCategoryId });

    // Refresh spent field in Budget (getAlerts uses stored spent, not realtime)
    await request(app).get(`/api/budgets?month=${currentMonth}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/budgets/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].status).toBe('exceeded');
    expect(res.body[0].percent).toBeGreaterThan(100);
  });
});
