const { GoogleGenerativeAI } = require('@google/generative-ai');
const { toolDeclarations, toolFunctions } = require('./aiTools');

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

// Per-user conversation history: [{role:'user'|'model', parts:[...]}]
const userHistories = new Map();
const MAX_HISTORY = 20;

function getHistory(userId) {
  const key = String(userId);
  if (!userHistories.has(key)) userHistories.set(key, []);
  return userHistories.get(key);
}

function clearUserMemory(userId) {
  userHistories.delete(String(userId));
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

  const history = getHistory(userId);
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

  // Lưu history (chỉ user/model, không lưu function call turns)
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

module.exports = { chatWithAI, classifyTransaction, getSpendingAdvice, clearUserMemory };
