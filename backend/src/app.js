require('dotenv').config();
const express = require('express');
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
const notificationRoutes = require('./routes/notifications');

const app = express();

// Trust proxy (Render, Railway, Vercel, Nginx, ...)
app.set('trust proxy', 1);

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
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

module.exports = app;
