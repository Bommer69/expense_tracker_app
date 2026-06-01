/**
 * AI Trigger Service
 *
 * Phân tích giao dịch, biến động số dư, ngân sách và tạo
 * thông báo gửi đến người dùng.
 */

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const { generateFinancialInsight, generateMonthlySummaryText } = require('./aiClassifier');

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
    transaction_update: {
      title: context.type === 'expense' ? '💸 Chi tiền' : '💰 Thu nhập',
      message: context.type === 'expense'
        ? `Bạn vừa chi ${vnd(context.amount)}${context.description ? ` cho "${context.description}"` : ''} (${context.categoryName}). Số dư hiện tại: ${vnd(context.balanceAfter)}.`
        : `Bạn vừa nhận ${vnd(context.amount)}${context.description ? ` từ "${context.description}"` : ''} (${context.categoryName}). Số dư hiện tại: ${vnd(context.balanceAfter)}.`,
      severity: 'info',
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
    monthly_summary: {
      title: '📊 Tổng kết tháng',
      message: context.aiMessage || `Tháng này: Thu ${vnd(context.totalIncome)} - Chi ${vnd(context.totalExpense)}${context.savings ? ` | Tiết kiệm: ${vnd(context.savings)}` : ''}.`,
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

    // ===== 1. Thông báo giao dịch lớn =====
    if (amount >= CONFIG.largeTransactionThreshold()) {
      if (!await isOnCooldown(userId, 'large_transaction')) {
        const tmpl = getTemplateMessage('large_transaction', { type, amount, categoryName, description, balanceAfter });

        await Notification.create({
          userId,
          type: 'large_transaction',
          severity: tmpl.severity,
          title: tmpl.title,
          message: tmpl.message,
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
      }
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
        const emoji = type === 'expense' ? '💸' : '💰';

        const title = type === 'expense' ? `${emoji} Chi tiền` : `${emoji} Thu nhập`;
        const message = type === 'expense'
          ? `Bạn vừa chi ${vnd(amount)}${description ? ` cho "${description}"` : ''} (${categoryName}). Số dư hiện tại: ${vnd(balanceAfter)}.`
          : `Bạn vừa nhận ${vnd(amount)}${description ? ` từ "${description}"` : ''} (${categoryName}). Số dư hiện tại: ${vnd(balanceAfter)}.`;

        await Notification.create({
          userId,
          type: 'transaction_update',
          severity: 'info',
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

        await Notification.create({
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
      }
    }

    // Nếu là expense, kiểm tra budget luôn
    if (type === 'expense') {
      await evaluateBudgetForCategory(userId, transaction.categoryId?._id, transaction);
    }

    // ===== 4. AI phân tích thông minh (gọi Gemini để đánh giá) =====
    // Chỉ chạy khi có giao dịch đáng chú ý và không quá thường xuyên
    if (!await isOnCooldown(userId, 'ai_insight')) {
      await evaluateWithAI(transaction, categoryName, balanceAfter, description);
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
        const template = getTemplateMessage('budget_alert', context);

        await Notification.create({
          userId,
          type: 'budget_alert',
          severity: 'warning',
          title: template.title,
          message: template.message,
          aiGenerated: false,
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
        const template = getTemplateMessage('budget_alert', context);

        await Notification.create({
          userId,
          type: 'budget_alert',
          severity: 'critical',
          title: template.title,
          message: template.message,
          aiGenerated: false,
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
          const template = getTemplateMessage('anomaly', { categoryName: cat, currentAmount: curr, previousAmount: prev, changePercent });

          await Notification.create({
            userId,
            type: 'anomaly',
            severity: 'warning',
            title: template.title,
            message: template.message,
            aiGenerated: false,
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

/**
 * Tổng kết cuối tháng — gọi từ cron job (cuối tháng) hoặc manual.
 * Thu thập dữ liệu cả tháng, gọi AI để phân tích và gửi thông báo.
 */
async function generateMonthlySummary(userId) {
  try {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    // Tính tháng trước (tháng cần tổng kết)
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.toISOString().slice(0, 7);
    const monthStart = new Date(`${prevMonth}-01`);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    // Lấy giao dịch tháng trước
    const txs = await Transaction.find({
      userId,
      date: { $gte: monthStart, $lt: monthEnd },
    }).populate('categoryId');

    if (txs.length === 0) return; // Không có giao dịch

    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Nhóm chi tiêu theo danh mục
    const expenseByCat = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      const name = t.categoryId?.name || 'Khác';
      expenseByCat[name] = (expenseByCat[name] || 0) + t.amount;
    });

    // Sắp xếp danh mục theo số tiền giảm dần
    const sortedCats = Object.entries(expenseByCat)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => `- ${name}: ${amount.toLocaleString()} VND`)
      .join('\n');

    // Lấy ngân sách tháng
    const budgets = await Budget.find({ userId, month: prevMonth }).populate('categoryId');
    let budgetDetails = '';
    budgets.forEach(b => {
      const pct = b.amount > 0 ? Math.round(((b.spent || 0) / b.amount) * 100) : 0;
      budgetDetails += `- ${b.categoryId?.name || 'N/A'}: ${(b.spent || 0).toLocaleString()}/${b.amount.toLocaleString()} VND (${pct}%)\n`;
    });

    // So sánh với tháng trước đó
    const prev2Date = new Date(prevDate);
    prev2Date.setMonth(prev2Date.getMonth() - 1);
    const prev2Start = new Date(prev2Date.getFullYear(), prev2Date.getMonth(), 1);

    const prevTxs = await Transaction.find({
      userId,
      date: { $gte: prev2Start, $lt: monthStart },
    });

    const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    let compareText = '';
    if (prevTxs.length > 0) {
      const incomeChange = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : 0;
      const expenseChange = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : 0;
      compareText = `Thu nhập: ${totalIncome.toLocaleString()} VND (${incomeChange >= 0 ? '+' : ''}${incomeChange}% so với tháng trước)\nChi tiêu: ${totalExpense.toLocaleString()} VND (${expenseChange >= 0 ? '+' : ''}${expenseChange}% so với tháng trước)`;
    }

    // Tên tháng
    const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    const monthName = `${monthNames[prevDate.getMonth()]} ${prevDate.getFullYear()}`;

    // Gọi AI để tạo nội dung tổng kết
    const aiResult = await generateMonthlySummaryText({
      month: monthName,
      totalIncome,
      totalExpense,
      transactionCount: txs.length,
      categoryDetails: sortedCats || 'Không có chi tiêu',
      budgetDetails: budgetDetails || 'Chưa có ngân sách',
      compareText: compareText || 'Chưa có dữ liệu tháng trước',
    });

    if (aiResult) {
      await Notification.create({
        userId,
        type: 'monthly_summary',
        severity: aiResult.severity || 'info',
        title: aiResult.title || `📊 Tổng kết ${monthName}`,
        message: aiResult.message || 'Xem chi tiết trong ứng dụng.',
        aiGenerated: true,
        aiAnalysis: aiResult.fullAnalysis || '',
        data: {
          amount: totalIncome - totalExpense,
          extra: {
            month: prevMonth,
            monthName,
            totalIncome,
            totalExpense,
            transactionCount: txs.length,
            fullAnalysis: aiResult.fullAnalysis,
          },
        },
      });
      console.log(`[aiTrigger] Monthly summary created for user ${userId}: ${monthName}`);
    } else {
      // Fallback nếu AI lỗi — dùng template
      const savings = totalIncome - totalExpense;
      const context = {
        totalIncome,
        totalExpense,
        savings,
        aiMessage: `📊 ${monthName}: Thu ${totalIncome.toLocaleString('vi-VN')}₫ - Chi ${totalExpense.toLocaleString('vi-VN')}₫${savings >= 0 ? ` | Tiết kiệm: ${savings.toLocaleString('vi-VN')}₫` : ` | Thâm hụt: ${Math.abs(savings).toLocaleString('vi-VN')}₫`}.`,
      };
      const template = getTemplateMessage('monthly_summary', context);

      await Notification.create({
        userId,
        type: 'monthly_summary',
        severity: 'info',
        title: `📊 Tổng kết ${monthName}`,
        message: template.message,
        aiGenerated: false,
        data: {
          amount: savings,
          extra: { month: prevMonth, monthName, totalIncome, totalExpense },
        },
      });
      console.log(`[aiTrigger] Monthly summary (fallback) created for user ${userId}: ${monthName}`);
    }
  } catch (err) {
    console.error('[aiTrigger] generateMonthlySummary error:', err.message);
  }
}

/**
 * AI phân tích thông minh sau mỗi giao dịch.
 * Gọi Gemini để đánh giá chi tiêu, đưa ra nhận xét cá nhân hoá.
 */
async function evaluateWithAI(transaction, categoryName, balanceAfter, description) {
  try {
    const userId = transaction.userId;
    const amount = transaction.amount;
    const type = transaction.type;

    // Xây context ngắn gọn cho AI
    const currentMonth = now().toISOString().slice(0, 7);
    const monthStart = new Date(`${currentMonth}-01`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [monthTxs, budgets] = await Promise.all([
      Transaction.find({ userId, date: { $gte: monthStart, $lt: monthEnd } }).populate('categoryId'),
      Budget.find({ userId, month: currentMonth }).populate('categoryId'),
    ]);

    const totalIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Budget context
    let budgetInfo = '';
    budgets.forEach(b => {
      const pct = b.amount > 0 ? Math.round(((b.spent || 0) / b.amount) * 100) : 0;
      budgetInfo += `- ${b.categoryId?.name || 'N/A'}: ${(b.spent || 0).toLocaleString()}/${b.amount.toLocaleString()} VND (${pct}%)\n`;
    });

    const context = {
      amount,
      type,
      category: categoryName || 'Khác',
      description: description || '(không mô tả)',
      balanceAfter,
      monthIncome: totalIncome,
      monthExpense: totalExpense,
      monthBudget: budgetInfo || 'Chưa có ngân sách',
    };

    const advice = await generateFinancialInsight(context);

    if (!advice || !advice.title || !advice.message) return;

    await Notification.create({
      userId,
      type: 'ai_insight',
      severity: advice.severity || 'info',
      title: advice.title,
      message: advice.message,
      aiGenerated: true,
      aiAnalysis: advice.fullAnalysis || advice.message,
      data: {
        transactionId: transaction._id,
        categoryId: transaction.categoryId?._id,
        amount,
        balanceAfter,
        extra: { type, categoryName, description },
      },
    });
    console.log(`[aiTrigger] AI insight created for user ${userId}: ${advice.title}`);
  } catch (err) {
    // Không crash nếu AI lỗi — chỉ log
    console.error('[aiTrigger] evaluateWithAI error:', err.message);
  }
}

module.exports = {
  evaluateTransaction,
  evaluateAnomalies,
  generateDailySummary,
  generateMonthlySummary,
  getCurrentBalance,
  CONFIG,
};
