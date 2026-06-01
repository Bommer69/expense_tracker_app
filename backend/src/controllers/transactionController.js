/**
 * Transaction Controller
 */

const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Account = require('../models/Account');
const { getUserId } = require('../utils/auth');
const { classifyTransaction } = require('../services/aiClassifier');
const { generateRecurringTransactions } = require('../services/recurringGenerator');
const { evaluateTransaction } = require('../services/aiTriggerService');
const { rolloverUser, monthlyRolloverCheck } = require('../services/monthlyRolloverService');

async function getAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // Tự động kiểm tra rollover tháng mới cho user này
    await rolloverUser(userId);
    await generateRecurringTransactions(userId);
    
    const { startDate, endDate, categoryId, type, limit = 50 } = req.query;
    
    const query = { userId };
    if (startDate) query.date = { $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };
    if (categoryId) query.categoryId = categoryId;
    if (type) query.type = type;
    
    const transactions = await Transaction.find(query)
      .populate('categoryId')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json(transactions);
  } catch (err) {
    // generateRecurringTransactions race condition lỗi đã được xử lý bên trong,
    // nhưng nếu vẫn throw thì log ra để debug
    console.error('[Transaction.getAll] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await rolloverUser(userId);
    await generateRecurringTransactions(userId);
    
    const { amount, description, date, categoryId, type, accountId, tags } = req.body;
    
    // Nếu không có accountId, gán vào tài khoản mặc định
    let finalAccountId = accountId;
    if (!finalAccountId) {
      const defaultAccount = await Account.findOne({ userId, isDefault: true });
      if (defaultAccount) {
        finalAccountId = defaultAccount._id;
      }
    }
    
    let finalCategoryId = categoryId;
    let aiConfidence = null;
    let aiCategory = null;
    
    // AI classification if no category provided
    if (!categoryId && description) {
      const aiResult = await classifyTransaction(description, amount);
      if (aiResult) {
        // Find or create category
        let category = await Category.findOne({ 
          userId, 
          name: aiResult.category,
          type: type || 'expense'
        });
        
        if (!category) {
          category = await Category.create({
            userId,
            name: aiResult.category,
            type: type || 'expense',
            icon: '🤖',
            color: '#888888'
          });
        }
        
        finalCategoryId = category._id;
        aiConfidence = aiResult.confidence;
        aiCategory = aiResult.category;
      }
    }
    
    const transaction = await Transaction.create({
      userId,
      accountId: finalAccountId,
      categoryId: finalCategoryId,
      type: type || 'expense',
      amount,
      date: date || new Date(),
      description,
      tags,
      aiConfidence,
      aiCategory
    });
    
    await transaction.populate('categoryId');

    // Trigger AI notification evaluation (bất đồng bộ, không block response)
    evaluateTransaction(transaction).catch(err => {
      console.error('[Transaction.create] AI trigger error:', err.message);
    });

    res.json(transaction);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ error: msg });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ: ' + err.message });
    }
    console.error('[Transaction.create] error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true }
    ).populate('categoryId');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Trigger AI notification evaluation khi cập nhật giao dịch
    evaluateTransaction(transaction).catch(err => {
      console.error('[Transaction.update] AI trigger error:', err.message);
    });
    
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const transaction = await Transaction.findOneAndDelete({ 
      _id: req.params.id, 
      userId 
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getSummary(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { month } = req.query;
    const startDate = new Date(`${month || new Date().toISOString().slice(0, 7)}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const transactions = await Transaction.find({
      userId,
      date: { $gte: startDate, $lt: endDate }
    }).populate('categoryId');
    
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      byCategory: {}
    };
    
    transactions.forEach(t => {
      if (t.type === 'income') summary.totalIncome += t.amount;
      else summary.totalExpense += t.amount;
      
      const catName = t.categoryId?.name || 'Khác';
      if (!summary.byCategory[catName]) {
        summary.byCategory[catName] = { income: 0, expense: 0 };
      }
      summary.byCategory[catName][t.type] += t.amount;
    });
    
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove, getSummary };