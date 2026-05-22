require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const aiRoutes = require('./routes/ai');
const accountRoutes = require('./routes/accounts');
const savingsGoalRoutes = require('./routes/savingsGoals');
const recurringTransactionRoutes = require('./routes/recurringTransactions');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors(allowedOrigin ? {
  origin: allowedOrigin,
  credentials: true,
} : {}));
app.use(express.json());

// Rate limiting cho auth routes (chống brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/savings-goals', savingsGoalRoutes);
app.use('/api/recurring-transactions', recurringTransactionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';
const Transaction = require('./models/Transaction');

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Drop the old sparse index that incorrectly indexed null recurringKey values,
    // causing E11000 duplicate key errors for regular (non-recurring) transactions.
    try {
      await Transaction.collection.dropIndex('userId_1_recurringKey_1');
      console.log('✅ Dropped old recurringKey sparse index');
    } catch (e) {
      // Index doesn't exist yet — nothing to drop, this is fine
    }
    // Re-sync indexes so the new partialFilterExpression index is created
    await Transaction.syncIndexes();
    console.log('✅ Transaction indexes synced');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;