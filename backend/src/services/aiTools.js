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
};

module.exports = { toolDeclarations, toolFunctions };
