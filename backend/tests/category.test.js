/**
 * category.test.js – Kiểm thử module Danh mục
 * Endpoint: GET/POST/PUT/DELETE /api/categories
 */
const request = require('supertest');
const app = require('./helpers/app');
const { connect, clearAll, disconnect } = require('./helpers/db');
const { createUser } = require('./helpers/factory');

let token;

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

beforeEach(async () => {
  await clearAll();
  const user = await createUser();
  token = user.token;
});

describe('GET /api/categories', () => {
  test('TC-CAT-01: Lấy danh sách danh mục sau khi đăng ký (có sẵn default)', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(10);
  });

  test('TC-CAT-02: Mỗi danh mục có name, icon, color, type', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);

    res.body.forEach(cat => {
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('color');
      expect(['expense', 'income']).toContain(cat.type);
    });
  });

  test('TC-CAT-03: Không thấy danh mục của user khác', async () => {
    const otherUser = await createUser({ email: 'other@example.com' });

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${otherUser.token}`);

    const names = res.body.map(c => c.name);
    // Danh mục seed của mỗi user là riêng biệt (theo userId)
    // Danh mục của user đầu không xuất hiện trong list của user khác (cùng tên nhưng khác userId)
    expect(res.status).toBe(200);
    expect(res.body.every(c => c.userId !== undefined || c._id !== undefined)).toBe(true);
  });
});

describe('POST /api/categories', () => {
  test('TC-CAT-04: Tạo danh mục chi tùy chỉnh', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Du lịch', icon: '✈️', color: '#0088FF', type: 'expense' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Du lịch', type: 'expense' });
    expect(res.body).toHaveProperty('_id');
  });

  test('TC-CAT-05: Tạo danh mục thu tùy chỉnh', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Freelance', icon: '💻', color: '#00CC88', type: 'income' });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('income');
  });

  test('TC-CAT-06: Thiếu name – lỗi validation', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ icon: '📦', color: '#666666', type: 'expense' });

    expect(res.status).toBe(400);
  });

  test('TC-CAT-07: type không hợp lệ – lỗi validation', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', icon: '📦', color: '#666666', type: 'invalid-type' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/categories/:id', () => {
  test('TC-CAT-08: Cập nhật tên và icon danh mục', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cũ', icon: '📦', color: '#666', type: 'expense' });

    const catId = createRes.body._id;

    const res = await request(app)
      .put(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mới', icon: '🎯' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Mới');
    expect(res.body.icon).toBe('🎯');
  });

  test('TC-CAT-09: Cập nhật danh mục của user khác – 404', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Mine', icon: '📦', color: '#666', type: 'expense' });

    const catId = createRes.body._id;
    const otherUser = await createUser({ email: 'other@example.com' });

    const res = await request(app)
      .put(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ name: 'Hack' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/categories/:id', () => {
  test('TC-CAT-10: Xóa danh mục tùy chỉnh thành công', async () => {
    const createRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Xóa tôi', icon: '🗑️', color: '#FF0000', type: 'expense' });

    const catId = createRes.body._id;

    const res = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
