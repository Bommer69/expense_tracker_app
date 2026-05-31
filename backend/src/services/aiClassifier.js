const { GoogleGenerativeAI } = require('@google/generative-ai');
const { toolDeclarations, toolFunctions } = require('./aiTools');
const ChatMessage = require('../models/ChatMessage');

let genAI = null;
let model = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'your-gemini-api-key-here') return null;
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function getModel() {
  if (!model) {
    const ai = getGenAI();
    if (!ai) return null;
    model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
}

// In-memory cache: userId(string) → [{role, parts}[]}]
// Cache được load từ DB lần đầu, sau đó dùng cache cho tốc độ
const userHistories = new Map();
const MAX_HISTORY = 40; // 20 exchanges

async function getHistory(userId) {
  const key = String(userId);
  if (!userHistories.has(key)) {
    const msgs = await ChatMessage.find({ userId })
      .sort({ createdAt: 1 })
      .limit(MAX_HISTORY);
    userHistories.set(key, msgs.map(m => ({ role: m.role, parts: [{ text: m.text }] })));
  }
  return userHistories.get(key);
}

async function clearUserMemory(userId) {
  userHistories.delete(String(userId));
  await ChatMessage.deleteMany({ userId });
}

/**
 * Chat với AI dùng native Gemini function calling.
 * AI tự quyết định gọi tool nào để truy vấn MongoDB.
 */
async function chatWithAI(message, userId) {
  const ai = getGenAI();
  if (!ai) throw new Error('GEMINI_API_KEY chưa được cấu hình');

  const chatModel = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `Bạn là "Trợ lý Chi tiêu Thông minh" - AI chuyên về quản lý tài chính cá nhân.
Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa 200 từ). Dùng emoji sinh động.
Hãy dùng công cụ để lấy số liệu chính xác từ database trước khi trả lời.
Đơn vị tiền tệ là VND.`,
    tools: [{ functionDeclarations: toolDeclarations }],
  });

  const history = await getHistory(userId);
  const chat = chatModel.startChat({ history: [...history] });

  let result = await chat.sendMessage(message);

  // Function-calling loop — AI có thể gọi nhiều tool liên tiếp
  let iterations = 0;
  while (result.response.functionCalls()?.length > 0 && iterations < 5) {
    iterations++;
    const calls = result.response.functionCalls();
    const functionResponses = [];

    for (const call of calls) {
      const fn = toolFunctions[call.name];
      let output;
      try {
        output = fn ? await fn(call.args, userId) : `Tool "${call.name}" không tồn tại`;
      } catch (err) {
        output = `Lỗi khi truy vấn: ${err.message}`;
      }
      functionResponses.push({
        functionResponse: { name: call.name, response: { result: String(output) } },
      });
    }

    result = await chat.sendMessage(functionResponses);
  }

  const replyText = result.response.text();

  // Lưu vào DB và cập nhật cache
  await ChatMessage.insertMany([
    { userId, role: 'user', text: message },
    { userId, role: 'model', text: replyText },
  ]);
  history.push({ role: 'user', parts: [{ text: message }] });
  history.push({ role: 'model', parts: [{ text: replyText }] });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  return replyText;
}

/**
 * Lời khuyên chi tiêu (stateless)
 */
async function getSpendingAdvice(context) {
  const gemini = getModel();
  if (!gemini) return 'Hãy cấu hình GEMINI_API_KEY để nhận lời khuyên từ AI! 🤖';

  const prompt = `Dựa vào dữ liệu chi tiêu sau, đưa ra 3 lời khuyên ngắn gọn (mỗi lời dưới 30 từ) để tiết kiệm chi tiêu hiệu quả hơn. Dùng emoji.

${context}

Trả lời dưới dạng danh sách 3 mục, mỗi mục một dòng.`;

  const result = await gemini.generateContent(prompt);
  return result.response.text();
}

/**
 * Phân loại giao dịch (stateless)
 */
async function classifyTransaction(description, amount) {
  const gemini = getModel();
  if (!gemini) return fallbackClassify(description);

  try {
    const prompt = `Phân loại giao dịch tài chính sau vào đúng 1 danh mục.

Danh mục cho phép: Ăn uống, Đi lại, Mua sắm, Bills, Giải trí, Sức khỏe, Giáo dục, Nhà ở, Lương, Thưởng, Đầu tư, Khoản thu khác, Khác

Mô tả: "${description}"
Số tiền: ${amount} VND

Trả lời CHỈ JSON, không có text khác:
{"category": "tên danh mục", "confidence": 0.0-1.0}`;

    const result = await gemini.generateContent(prompt);
    const content = result.response.text();
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return fallbackClassify(description);
  } catch (err) {
    console.log('AI classification failed:', err.message);
    return fallbackClassify(description);
  }
}

function fallbackClassify(description) {
  const desc = (description || '').toLowerCase();
  const keywords = {
    'Ăn uống': ['ăn', 'uống', 'cafe', 'cà phê', 'cơm', 'bún', 'phở', 'đồ ăn', 'food', 'drink', 'trà', 'bia', 'nhà hàng', 'quán'],
    'Đi lại': ['grab', 'bike', 'xe', 'taxi', 'bus', 'buýt', 'tàu', 'metro', 'xăng', 'đi lại', 'transport', 'gojek', 'be'],
    'Mua sắm': ['mua', 'shop', 'amazon', 'shopee', 'lazada', 'tiki', 'đồ', 'quần', 'áo', 'giày'],
    'Bills': ['điện', 'nước', 'internet', 'wifi', 'phone', 'điện thoại', 'bill', 'tiền nhà', 'thuê'],
    'Giải trí': ['game', 'phim', 'netflix', 'spotify', 'youtube', 'giải trí', 'entertainment', 'karaoke'],
    'Sức khỏe': ['bệnh', 'thuốc', 'hospital', 'clinic', 'y tế', 'khám', 'sức khỏe', 'gym', 'tập'],
    'Giáo dục': ['học', 'sách', 'khóa', 'course', 'school', 'trường', 'giáo dục'],
    'Lương': ['lương', 'salary', 'payroll'],
    'Thưởng': ['thưởng', 'bonus', 'award'],
  };
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(w => desc.includes(w))) return { category, confidence: 0.7 };
  }
  return { category: 'Khác', confidence: 0.5 };
}

/**
 * AI tự động đánh giá giao dịch và trả về insight có cấu trúc.
 * Dùng cho trigger service tạo notification thông minh.
 */
async function generateFinancialInsight(context) {
  const gemini = getModel();
  if (!gemini) return null;

  const prompt = `Bạn là chuyên gia tài chính cá nhân. Hãy phân tích giao dịch vừa xảy ra dựa trên dữ liệu sau và đưa ra nhận xét ngắn gọn bằng tiếng Việt.

---
DỮ LIỆU:
Số tiền: ${context.amount.toLocaleString()} VND
Loại: ${context.type === 'expense' ? '💸 Chi tiêu' : '💰 Thu nhập'}
Danh mục: ${context.category}
Mô tả: ${context.description}
Thu nhập tháng này: ${(context.monthIncome || 0).toLocaleString()} VND
Chi tiêu tháng này: ${(context.monthExpense || 0).toLocaleString()} VND
Số dư hiện tại: ${(context.balanceAfter || 0).toLocaleString()} VND
Ngân sách tháng này:\n${context.monthBudget || 'Chưa có ngân sách'}
---

Yêu cầu:
- Nếu là CHI TIÊU: nhận xét mức độ hợp lý (hợp lý / hơi cao / quá cao), so với tổng chi tháng và đưa ra lời khuyên.
- Nếu là THU NHẬP: nhận xét tích cực, gợi ý tiết kiệm hoặc đầu tư.
- Đánh giá tổng thể tài chính: Ổn định / Cần thận trọng / Đang chi quá tay.

Trả lời CHỈ JSON, không có text khác:
{
  "title": "tiêu đề ngắn gọn có emoji, tối đa 40 ký tự",
  "message": "nội dung chi tiết 1-2 câu, tối đa 150 ký tự",
  "severity": "info",
  "fullAnalysis": "phân tích đầy đủ hơn, tối đa 5 dòng"
}

Ghi chú severity: "info" nếu bình thường, "warning" nếu cần chú ý, "critical" nếu rất bất thường.`;

  try {
    const result = await gemini.generateContent(prompt);
    const content = result.response.text();
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        title: parsed.title || '🤖 AI nhận xét',
        message: parsed.message || 'Không có nhận xét.',
        severity: ['info', 'warning', 'critical'].includes(parsed.severity) ? parsed.severity : 'info',
        fullAnalysis: parsed.fullAnalysis || parsed.message || '',
      };
    }
    return null;
  } catch (err) {
    console.error('[AI Classifier] generateFinancialInsight error:', err.message);
    return null;
  }
}

module.exports = { chatWithAI, classifyTransaction, getSpendingAdvice, clearUserMemory, generateFinancialInsight };
