/**
 * AI Trigger Service
 *
 * Phân tích giao dịch, biến động số dư, ngân sách và gọi Gemini để tạo
 * thông báo thông minh gửi đến người dùng.
 */

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const { classifyTransaction } = require('./aiClassifier');

// ======================== CẤU HÌNH ========================

const CONFIG = {
  // Ngưỡng giao dịch lớn (VND)
  largeTransactionThreshold: () => {
    const envVal = process.env.AI_TRIGGER_LARGE_TX_THRESHOLD;
    return envVal ? parseInt(envVal) : 1_000_000; // Mặc định 1 triệu
  },
  // Ngưỡng % biến động số dư đáng chú ý
  balanceChangePercent: () => {
    const envVal = process.env.AI_TRIGGER_BALANCE_CHANGE_PERCENT;
    return envVal ? parseFloat(envVal) : 20; // Mặc định 20%
  },
  // Ngưỡng biến động số dư tuyệt đối tối thiểu (VND)
  balanceChangeMinAmount: () => {
    const envVal = process.env.AI_TRIGGER_BALANCE_MIN_AMOUNT;
    return envVal ? parseInt(envVal) : 200_000; // Mặc định 200k
  },
  // Ngưỡng % ngân sách để cảnh báo
  budgetWarningPercent: () => {
    const envVal = process.env.AI_TRIGGER_BUDGET_WARNING_PERCENT;
    return envVal ? parseFloat(envVal) : 80; // Mặc định 80%
  },
  // Khoảng thời gian tối thiểu giữa các thông báo cùng loại (phút)
  cooldownMinutes: () => {
    const envVal = process.env.AI_TRIGGER_COOLDOWN_MINUTES;
    return envVal ? parseInt(envVal) : 30;
  },
};

// ======================== HÀM TIỆN ÍCH ========================

function vnd(amount) {
  return (amount || 0).toLocaleString('vi-VN') + ' VND';
}

function now() {
  return new Date();
}

function minutesAgo(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

/**
 * Kiểm tra cooldown: tránh spam thông báo cùng loại cho user
 */
async function isOnCooldown(userId, type) {
  const recent = await Notification.findOne({
    userId,
    type,
    createdAt: { $gte: minutesAgo(CONFIG.cooldownMinutes()) },
  });
  return !!recent;
}

/**
 * Lấy tổng số dư hiện tại của user (tính từ giao dịch)
 * Sử dụng MongoDB aggregation để tối ưu tốc độ thay vì load toàn bộ documents
 */
async function getCurrentBalance(userId) {
  const result = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
      },
    },
  ]);
  return result.length > 0 ? result[0].balance : 0;
}

/**
 * Lấy tổng số dư tại một thời điểm (trước khi giao dịch hiện tại)
 */
async function getBalanceBefore(userId, beforeDate) {
  const result = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $lt: beforeDate },
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
      },
    },
  ]);
  return result.length > 0 ? result[0].balance : 0;
}

// ======================== AI GENERATION ========================

/**
 * Gọi Gemini để phân tích giao dịch và tạo thông báo
 * Nếu không có Gemini, dùng template mặc định
 */
let geminiModel = null;

function getGeminiModel() {
  if (geminiModel) return geminiModel;
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'your-gemini-api-key-here') return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    return geminiModel;
  } catch {
    return null;
  }
}

async function generateAIMessage(type, context) {
  const model = getGeminiModel();
  if (!model) return null; // fallback to template

  const promptTemplates = {
    large_transaction: `Bạn là trợ lý tài chính thông minh. Một giao dịch lớn vừa được thực hiện.

Thông tin:
- Loại: ${context.type === 'expense' ? 'Chi tiêu' : 'Thu nhập'}
- Số tiền: ${vnd(context.amount)}
- Danh mục: ${context.categoryName || 'Không xác định'}
- Mô tả: ${context.description || 'Không có mô tả'}
- Số dư hiện tại: ${vnd(context.balanceAfter)}

Viết 1-2 câu bằng tiếng Việt, thân thiện, có emoji, phân tích ngắn gọn về giao dịch này. ${context.type === 'expense' ? 'Đưa ra lời khuyên nếu cần.' : 'Chúc mừng nếu là thu nhập.'}
Tối đa 120 ký tự.`,

    balance_change: `Bạn là trợ lý tài chính. Biến động số dư vừa xảy ra.

Thông tin:
- Thay đổi: ${context.percentage >= 0 ? '+' : ''}${context.percentage}%
- Số tiền thay đổi: ${vnd(Math.abs(context.amount))}
- Số dư trước: ${vnd(context.balanceBefore)}
- Số dư sau: ${vnd(context.balanceAfter)}
- Lý do chính: ${context.reason || 'giao dịch phát sinh'}

Viết 1-2 câu bằng tiếng Việt, có emoji, nhận xét về biến động này. Nếu số dư giảm mạnh, đưa ra lời khuyên.
Tối đa 120 ký tự.`,

    budget_alert: `Bạn là trợ lý tài chính. Ngân sách đang gần hoặc vượt hạn mức.

Thông tin:
- Danh mục: ${context.categoryName}
- Đã chi: ${vnd(context.spent)}
- Hạn mức: ${vnd(context.budget)}
- Phần trăm: ${context.percent}%
- Trạng thái: ${context.percent >= 100 ? 'ĐÃ VƯỢT' : 'GẦN ĐẠT'}

Viết 1-2 câu bằng tiếng Việt, có emoji, cảnh báo và gợi ý điều chỉnh chi tiêu.
Tối đa 120 ký tự.`,

    anomaly: `Bạn là trợ lý tài chính. Phát hiện bất thường trong chi tiêu.

Thông tin:
- Danh mục: ${context.categoryName}
- Tháng này: ${vnd(context.currentAmount)}
- Tháng trước: ${vnd(context.previousAmount)}
- Tăng/Giảm: ${context.changePercent >= 0 ? '+' : ''}${context.changePercent}%

Viết 1-2 câu bằng tiếng Việt, có emoji, phân tích sự bất thường.
Tối đa 120 ký tự.`,
  };

  const prompt = promptTemplates[type];
  if (!prompt) return null;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Clean và giới hạn độ dài
    return text.trim().substring(0, 200);
  } catch (err) {
    console.log('[aiTrigger] Gemini generation failed:', err.message);
    return null;
  }
}

// ======================== TEMPLATE FALLBACK ========================

function getTemplateMessage(type, context) {
  const templates = {
    large_transaction: {
      title: context.type === 'expense' ? '💸 Giao dịch lớn' : '💰 Khoản thu lớn',
      message: context.type === 'expense'
        ? `Bạn vừa chi ${vnd(context.amount)} cho "${context.description || context.categoryName || 'chi tiêu'}". Số dư hiện tại: ${vnd(context.balanceAfter)}.`
        : `Bạn vừa nhận ${vnd(context.amount)}${context.description ? ` từ "${context.description}"` : ''}. Số dư hiện tại: ${vnd(context.balanceAfter)}.`,
      severity: context.amount >= CONFIG.largeTransactionThreshold() * 3 ? 'critical' : 'warning',
    },
    balance_change: {
      title: context.percentage < 0 ? '📉 Biến động số dư' : '📈 Biến động số dư',
      message: context.percentage < 0
        ? `Số dư giảm ${Math.abs(context.percentage)}% (${vnd(Math.abs(context.amount))}). Số dư hiện tại: ${vnd(context.balanceAfter)}. ${context.reason ? `Lý do: ${context.reason}` : ''}`
        : `Số dư tăng ${context.percentage}% (${vnd(context.amount)}). Số dư hiện tại: ${vnd(context.balanceAfter)}.`,
      severity: Math.abs(context.percentage) >= 40 ? 'critical' : 'warning',
    },
    budget_alert: {
      title: context.percent >= 100 ? '🚨 Vượt ngân sách!' : '⚠️ Sắp vượt ngân sách',
      message: context.percent >= 100
        ? `Danh mục "${context.categoryName}" đã vượt hạn mức! Đã chi ${vnd(context.spent)}/${vnd(context.budget)} (${context.percent}%).`
        : `Danh mục "${context.categoryName}" đã chi ${context.percent}% hạn mức (${vnd(context.spent)}/${vnd(context.budget)}). Hãy cân nhắc!`,
      severity: context.percent >= 100 ? 'critical' : 'warning',
    },
    anomaly: {
      title: '🔍 Phát hiện bất thường',
      message: context.changePercent >= 0
        ? `Chi tiêu "${context.categoryName}" tăng ${context.changePercent}% so với tháng trước (${vnd(context.currentAmount)} vs ${vnd(context.previousAmount)}).`
        : `Chi tiêu "${context.categoryName}" giảm ${Math.abs(context.changePercent)}% so với tháng trước (${vnd(context.currentAmount)} vs ${vnd(context.previousAmount)}).`,
      severity: 'info',
    },
    daily_summary: {
      title: '📊 Tổng kết chi tiêu hôm nay',
      message: `Hôm nay: Thu ${vnd(context.totalIncome)} - Chi ${vnd(context.totalExpense)}${context.balanceChange ? ` | Biến động: ${vnd(context.balanceChange)}` : ''}.`,
      severity: 'info',
    },
  };

  return templates[type] || {
    title: '🤖 AI Insight',
    message: 'Có cập nhật mới về tài chính của bạn.',
    severity: 'info',
  };
}

// ======================== CORE TRIGGER FUNCTIONS ========================

/**
 * Đánh giá một giao dịch vừa được tạo.
 * Gọi sau khi transaction.create thành công.
 */
async function evaluateTransaction(transaction) {
  try {
    const userId = transaction.userId;
    const amount = transaction.amount;
    const type = transaction.type;

    // Populate category nếu chưa có
    if (transaction.categoryId && typeof transaction.categoryId === 'object') {
      // already populated
    } else if (transaction.categoryId) {
      await transaction.populate('categoryId');
    }

    const categoryName = transaction.categoryId?.name || 'Khác';
    const description = transaction.description || '';
    const balanceAfter = await getCurrentBalance(userId);

    // ===== 1. Tạo template notification cho các loại =====
    const [template, largeContext] = amount >= CONFIG.largeTransactionThreshold() && !(await isOnCooldown(userId, 'large_transaction'))
      ? [getTemplateMessage('large_transaction', { type, amount, categoryName, description, balanceAfter }), { type, amount, categoryName, description, balanceAfter }]
      : [null, null];

    // Tạo notification giao dịch lớn NGAY LẬP TỨC với template (không chờ AI)
    if (template) {
      const notif = await Notification.create({
        userId,
        type: 'large_transaction',
        severity: template.severity,
        title: template.title,
        message: template.message,
        aiGenerated: false,
        data: {
          transactionId: transaction._id,
          categoryId: transaction.categoryId?._id,
          amount,
          balanceAfter,
          extra: { type, description, categoryName },
        },
      });
      console.log(`[aiTrigger] large_transaction notification created for user ${userId}`);

      // Enrich với AI không đồng bộ (không block luồng chính)
      generateAIMessage('large_transaction', largeContext).then(async (aiMessage) => {
        if (aiMessage && notif._id) {
          await Notification.findByIdAndUpdate(notif._id, {
            title: '💸 AI phân tích giao dịch lớn',
            message: aiMessage,
            aiGenerated: true,
            aiAnalysis: aiMessage,
          });
          console.log(`[aiTrigger] large_transaction enriched with AI for user ${userId}`);
        }
      }).catch(err => {
        console.log('[aiTrigger] large_transaction AI enrichment failed:', err.message);
      });
    }

    // ===== 2. Thông báo biến động số dư (cho mọi giao dịch) =====
    const balanceBefore = balanceAfter + (type === 'expense' ? amount : -amount);
    const absChange = Math.abs(balanceAfter - balanceBefore);
    const pctChange = balanceBefore !== 0
      ? Math.round(((balanceAfter - balanceBefore) / Math.abs(balanceBefore)) * 100)
      : 0;

    // Luôn tạo thông báo transaction_update cho mọi giao dịch
    // (không phụ thuộc ngưỡng, cooldown riêng 1 phút để tránh spam khi tạo hàng loạt)
    {
      const recentTxNotif = await Notification.findOne({
        userId,
        type: 'transaction_update',
        createdAt: { $gte: minutesAgo(1) },
      });

      if (!recentTxNotif) {
        const reason = `${type === 'expense' ? 'Chi' : 'Thu'} ${vnd(amount)} - ${categoryName}`;
        const direction = type === 'expense' ? 'giảm' : 'tăng';
        const emoji = type === 'expense' ? '💸' : '💰';

        const title = type === 'expense' ? `${emoji} Chi tiền` : `${emoji} Thu nhập`;
        const message = type === 'expense'
          ? `Bạn vừa chi ${vnd(amount)}${description ? ` cho "${description}"` : ''} (${categoryName}). Số dư hiện tại: ${vnd(balanceAfter)}.`
          : `Bạn vừa nhận ${vnd(amount)}${description ? ` từ "${description}"` : ''} (${categoryName}). Số dư hiện tại: ${vnd(balanceAfter)}.`;

        await Notification.create({
          userId,
          type: 'transaction_update',
          severity: type === 'expense' ? 'info' : 'info',
          title,
          message,
          aiGenerated: false,
          data: {
            transactionId: transaction._id,
            categoryId: transaction.categoryId?._id,
            amount: balanceAfter - balanceBefore,
            balanceAfter,
            percentageChange: pctChange,
            extra: { balanceBefore, type, description, categoryName },
          },
        });
        console.log(`[aiTrigger] transaction_update notification created for user ${userId}`);
      }
    }

    // ===== 3. Kiểm tra biến động số dư lớn (chỉ khi đủ ngưỡng) =====
    const minAmount = CONFIG.balanceChangeMinAmount();
    const minPct = CONFIG.balanceChangePercent();

    if (absChange >= minAmount && Math.abs(pctChange) >= minPct) {
      if (!await isOnCooldown(userId, 'balance_change')) {
        const context = {
          amount: balanceAfter - balanceBefore,
          percentage: pctChange,
          balanceBefore,
          balanceAfter,
          reason: `${type === 'expense' ? 'Chi' : 'Thu'} ${vnd(amount)} - ${categoryName}`,
        };

        const template = getTemplateMessage('balance_change', context);

        // Tạo notification NGAY với template, không chờ AI
        const notif = await Notification.create({
          userId,
          type: 'balance_change',
          severity: template.severity,
          title: template.title,
          message: template.message,
          aiGenerated: false,
          data: {
            transactionId: transaction._id,
            amount: balanceAfter - balanceBefore,
            balanceAfter,
            percentageChange: pctChange,
            extra: { balanceBefore, reason: context.reason },
          },
        });
        console.log(`[aiTrigger] balance_change notification created for user ${userId}`);

        // Enrich với AI không đồng bộ
        generateAIMessage('balance_change', context).then(async (aiMessage) => {
          if (aiMessage && notif._id) {
            await Notification.findByIdAndUpdate(notif._id, {
              title: '📊 AI nhận xét biến động số dư',
              message: aiMessage,
              aiGenerated: true,
              aiAnalysis: aiMessage,
            });
            console.log(`[aiTrigger] balance_change enriched with AI for user ${userId}`);
          }
        }).catch(err => {
          console.log('[aiTrigger] balance_change AI enrichment failed:', err.message);
        });
      }
    }

    // Nếu là expense, kiểm tra budget luôn
    if (type === 'expense') {
      await evaluateBudgetForCategory(userId, transaction.categoryId?._id, transaction);
    }

  } catch (err) {
    console.error('[aiTrigger] evaluateTransaction error:', err.message);
  }
}

/**
 * Kiểm tra ngân sách cho một danh mục sau khi có giao dịch mới
 */
async function evaluateBudgetForCategory(userId, categoryId, transaction) {
  try {
    if (!categoryId) return;

    const currentMonth = now().toISOString().slice(0, 7);
    const budget = await Budget.findOne({ userId, month: currentMonth, categoryId }).populate('categoryId');
    if (!budget) return;

    // Tính spent thực tế từ transactions (không dùng budget.spent lưu trong DB vì có thể cũ)
    const monthStart = new Date(`${currentMonth}-01`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const expenseTxs = await Transaction.find({
      userId,
      categoryId,
      type: 'expense',
      date: { $gte: monthStart, $lt: monthEnd },
    });
    const spent = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
    const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
    const categoryName = budget.categoryId?.name || 'Khác';

    // Cảnh báo ở 80% và 100%
    if (percent >= CONFIG.budgetWarningPercent() && percent < 100) {
      if (!await isOnCooldown(userId, 'budget_alert')) {
        const context = { categoryName, spent, budget: budget.amount, percent };
        let aiMessage = await generateAIMessage('budget_alert', context);
        const template = getTemplateMessage('budget_alert', context);

        await Notification.create({
          userId,
          type: 'budget_alert',
          severity: 'warning',
          title: aiMessage ? `⚠️ AI: ${categoryName} sắp hết ngân sách` : template.title,
          message: aiMessage || template.message,
          aiGenerated: !!aiMessage,
          aiAnalysis: aiMessage || null,
          data: {
            transactionId: transaction?._id,
            categoryId,
            amount: spent,
            extra: { budgetAmount: budget.amount, percent, categoryName },
          },
        });
        console.log(`[aiTrigger] budget_alert (${percent}%) for ${categoryName}`);
      }
    }

    if (percent >= 100) {
      if (!await isOnCooldown(userId, 'budget_alert')) {
        const context = { categoryName, spent, budget: budget.amount, percent };
        let aiMessage = await generateAIMessage('budget_alert', context);
        const template = getTemplateMessage('budget_alert', context);

        await Notification.create({
          userId,
          type: 'budget_alert',
          severity: 'critical',
          title: aiMessage ? `🚨 AI: ${categoryName} đã vượt ngân sách!` : template.title,
          message: aiMessage || template.message,
          aiGenerated: !!aiMessage,
          aiAnalysis: aiMessage || null,
          data: {
            transactionId: transaction?._id,
            categoryId,
            amount: spent,
            extra: { budgetAmount: budget.amount, percent, categoryName },
          },
        });
        console.log(`[aiTrigger] budget_alert (${percent}% - OVER) for ${categoryName}`);
      }
    }
  } catch (err) {
    console.error('[aiTrigger] evaluateBudgetForCategory error:', err.message);
  }
}

/**
 * Phân tích bất thường theo danh mục (so với tháng trước)
 * Gọi định kỳ hoặc sau khi tạo giao dịch
 */
async function evaluateAnomalies(userId) {
  try {
    const currentMonth = now().toISOString().slice(0, 7);
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prevMonth = d.toISOString().slice(0, 7);

    const [currentTxs, prevTxs] = await Promise.all([
      Transaction.find({
        userId,
        date: { $gte: new Date(`${currentMonth}-01`), $lt: new Date(`${currentMonth}-01`).setMonth(new Date().getMonth() + 1) },
      }).populate('categoryId'),
      Transaction.find({
        userId,
        date: { $gte: new Date(`${prevMonth}-01`), $lt: new Date(`${prevMonth}-01`).setMonth(d.getMonth() + 1) },
      }).populate('categoryId'),
    ]);

    const currExpenses = currentTxs.filter(t => t.type === 'expense');
    const prevExpenses = prevTxs.filter(t => t.type === 'expense');

    // Nhóm theo danh mục
    const currByCat = {};
    currExpenses.forEach(t => {
      const name = t.categoryId?.name || 'Khác';
      currByCat[name] = (currByCat[name] || 0) + t.amount;
    });
    const prevByCat = {};
    prevExpenses.forEach(t => {
      const name = t.categoryId?.name || 'Khác';
      prevByCat[name] = (prevByCat[name] || 0) + t.amount;
    });

    const allCats = new Set([...Object.keys(currByCat), ...Object.keys(prevByCat)]);
    for (const cat of allCats) {
      const curr = currByCat[cat] || 0;
      const prev = prevByCat[cat] || 0;
      if (prev > 0 && curr > prev * 1.5) {
        const changePercent = Math.round(((curr - prev) / prev) * 100);
        if (!await isOnCooldown(userId, 'anomaly')) {
          const context = { categoryName: cat, currentAmount: curr, previousAmount: prev, changePercent };
          let aiMessage = await generateAIMessage('anomaly', context);
          const template = getTemplateMessage('anomaly', context);

          await Notification.create({
            userId,
            type: 'anomaly',
            severity: 'warning',
            title: aiMessage ? `🔍 AI phát hiện: ${cat} tăng đột biến` : template.title,
            message: aiMessage || template.message,
            aiGenerated: !!aiMessage,
            aiAnalysis: aiMessage || null,
            data: {
              amount: curr - prev,
              extra: { categoryName: cat, currentAmount: curr, previousAmount: prev, changePercent },
            },
          });
          console.log(`[aiTrigger] anomaly detected for ${cat}: +${changePercent}%`);
        }
        break; // Chỉ phát hiện 1 anomaly mỗi lần
      }
    }
  } catch (err) {
    console.error('[aiTrigger] evaluateAnomalies error:', err.message);
  }
}

/**
 * Tổng kết cuối ngày — gọi từ cron job hoặc manual
 */
async function generateDailySummary(userId) {
  try {
    const today = now();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const txs = await Transaction.find({
      userId,
      date: { $gte: todayStart, $lt: todayEnd },
    });

    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    if (totalIncome === 0 && totalExpense === 0) return; // Không có giao dịch

    const todayStr = today.toLocaleDateString('vi-VN');
    const context = {
      totalIncome,
      totalExpense,
      balanceChange: totalIncome - totalExpense,
      date: todayStr,
    };

    const template = getTemplateMessage('daily_summary', context);

    await Notification.create({
      userId,
      type: 'daily_summary',
      severity: 'info',
      title: `📊 Tổng kết ngày ${todayStr}`,
      message: template.message,
      aiGenerated: false,
      data: { amount: totalIncome - totalExpense, extra: context },
    });
  } catch (err) {
    console.error('[aiTrigger] generateDailySummary error:', err.message);
  }
}

module.exports = {
  evaluateTransaction,
  evaluateAnomalies,
  generateDailySummary,
  getCurrentBalance,
  CONFIG,
};
