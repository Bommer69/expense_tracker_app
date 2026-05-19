/**
 * AI Gemini Service
 * Uses Google Gemini API for AI features
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return null;
    }
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }
  return model;
}

/**
 * Chat with AI about expenses
 */
async function chatWithAI(message, context) {
  const gemini = getModel();
  if (!gemini) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình');
  }

  const prompt = `Bạn là "Trợ lý Chi tiêu Thông minh" - một AI chuyên về quản lý tài chính cá nhân.
Hãy trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa 150 từ).
Sử dụng emoji phù hợp để câu trả lời sinh động hơn.

DỮ LIỆU CHI TIÊU CỦA NGƯỜI DÙNG:
${context}

CÂU HỎI: ${message}

Lưu ý:
- Nếu hỏi về chi tiêu, hãy phân tích dựa trên dữ liệu thực
- Đưa ra lời khuyên cụ thể, thiết thực
- Nếu không đủ dữ liệu, hãy nói rõ và gợi ý thêm giao dịch
- Đơn vị tiền tệ là VND`;

  const result = await gemini.generateContent(prompt);
  return result.response.text();
}

/**
 * Classify transaction using AI
 */
async function classifyTransaction(description, amount) {
  const gemini = getModel();
  
  if (!gemini) {
    // Fallback to keyword-based classification
    return fallbackClassify(description, amount);
  }

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
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed;
    }
    return fallbackClassify(description, amount);
  } catch (err) {
    console.log('AI classification failed:', err.message);
    return fallbackClassify(description, amount);
  }
}

/**
 * Get AI spending advice
 */
async function getSpendingAdvice(context) {
  const gemini = getModel();
  if (!gemini) {
    return 'Hãy cấu hình GEMINI_API_KEY để nhận lời khuyên từ AI! 🤖';
  }

  const prompt = `Dựa vào dữ liệu chi tiêu sau, đưa ra 3 lời khuyên ngắn gọn (mỗi lời dưới 30 từ) để tiết kiệm chi tiêu hiệu quả hơn. Dùng emoji.

${context}

Trả lời dưới dạng danh sách 3 mục, mỗi mục một dòng.`;

  const result = await gemini.generateContent(prompt);
  return result.response.text();
}

// Keyword-based fallback classification
function fallbackClassify(description, amount) {
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
    if (words.some(w => desc.includes(w))) {
      return { category, confidence: 0.7 };
    }
  }
  
  return { category: 'Khác', confidence: 0.5 };
}

module.exports = { chatWithAI, classifyTransaction, getSpendingAdvice };