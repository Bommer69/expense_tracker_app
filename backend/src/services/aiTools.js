const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthRange(monthStr) {
  const start = new Date(`${monthStr}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function vnd(amount) {
  return amount.toLocaleString('vi-VN') + ' VND';
}

// Gemini FunctionDeclaration schema for each tool
const toolDeclarations = [
  {
    name: 'get_monthly_summary',
    description: 'Lấy tổng thu nhập, chi tiêu và số dư của một tháng. Dùng khi hỏi tổng quan tài chính tháng nào đó.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Tháng cần xem, format YYYY-MM (vd: 2025-05). Không truyền = tháng hiện tại.' },
      },
    },
  },
  {
    name: 'get_category_breakdown',
    description: 'Chi tiết thu/chi theo từng danh mục trong tháng. Dùng khi hỏi chi tiêu nhiều nhất ở đâu, danh mục nào tốn nhiều tiền.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Tháng cần xem, format YYYY-MM. Mặc định tháng hiện tại.' },
        type: { type: 'string', enum: ['income', 'expense'], description: 'income = thu nhập, expense = chi tiêu. Mặc định: expense.' },
      },
    },
  },
  {
    name: 'get_budget_status',
    description: 'Xem trạng thái ngân sách: đã chi bao nhiêu so với hạn mức, có vượt không. Dùng khi hỏi về ngân sách.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Tháng cần xem, format YYYY-MM. Mặc định tháng hiện tại.' },
      },
    },
  },
  {
    name: 'get_recent_transactions',
    description: 'Lấy danh sách giao dịch gần đây. Có thể lọc theo loại hoặc danh mục. Dùng khi hỏi về giao dịch cụ thể.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Số lượng giao dịch (tối đa 20). Mặc định: 10.' },
        type: { type: 'string', enum: ['income', 'expense'], description: 'Lọc: income hoặc expense.' },
        category_name: { type: 'string', description: 'Lọc theo tên danh mục (vd: Ăn uống, Đi lại).' },
      },
    },
  },
  {
    name: 'get_spending_trend',
    description: 'Xem xu hướng thu chi qua nhiều tháng. Dùng khi so sánh chi tiêu các tháng hoặc hỏi xu hướng tài chính.',
    parameters: {
      type: 'object',
      properties: {
        months: { type: 'number', description: 'Số tháng cần xem (tối đa 6). Mặc định: 3.' },
      },
    },
  },
  {
    name: 'get_forecast',
    description: 'Dự báo chi tiêu cuối tháng dựa trên tốc độ chi tiêu hiện tại (daily run-rate). Cảnh báo nếu có nguy cơ vượt ngân sách.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Tháng cần dự báo, format YYYY-MM. Mặc định tháng hiện tại.' },
      },
    },
  },
  {
    name: 'detect_anomalies',
    description: 'Phát hiện chi tiêu bất thường: danh mục tăng đột biến so với tháng trước, giao dịch trùng lặp, hoặc dấu hiệu bất thường khác.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Tháng cần kiểm tra, format YYYY-MM. Mặc định tháng hiện tại.' },
      },
    },
  },
];

// Tool implementations — each returns a string for the AI to read
const toolFunctions = {
  async get_monthly_summary({ month }, userId) {
    const m = month || currentMonth();
    const { start, end } = monthRange(m);
    const txs = await Transaction.find({ userId, date: { $gte: start, $lt: end } });
    if (txs.length === 0) return `Tháng ${m}: Chưa có giao dịch nào.`;
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return `Tháng ${m}: Thu ${vnd(income)} | Chi ${vnd(expense)} | Dư ${vnd(income - expense)} | ${txs.length} giao dịch`;
  },

  async get_category_breakdown({ month, type }, userId) {
    const m = month || currentMonth();
    const { start, end } = monthRange(m);
    const txType = type || 'expense';
    const txs = await Transaction.find({ userId, type: txType, date: { $gte: start, $lt: end } }).populate('categoryId');
    if (txs.length === 0) return `Tháng ${m}: Không có giao dịch ${txType === 'income' ? 'thu nhập' : 'chi tiêu'} nào.`;
    const byCategory = {};
    txs.forEach(t => {
      const name = t.categoryId?.name || 'Khác';
      byCategory[name] = (byCategory[name] || 0) + t.amount;
    });
    const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const lines = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amt]) => `  ${name}: ${vnd(amt)} (${Math.round(amt / total * 100)}%)`);
    return `${txType === 'income' ? 'Thu nhập' : 'Chi tiêu'} theo danh mục tháng ${m}:\n${lines.join('\n')}\nTổng: ${vnd(total)}`;
  },

  async get_budget_status({ month }, userId) {
    const m = month || currentMonth();
    const budgets = await Budget.find({ userId, month: m }).populate('categoryId');
    if (budgets.length === 0) return `Tháng ${m}: Chưa đặt ngân sách nào.`;
    const lines = budgets.map(b => {
      const spent = b.spent || 0;
      const pct = b.amount > 0 ? Math.round(spent / b.amount * 100) : 0;
      const icon = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢';
      return `  ${icon} ${b.categoryId?.name || 'N/A'}: ${vnd(spent)}/${vnd(b.amount)} (${pct}%)`;
    });
    const over = budgets.filter(b => (b.spent || 0) >= b.amount).length;
    return `Ngân sách tháng ${m}:\n${lines.join('\n')}\n${over > 0 ? `⚠️ Vượt: ${over} danh mục` : '✅ Chưa vượt ngân sách'}`;
  },

  async get_recent_transactions({ limit, type, category_name }, userId) {
    const query = { userId };
    if (type) query.type = type;
    let txs = await Transaction.find(query)
      .populate('categoryId')
      .sort({ date: -1 })
      .limit(Math.min(limit || 10, 20));
    if (category_name) {
      txs = txs.filter(t => t.categoryId?.name?.toLowerCase().includes(category_name.toLowerCase()));
    }
    if (txs.length === 0) return 'Không tìm thấy giao dịch nào.';
    const lines = txs.map(t => {
      const sign = t.type === 'income' ? '+' : '-';
      const date = t.date.toISOString().slice(0, 10);
      return `  ${date} | ${t.categoryId?.name || 'N/A'} | ${sign}${vnd(t.amount)}${t.description ? ' | ' + t.description : ''}`;
    });
    return `Giao dịch gần đây:\n${lines.join('\n')}`;
  },

  async get_spending_trend({ months }, userId) {
    const n = Math.min(months || 3, 6);
    const rows = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const m = d.toISOString().slice(0, 7);
      const { start, end } = monthRange(m);
      const txs = await Transaction.find({ userId, date: { $gte: start, $lt: end } });
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      rows.push(`  ${m}: Thu ${vnd(income)} | Chi ${vnd(expense)} | Dư ${vnd(income - expense)}`);
    }
    return `Xu hướng ${n} tháng gần đây:\n${rows.join('\n')}`;
  },

  async get_forecast({ month }, userId) {
    const m = month || currentMonth();
    const { start, end } = monthRange(m);
    const today = new Date();
    const daysPassed = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // Lấy giao dịch tháng hiện tại
    const txs = await Transaction.find({ userId, date: { $gte: start, $lt: end } });
    const expenses = txs.filter(t => t.type === 'expense');
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const incomes = txs.filter(t => t.type === 'income');
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

    const dailyAvg = daysPassed > 0 ? Math.round(totalExpense / daysPassed) : 0;
    const projectedTotal = dailyAvg * daysInMonth;

    // So với ngân sách
    const budgets = await Budget.find({ userId, month: m });
    const budgetTotal = budgets.reduce((s, b) => s + (b.amount || 0), 0);
    const spentTotal = budgets.reduce((s, b) => s + (b.spent || 0), 0);

    let warning = '';
    if (budgetTotal > 0 && projectedTotal > budgetTotal) {
      const overAmount = projectedTotal - budgetTotal;
      warning = `\n⚠️ **CẢNH BÁO**: Dự kiến cuối tháng chi ${vnd(projectedTotal)}, vượt ${vnd(overAmount)} so với tổng ngân sách (${vnd(budgetTotal)})!`;
    } else if (budgetTotal > 0 && projectedTotal > budgetTotal * 0.85) {
      warning = `\n⚡ **LƯU Ý**: Dự kiến cuối tháng chi ${vnd(projectedTotal)}, đã gần chạm ngân sách (${vnd(budgetTotal)}).`;
    }

    // Đánh giá trạng thái
    let status = '🟢 Ổn định';
    if (budgetTotal > 0 && projectedTotal > budgetTotal) status = '🔴 Nguy cơ vượt ngân sách';
    else if (dailyAvg > 0 && (totalIncome - totalExpense) < 0) status = '🟡 Chi nhiều hơn thu';

    let result = `📊 **DỰ BÁO THÁNG ${m}**\n`;
    result += `├ 📅 Đã qua: ${daysPassed}/${daysInMonth} ngày\n`;
    result += `├ 💸 Đã chi: ${vnd(totalExpense)}\n`;
    result += `├ 📈 Trung bình/ngày: ${vnd(dailyAvg)}\n`;
    result += `├ 🔮 Dự kiến cuối tháng: ${vnd(projectedTotal)}\n`;
    if (budgetTotal > 0) {
      result += `├ 📋 Tổng ngân sách: ${vnd(budgetTotal)} (đã dùng ${vnd(spentTotal)})\n`;
    }
    result += `└ 🏁 Trạng thái: ${status}`;
    result += warning;

    return result;
  },

  async detect_anomalies({ month }, userId) {
    const m = month || currentMonth();
    const anomalies = [];

    // Lấy tháng trước
    const d = new Date(`${m}-01`);
    d.setMonth(d.getMonth() - 1);
    const prevMonth = d.toISOString().slice(0, 7);

    const [current, previous] = await Promise.all([
      Transaction.find({ userId, date: { $gte: monthRange(m).start, $lt: monthRange(m).end } }).populate('categoryId'),
      Transaction.find({ userId, date: { $gte: monthRange(prevMonth).start, $lt: monthRange(prevMonth).end } }).populate('categoryId'),
    ]);

    const currentExpenses = current.filter(t => t.type === 'expense');
    const prevExpenses = previous.filter(t => t.type === 'expense');

    // 1. So sánh chi tiêu theo danh mục với tháng trước
    const currCat = {};
    currentExpenses.forEach(t => {
      const name = t.categoryId?.name || 'Khác';
      currCat[name] = (currCat[name] || 0) + t.amount;
    });
    const prevCat = {};
    prevExpenses.forEach(t => {
      const name = t.categoryId?.name || 'Khác';
      prevCat[name] = (prevCat[name] || 0) + t.amount;
    });

    const allCats = new Set([...Object.keys(currCat), ...Object.keys(prevCat)]);
    for (const cat of allCats) {
      const curr = currCat[cat] || 0;
      const prev = prevCat[cat] || 0;
      if (prev > 0 && curr > prev * 1.5) {
        anomalies.push({
          type: 'increase',
          icon: '🔺',
          message: `**${cat}** tăng **${Math.round((curr - prev) / prev * 100)}%** so với tháng trước (${vnd(prev)} → ${vnd(curr)})`,
        });
      } else if (prev > 0 && curr < prev * 0.5 && curr > 0) {
        anomalies.push({
          type: 'decrease',
          icon: '✅',
          message: `**${cat}** giảm **${Math.round((prev - curr) / prev * 100)}%** so với tháng trước — tiết kiệm tốt! (${vnd(prev)} → ${vnd(curr)})`,
        });
      }
    }

    // 2. Phát hiện giao dịch trùng lặp (cùng số tiền, cùng mô tả, cùng ngày)
    const seen = new Map();
    currentExpenses.forEach(t => {
      const dateStr = t.date.toISOString().slice(0, 10);
      const key = `${t.amount}-${(t.description || '').trim().toLowerCase()}-${dateStr}`;
      const existing = seen.get(key);
      if (existing) {
        anomalies.push({
          type: 'duplicate',
          icon: '🔁',
          message: `Giao dịch trùng: **"${t.description || 'Không mô tả'}"** ${vnd(t.amount)} ngày **${dateStr}** (xuất hiện ${existing + 1} lần)`,
        });
        seen.set(key, existing + 1);
      } else {
        seen.set(key, 1);
      }
    });

    // 3. Tổng quan
    const currTotalExpense = currentExpenses.reduce((s, t) => s + t.amount, 0);
    const prevTotalExpense = prevExpenses.reduce((s, t) => s + t.amount, 0);

    if (anomalies.length === 0) {
      return `✅ **Không phát hiện bất thường** tháng ${m} so với tháng ${prevMonth}.\nTổng chi: ${vnd(currTotalExpense)} (tháng trước: ${vnd(prevTotalExpense)})`;
    }

    let result = `🔍 **PHÂN TÍCH BẤT THƯỜNG THÁNG ${m}**\n`;
    result += `Tổng chi: ${vnd(currTotalExpense)} | Tháng trước: ${vnd(prevTotalExpense)}\n\n`;

    const groups = { increase: '📈 Chi tiêu tăng', decrease: '📉 Chi tiêu giảm', duplicate: '🔁 Giao dịch trùng' };
    for (const [typeKey, title] of Object.entries(groups)) {
      const items = anomalies.filter(a => a.type === typeKey);
      if (items.length > 0) {
        result += `${title}:\n`;
        items.forEach(a => { result += `${a.icon} ${a.message}\n`; });
        result += '\n';
      }
    }

    result += `📌 Tổng cộng: **${anomalies.length}** điểm bất thường được phát hiện.`;
    return result;
  },
};

module.exports = { toolDeclarations, toolFunctions };
