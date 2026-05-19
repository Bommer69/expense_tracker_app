/**
 * AI Controller - Google Gemini
 */

const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { getUserId } = require('../utils/auth');
const { chatWithAI, getSpendingAdvice, clearUserMemory } = require('../services/aiClassifier');

/**
 * Build spending context from user data
 */
async function buildContext(userId) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Get recent transactions
  const recentTransactions = await Transaction.find({ userId })
    .populate('categoryId')
    .sort({ date: -1 })
    .limit(30);

  // Get budgets
  const budgets = await Budget.find({ userId, month: currentMonth })
    .populate('categoryId');

  // Calculate totals
  const monthStart = new Date(`${currentMonth}-01`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  
  const monthTransactions = recentTransactions.filter(
    t => t.date >= monthStart && t.date < monthEnd
  );
  
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  
  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  // Build context string
  let context = `Tháng: ${currentMonth}\n`;
  context += `Tổng thu nhập: ${totalIncome.toLocaleString()} VND\n`;
  context += `Tổng chi tiêu: ${totalExpense.toLocaleString()} VND\n`;
  context += `Số dư: ${(totalIncome - totalExpense).toLocaleString()} VND\n`;
  context += `Số giao dịch tháng này: ${monthTransactions.length}\n\n`;

  if (budgets.length > 0) {
    context += `Ngân sách:\n`;
    budgets.forEach(b => {
      const percent = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
      context += `- ${b.categoryId?.name || 'N/A'}: đã chi ${(b.spent || 0).toLocaleString()}/${b.amount.toLocaleString()} VND (${percent}%)\n`;
    });
    context += '\n';
  }

  context += `Giao dịch gần đây (15 gần nhất):\n`;
  recentTransactions.slice(0, 15).forEach(t => {
    const sign = t.type === 'expense' ? '-' : '+';
    context += `- ${t.date.toISOString().slice(0, 10)} | ${t.categoryId?.name || 'N/A'} | ${sign}${t.amount.toLocaleString()} VND | ${t.description || ''}\n`;
  });

  return {
    text: context,
    stats: {
      totalIncome,
      totalExpense,
      transactionCount: monthTransactions.length,
      budgetCount: budgets.length,
    }
  };
}

async function chat(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi' });
    }
    
    let answer;
    try {
      answer = await chatWithAI(message, userId);
    } catch (err) {
      console.error('AI chat error:', err.message);
      const errorText = String(err.message || '');

      if (errorText.includes('GEMINI_API_KEY')) {
        answer = '⚠️ Chưa cấu hình API Key cho AI. Vui lòng thêm GEMINI_API_KEY vào file .env.\n\nLấy API key miễn phí tại: https://aistudio.google.com/apikey';
      } else if (
        errorText.includes('API_KEY_INVALID') ||
        errorText.includes('API Key not found') ||
        errorText.includes('reported as leaked')
      ) {
        answer = '⚠️ API key Gemini không hợp lệ hoặc đã bị thu hồi.\n\nVui lòng tạo key mới tại https://aistudio.google.com/apikey và cập nhật GEMINI_API_KEY trong backend/.env.';
      } else if (
        errorText.includes('RESOURCE_EXHAUSTED') ||
        errorText.includes('Quota exceeded') ||
        errorText.includes('rate-limit') ||
        errorText.includes('free_tier')
      ) {
        answer = '⚠️ API key đã hết quota miễn phí.\n\nVui lòng lấy key mới tại https://aistudio.google.com/apikey và cập nhật GEMINI_API_KEY trong backend/.env.';
      } else {
        answer = '🤖 Xin lỗi, AI tạm thời không khả dụng. Vui lòng thử lại sau.';
      }
    }

    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getStats(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${currentMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lt: endDate }
    });
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    
    const daysInMonth = new Date().getDate();
    
    res.json({
      totalIncome,
      totalExpense,
      transactionCount: transactions.length,
      avgDailyExpense: Math.round(totalExpense / daysInMonth)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function advice(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const context = await buildContext(userId);
    
    let tips;
    try {
      tips = await getSpendingAdvice(context.text);
    } catch (err) {
      tips = '💡 Hãy cấu hình GEMINI_API_KEY để nhận lời khuyên từ AI!';
    }
    
    res.json({ advice: tips, stats: context.stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function clearHistory(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    clearUserMemory(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { chat, getStats, advice, clearHistory };