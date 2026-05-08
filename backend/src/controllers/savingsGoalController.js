const SavingsGoal = require('../models/SavingsGoal');
const Transaction = require('../models/Transaction');
const { getUserId } = require('../utils/auth');

function getMonthRange(month) {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return { startDate, endDate };
}

async function computeMonthStats(userId, month) {
  const { startDate, endDate } = getMonthRange(month);
  const txs = await Transaction.find({
    userId,
    date: { $gte: startDate, $lt: endDate }
  }).select('type amount date');

  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savedAmount = totalIncome - totalExpense;

  return { totalIncome, totalExpense, savedAmount };
}

function buildProgress(goal, stats) {
  const progressPercent = goal.targetAmount > 0
    ? Math.round((stats.savedAmount / goal.targetAmount) * 100)
    : 0;

  const now = new Date();
  const [year, month] = goal.month.split('-').map(Number);
  const currentMonthMatch = now.getFullYear() === year && now.getMonth() + 1 === month;

  let status = 'on_track';
  if (stats.savedAmount < 0) status = 'behind';
  if (currentMonthMatch && goal.targetAmount > 0) {
    const passedDays = now.getDate();
    const monthDays = new Date(year, month, 0).getDate();
    const expectedByNow = (goal.targetAmount * passedDays) / monthDays;
    if (stats.savedAmount < expectedByNow * 0.8) status = 'behind';
  }
  if (stats.savedAmount >= goal.targetAmount) status = 'completed';

  return {
    targetAmount: goal.targetAmount,
    savedAmount: stats.savedAmount,
    remainingAmount: goal.targetAmount - stats.savedAmount,
    progressPercent,
    totalIncome: stats.totalIncome,
    totalExpense: stats.totalExpense,
    status
  };
}

async function getAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { month } = req.query;
    const query = { userId };
    if (month) query.month = month;

    const goals = await SavingsGoal.find(query).sort({ month: -1 });
    const withProgress = [];
    for (const goal of goals) {
      const stats = await computeMonthStats(userId, goal.month);
      withProgress.push({
        ...goal.toObject(),
        progress: buildProgress(goal, stats)
      });
    }
    res.json(withProgress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createOrUpdate(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { month, targetAmount, note, alertEnabled } = req.body;
    if (!month || typeof targetAmount !== 'number') {
      return res.status(400).json({ error: 'month và targetAmount là bắt buộc' });
    }

    const goal = await SavingsGoal.findOneAndUpdate(
      { userId, month },
      { targetAmount, note: note || '', alertEnabled: alertEnabled !== false },
      { new: true, upsert: true, runValidators: true }
    );

    const stats = await computeMonthStats(userId, goal.month);
    res.json({
      ...goal.toObject(),
      progress: buildProgress(goal, stats)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const deleted = await SavingsGoal.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ error: 'Savings goal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, createOrUpdate, remove };
