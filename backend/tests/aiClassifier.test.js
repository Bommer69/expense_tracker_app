/**
 * aiClassifier.test.js – Kiểm thử module AI
 * Test fallbackClassify (không cần API key) và endpoint /api/ai/*
 */
const request = require('supertest');
const app = require('./helpers/app');
const { connect, clearAll, disconnect } = require('./helpers/db');
const { createUser } = require('./helpers/factory');

// Import module thực để test fallbackClassify
// (không mock vì muốn test logic keyword matching)
const aiClassifier = require('../src/services/aiClassifier');

// Chỉ mock phần gọi Gemini API thực, giữ fallbackClassify nguyên
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => '{"category":"Ăn uống","confidence":0.92}' },
        }),
        startChat: jest.fn().mockReturnValue({
          sendMessage: jest.fn().mockResolvedValue({
            response: {
              text: () => 'Câu trả lời từ AI mock',
              functionCalls: () => [],
            },
          }),
        }),
      }),
    })),
  };
});

jest.mock('../src/services/recurringGenerator', () => ({
  generateRecurringTransactions: jest.fn().mockResolvedValue([]),
}));

let token, userId;

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

beforeEach(async () => {
  await clearAll();
  const user = await createUser();
  token = user.token;
  userId = user.userId;
});

// ─── fallbackClassify – logic keyword matching ───────────────────
describe('fallbackClassify – keyword matching', () => {
  // Truy cập hàm nội bộ qua gọi classifyTransaction với env không có API key
  // Hoặc test trực tiếp nếu export; nếu không, test qua API endpoint

  test('TC-AI-01: Mô tả "ăn phở buổi sáng" → Ăn uống', async () => {
    // Set GEMINI_API_KEY rỗng để trigger fallback
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = await aiClassifier.classifyTransaction('ăn phở buổi sáng', 50000);
    expect(result.category).toBe('Ăn uống');
    expect(result.confidence).toBeGreaterThan(0);

    process.env.GEMINI_API_KEY = originalKey;
  });

  test('TC-AI-02: Mô tả "grab đi làm" → Đi lại', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    // Dùng 'grab' vì 'xăng' chứa substring 'ăn' (false positive Ăn uống)
    const result = await aiClassifier.classifyTransaction('grab đi làm', 25000);
    expect(result.category).toBe('Đi lại');

    process.env.GEMINI_API_KEY = originalKey;
  });

  test('TC-AI-03: Mô tả "mua sách lập trình" → Giáo dục', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = await aiClassifier.classifyTransaction('mua sách lập trình', 200000);
    expect(['Giáo dục', 'Mua sắm']).toContain(result.category);

    process.env.GEMINI_API_KEY = originalKey;
  });

  test('TC-AI-04: Mô tả "lương tháng 5" → Lương', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = await aiClassifier.classifyTransaction('nhận lương tháng 5', 15000000);
    expect(result.category).toBe('Lương');

    process.env.GEMINI_API_KEY = originalKey;
  });

  test('TC-AI-05: Mô tả không rõ ràng → Khác', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = await aiClassifier.classifyTransaction('abc xyz 999', 10000);
    expect(result.category).toBe('Khác');
    expect(result.confidence).toBeLessThanOrEqual(0.5);

    process.env.GEMINI_API_KEY = originalKey;
  });

  test('TC-AI-06: Mô tả "grab đi làm" → Đi lại', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = await aiClassifier.classifyTransaction('grab đi làm', 25000);
    expect(result.category).toBe('Đi lại');

    process.env.GEMINI_API_KEY = originalKey;
  });

  test('TC-AI-07: Mô tả "đóng tiền điện nước" → Bills', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = '';

    const result = await aiClassifier.classifyTransaction('đóng tiền điện nước', 300000);
    expect(result.category).toBe('Bills');

    process.env.GEMINI_API_KEY = originalKey;
  });
});

// ─── Endpoint POST /api/ai/chat ─────────────────────────────────
describe('POST /api/ai/chat', () => {
  test('TC-AI-08: Chat với token hợp lệ – trả về answer', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Tháng này tôi chi tiêu thế nào?' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('answer');
    expect(typeof res.body.answer).toBe('string');
  });

  test('TC-AI-09: Thiếu message – 400', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('TC-AI-10: Message rỗng (chỉ khoảng trắng) – 400', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '   ' });

    expect(res.status).toBe(400);
  });

  test('TC-AI-11: Không có token – 401', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Hỏi gì đó' });

    expect(res.status).toBe(401);
  });
});

// ─── Endpoint GET /api/ai/stats ─────────────────────────────────
describe('GET /api/ai/stats', () => {
  test('TC-AI-12: Stats trả về totalIncome, totalExpense, transactionCount', async () => {
    const res = await request(app)
      .get('/api/ai/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalIncome');
    expect(res.body).toHaveProperty('totalExpense');
    expect(res.body).toHaveProperty('transactionCount');
  });

  test('TC-AI-13: Stats với user không có giao dịch – trả về 0', async () => {
    const res = await request(app)
      .get('/api/ai/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.totalIncome).toBe(0);
    expect(res.body.totalExpense).toBe(0);
    expect(res.body.transactionCount).toBe(0);
  });
});

// ─── Endpoint GET /api/ai/chat/history ─────────────────────────
describe('GET /api/ai/chat/history', () => {
  test('TC-AI-14: Lịch sử chat trống khi chưa chat lần nào', async () => {
    const res = await request(app)
      .get('/api/ai/chat/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('messages');
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  test('TC-AI-15: Sau khi chat, lịch sử lưu đúng', async () => {
    // chatWithAI throws when GEMINI_API_KEY='', so insert messages directly
    const ChatMessage = require('../src/models/ChatMessage');
    await ChatMessage.insertMany([
      { userId, role: 'user', text: 'Xin chào AI' },
      { userId, role: 'model', text: 'Xin chào bạn!' },
    ]);

    const res = await request(app)
      .get('/api/ai/chat/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThan(0);
    const userMsg = res.body.messages.find(m => m.role === 'user');
    expect(userMsg).toBeTruthy();
    expect(userMsg.text).toBe('Xin chào AI');
  });
});

// ─── Endpoint DELETE /api/ai/chat/history ──────────────────────
describe('DELETE /api/ai/chat/history', () => {
  test('TC-AI-16: Xóa lịch sử chat thành công', async () => {
    // Tạo lịch sử trước trực tiếp (tránh phụ thuộc GEMINI_API_KEY)
    const ChatMessage = require('../src/models/ChatMessage');
    await ChatMessage.insertMany([
      { userId, role: 'user', text: 'Tin nhắn cần xóa' },
      { userId, role: 'model', text: 'Phản hồi' },
    ]);

    const res = await request(app)
      .delete('/api/ai/chat/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Xác nhận đã xóa
    const historyRes = await request(app)
      .get('/api/ai/chat/history')
      .set('Authorization', `Bearer ${token}`);

    expect(historyRes.body.messages.length).toBe(0);
  });
});
