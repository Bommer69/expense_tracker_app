/**
 * Budget Controller
 */

const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { getUserId } = require('../utils/auth');

async function getAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { month } = req.query;
    const query = { userId };
    if (month) query.month = month;
    
    let budgets = await Budget.find(query).populate('categoryId');
    
    // Dynamically calculate spent amount for each budget based on transactions
    if (budgets.length > 0) {
      const updatedBudgets = [];
      for (let budget of budgets) {
        if (!budget.categoryId) continue;
        const startDate = new Date(`${budget.month}-01`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        
        const transactions = await Transaction.find({
          userId,
          categoryId: budget.categoryId._id,
          type: 'expense',
          date: { $gte: startDate, $lt: endDate }
        });
        
        const calculatedSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
        
        // Update document if mismatch (to keep DB in sync, though we return realtime anyway)
        if (budget.spent !== calculatedSpent) {
          budget.spent = calculatedSpent;
          await budget.save();
        }
        
        updatedBudgets.push(budget);
      }
      budgets = updatedBudgets;
    }
    
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createOrUpdate(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { categoryId, amount, month } = req.body;
    
    // Calculate spent amount
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const transactions = await Transaction.find({
      userId,
      categoryId,
      type: 'expense',
      date: { $gte: startDate, $lt: endDate }
    });
    
    const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    const budget = await Budget.findOneAndUpdate(
      { userId, categoryId, month },
      { amount, spent },
      { new: true, upsert: true }
    ).populate('categoryId');

    // Tạo notification nếu overspent
    const categoryName = budget.categoryId?.name || 'Danh mục';
    if (spent > amount) {
      const percent = Math.round((spent / amount) * 100);
      await Notification.create({
        userId,
        type: 'budget_alert',
        severity: percent >= 100 ? 'critical' : 'warning',
        title: percent >= 100 ? '⚠️ Ngân sách vượt mức!' : '⚠️ Ngân sách sắp vượt!',
        message: `"${categoryName}" đã chi ${spent.toLocaleString('vi-VN')}₫ / ${amount.toLocaleString('vi-VN')}₫ (${percent}%).`,
        data: {
          categoryId,
          amount: spent,
          extra: { budgetAmount: amount, percent, categoryName },
        },
        aiGenerated: false,
      });
    }

    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, categoryId, month } = req.body;
    const updates = {};

    if (typeof amount === 'number') updates.amount = amount;
    if (categoryId) updates.categoryId = categoryId;
    if (month) updates.month = month;

    const existingBudget = await Budget.findOne({ _id: req.params.id, userId });
    if (!existingBudget) return res.status(404).json({ error: 'Budget not found' });

    const resolvedCategoryId = updates.categoryId || existingBudget.categoryId;
    const resolvedMonth = updates.month || existingBudget.month;

    const startDate = new Date(`${resolvedMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const transactions = await Transaction.find({
      userId,
      categoryId: resolvedCategoryId,
      type: 'expense',
      date: { $gte: startDate, $lt: endDate }
    });

    updates.spent = transactions.reduce((sum, t) => sum + t.amount, 0);

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId },
      updates,
      { new: true, runValidators: true }
    ).populate('categoryId');

    // Tạo notification nếu overspent
    const resolvedAmount = updates.amount || existingBudget.amount;
    if (updates.spent > resolvedAmount) {
      const percent = Math.round((updates.spent / resolvedAmount) * 100);
      const populatedBudget = await Budget.findById(budget._id).populate('categoryId');
      const categoryName = populatedBudget?.categoryId?.name || 'Danh mục';
      await Notification.create({
        userId,
        type: 'budget_alert',
        severity: percent >= 100 ? 'critical' : 'warning',
        title: percent >= 100 ? '⚠️ Ngân sách vượt mức!' : '⚠️ Ngân sách sắp vượt!',
        message: `"${categoryName}" đã chi ${updates.spent.toLocaleString('vi-VN')}₫ / ${resolvedAmount.toLocaleString('vi-VN')}₫ (${percent}%).`,
        data: {
          categoryId: resolvedCategoryId,
          amount: updates.spent,
          extra: { budgetAmount: resolvedAmount, percent, categoryName },
        },
        aiGenerated: false,
      });
    }

    res.json(budget);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Budget already exists for this category and month' });
    }
    res.status(500).json({ error: err.message });
  }
}

async function getAlerts(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const budgets = await Budget.find({ 
      userId, 
      month: currentMonth,
      $expr: { $gte: [{ $divide: ['$spent', '$amount'] }, 0.8] }
    }).populate('categoryId');
    
    const alerts = budgets.map(b => ({
      category: b.categoryId.name,
      budget: b.amount,
      spent: b.spent,
      percent: Math.round((b.spent / b.amount) * 100),
      status: b.spent > b.amount ? 'exceeded' : 'warning'
    }));
    
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
async function remove(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, createOrUpdate, update, getAlerts, remove };