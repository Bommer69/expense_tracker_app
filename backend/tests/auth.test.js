/**
 * auth.test.js – Kiểm thử module Xác thực
 * Endpoint: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
 */
const request = require('supertest');
const app = require('./helpers/app');
const { connect, clearAll, disconnect } = require('./helpers/db');

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearAll(); });
afterAll(async () => { await disconnect(); });

// ─── Đăng ký ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const validPayload = {
    email: 'vinh@example.com',
    password: 'password123',
    name: 'Trịnh Văn Vinh',
  };

  test('TC-AUTH-01: Đăng ký hợp lệ – trả về token và thông tin user', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      email: 'vinh@example.com',
      name: 'Trịnh Văn Vinh',
    });
    expect(res.body.user).toHaveProperty('id');
  });

  test('TC-AUTH-02: Đăng ký seed 10 danh mục mặc định và 2 tài khoản mặc định', async () => {
    const regRes = await request(app).post('/api/auth/register').send(validPayload);
    const token = regRes.body.token;

    const [catRes, accRes] = await Promise.all([
      request(app).get('/api/categories').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`),
    ]);

    expect(catRes.body.length).toBeGreaterThanOrEqual(10);
    expect(accRes.body.length).toBeGreaterThanOrEqual(2);
  });

  test('TC-AUTH-03: Thiếu trường name – 400 lỗi validation', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('TC-AUTH-04: Password quá ngắn (< 6 ký tự) – 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123', name: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ít nhất 6/i);
  });

  test('TC-AUTH-05: Email không đúng định dạng – 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123456', name: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('TC-AUTH-06: Đăng ký email đã tồn tại – 400', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đã được sử dụng/i);
  });

  test('TC-AUTH-07: Email không phân biệt hoa/thường – cùng coi là trùng', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'VINH@EXAMPLE.COM' });

    expect(res.status).toBe(400);
  });
});

// ─── Đăng nhập ─────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'vinh@example.com',
      password: 'password123',
      name: 'Trịnh Văn Vinh',
    });
  });

  test('TC-AUTH-08: Đăng nhập đúng – trả về token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vinh@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.')).toHaveLength(3); // JWT có 3 phần
  });

  test('TC-AUTH-09: Sai mật khẩu – 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vinh@example.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/không đúng/i);
  });

  test('TC-AUTH-10: Email không tồn tại – 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notexist@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  test('TC-AUTH-11: Thiếu password – 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vinh@example.com' });

    expect(res.status).toBe(400);
  });
});

// ─── Lấy thông tin user hiện tại ───────────────────────────────
describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'vinh@example.com',
      password: 'password123',
      name: 'Trịnh Văn Vinh',
    });
    token = res.body.token;
  });

  test('TC-AUTH-12: Token hợp lệ – trả về thông tin user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'vinh@example.com', name: 'Trịnh Văn Vinh' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  test('TC-AUTH-13: Không có token – 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('TC-AUTH-14: Token sai định dạng – 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
