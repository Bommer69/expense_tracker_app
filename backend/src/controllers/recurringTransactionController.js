const RecurringTransaction = require('../models/RecurringTransaction');
const Account = require('../models/Account');
const { getUserId } = require('../utils/auth');
const { generateRecurringTransactions } = require('../services/recurringGenerator');

async function getAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await generateRecurringTransactions(userId);
    const items = await RecurringTransaction.find({ userId })
      .populate('categoryId')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Nếu không có accountId, gán vào tài khoản mặc định
    const data = { ...req.body };
    if (!data.accountId) {
      const defaultAccount = await Account.findOne({ userId, isDefault: true });
      if (defaultAccount) {
        data.accountId = defaultAccount._id;
      }
    }

    const item = await RecurringTransaction.create({
      ...data,
      userId
    });
    await item.populate('categoryId');
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const item = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true, runValidators: true }
    ).populate('categoryId');
    if (!item) return res.status(404).json({ error: 'Recurring transaction not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const deleted = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ error: 'Recurring transaction not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove };
