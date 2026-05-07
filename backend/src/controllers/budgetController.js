/**
 * Budget Controller
 */

const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
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
    
    res.json(budget);
  } catch (err) {
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

module.exports = { getAll, createOrUpdate, getAlerts, remove };