/**
 * Account Controller
 */

const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { getUserId } = require('../utils/auth');

async function getAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const accounts = await Account.find({ userId }).sort({ isDefault: -1, name: 1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const account = await Account.create({ ...req.body, userId });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true }
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Check if account has transactions
    const hasTransactions = await Transaction.exists({ accountId: req.params.id });
    if (hasTransactions) {
      return res.status(400).json({ error: 'Cannot delete account with transactions' });
    }
    
    const account = await Account.findOneAndDelete({ 
      _id: req.params.id, 
      userId, 
      isDefault: false 
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found or cannot be deleted' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBalance(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const accounts = await Account.find({ userId });
    
    // Tìm tài khoản mặc định để gộp các giao dịch legacy (không có accountId)
    const defaultAccount = accounts.find(a => a.isDefault) || accounts[0];
    
    // Calculate balances from transactions
    const balances = await Promise.all(accounts.map(async (account) => {
      let query;
      const isDefault = defaultAccount && account._id.toString() === defaultAccount._id.toString();
      
      if (isDefault) {
        // Tài khoản mặc định: gộp cả giao dịch cũ không có accountId
        query = {
          userId,
          $or: [
            { accountId: account._id },
            { accountId: { $exists: false } },
            { accountId: null }
          ]
        };
      } else {
        // Các tài khoản khác: chỉ lấy giao dịch gắn với tài khoản đó
        query = { userId, accountId: account._id };
      }
      
      const transactions = await Transaction.find(query);
      
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        ...account.toObject(),
        calculatedBalance: income - expense
      };
    }));
    
    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove, getBalance };