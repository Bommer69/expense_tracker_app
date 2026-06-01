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

/**
 * Validate & sanitize history array để đảm bảo:
 * - Phần tử đầu tiên luôn là role 'user'
 * - Không có tin nhắn 'model' liên tiếp (luân phiên user→model→user→model)
 * Nếu history trống hoặc chỉ có 'model', trả về mảng rỗng.
 */
function sanitizeHistory(raw) {
  // Loại bỏ các 'model' ở đầu
  let cleaned = [...raw];
  while (cleaned.length > 0 && cleaned[0].role !== 'user') {
    cleaned.shift();
  }
  
  // Đảm bảo luân phiên user→model→user→model
  const result = [];
  let expectedRole = 'user';
  for (const msg of cleaned) {
    if (msg.role === expectedRole) {
      result.push({ role: msg.role, parts: Array.isArray(msg.parts) ? msg.parts : [{ text: msg.parts?.[0]?.text || '' }] });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
    // Bỏ qua message sai thứ tự (duplicate role)
  }
  
  // Nếu kết thúc ở 'user', giữ nguyên (Gemini đang đợi 'model')
  // Nếu kết thúc ở 'model', cũng OK
  
  return result;
}

async function getHistory(userId) {
  const key = String(userId);
  if (!userHistories.has(key)) {
    const msgs = await ChatMessage.find({ userId })
      .sort({ createdAt: 1 })
      .limit(MAX_HISTORY);
    const raw = msgs.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    userHistories.set(key, sanitizeHistory(raw));
  }
  return userHistories.get(key).map(m => ({ role: m.role, parts: m.parts.map(p => ({ ...p })) }));
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
  const chat = chatModel.startChat({ history });

  // Set timeout để tránh request treo quá lâu
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT: Gemini không phản hồi trong 30 giây')), 30000)
  );

  let result = await Promise.race([chat.sendMessage(message), timeoutPromise]);

  // Function-calling loop — AI có thể gọi nhiều tool liên tiếp
  let iterations = 0;
  while (result.response.functionCalls()?.length > 0 && iterations < 5) {
    iterations++;
    const calls = result.response.functionCalls();
    if (!calls || calls.length === 0) break;
    
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

    const timeoutPromise2 = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT: Gemini không phản hồi trong 30 giây')), 30000)
    );
    result = await Promise.race([chat.sendMessage(functionResponses), timeoutPromise2]);
  }

  // Lấy text response — nếu rỗng thì thử lấy từ candidate đầu tiên
  let replyText = '';
  try {
    replyText = result.response.text();
  } catch (e) {
    // response.text() có thể throw nếu response bị block hoặc rỗng
    try {
      const candidates = result.response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        replyText = parts.map(p => p.text || '').filter(Boolean).join(' ');
      }
    } catch (e2) {
      replyText = '';
    }
  }

  if (!replyText || replyText.trim() === '') {
    replyText = '🤖 AI không thể tạo phản hồi cho câu hỏi này. Vui lòng thử lại với cách diễn đạt khác.';
  }

  // Lưu vào DB (và cập nhật cache nếu thành công)
  try {
    await ChatMessage.insertMany([
      { userId, role: 'user', text: message },
      { userId, role: 'model', text: replyText },
    ]);
    
    // Cập nhật cache — lưu sanitized vào cache
    const key = String(userId);
    const cache = userHistories.get(key) || [];
    cache.push({ role: 'user', parts: [{ text: message }] });
    cache.push({ role: 'model', parts: [{ text: replyText }] });
    if (cache.length > MAX_HISTORY) {
      cache.splice(0, cache.length - MAX_HISTORY);
    }
  } catch (dbErr) {
    console.error('[AI Chat] Failed to save chat history:', dbErr.message);
    // Không throw — vẫn trả về response cho user
    // Không cập nhật cache để tránh lệch với DB
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

/**
 * Tạo báo cáo tổng kết tháng bằng AI
 */
async function generateMonthlySummaryText(monthData) {
  const gemini = getModel();
  if (!gemini) return null;

  const prompt = `Bạn là chuyên gia tài chính cá nhân. Hãy tổng kết tình hình tài chính tháng dựa trên dữ liệu sau và đưa ra nhận xét bằng tiếng Việt, giọng văn thân thiện, dễ hiểu.

---
DỮ LIỆU THÁNG ${monthData.month}:
Tổng thu nhập: ${monthData.totalIncome.toLocaleString()} VND
Tổng chi tiêu: ${monthData.totalExpense.toLocaleString()} VND
Tiết kiệm: ${(monthData.totalIncome - monthData.totalExpense).toLocaleString()} VND
Số giao dịch: ${monthData.transactionCount} giao dịch

CHI TIẾT CHI TIÊU THEO DANH MỤC:
${monthData.categoryDetails}

CHI TIẾT NGÂN SÁCH:
${monthData.budgetDetails || 'Chưa có ngân sách'}

SO SÁNH VỚI THÁNG TRƯỚC:
${monthData.compareText || 'Chưa có dữ liệu tháng trước'}
---

Yêu cầu:
1. Tổng kết ngắn gọn tình hình thu chi trong tháng
2. Nhận xét về các danh mục chi tiêu nổi bật (cao nhất, bất thường)
3. Đánh giá tổng thể: Tuyệt vời / Ổn định / Cần cẩn thận / Đang chi quá tay
4. Gợi ý 1-2 lời khuyên cho tháng tới

Trả lời CHỈ JSON, không có text khác:
{
  "title": "📊 Tổng kết Tháng <tên tháng> - <đánh giá>",
  "message": "tóm tắt 1-2 câu ngắn gọn, tối đa 180 ký tự",
  "severity": "info",
  "fullAnalysis": "phân tích chi tiết tối đa 8 dòng"
}

Ghi chú severity: "info" nếu tài chính ổn định/tốt, "warning" nếu chi tiêu hơi cao, "critical" nếu chi tiêu vượt quá nhiều so với thu nhập.`;

  try {
    const result = await gemini.generateContent(prompt);
    const content = result.response.text();
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        title: parsed.title || '📊 Tổng kết tháng',
        message: parsed.message || 'Chưa có dữ liệu.',
        severity: ['info', 'warning', 'critical'].includes(parsed.severity) ? parsed.severity : 'info',
        fullAnalysis: parsed.fullAnalysis || '',
      };
    }
    return null;
  } catch (err) {
    console.error('[AI Classifier] generateMonthlySummaryText error:', err.message);
    return null;
  }
}

module.exports = { chatWithAI, classifyTransaction, getSpendingAdvice, clearUserMemory, generateFinancialInsight, generateMonthlySummaryText };
