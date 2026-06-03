/**
 * Test app – mirrors index.js nhưng KHÔNG kết nối MongoDB và KHÔNG start server.
 * MongoDB được quản lý bởi mongodb-memory-server trong globalSetup/teardown.
 */
require('dotenv').config();
const express = require('express');

const authRoutes              = require('../../src/routes/auth');
const transactionRoutes       = require('../../src/routes/transactions');
const categoryRoutes          = require('../../src/routes/categories');
const budgetRoutes            = require('../../src/routes/budgets');
const aiRoutes                = require('../../src/routes/ai');
const savingsGoalRoutes       = require('../../src/routes/savingsGoals');
const recurringRoutes         = require('../../src/routes/recurringTransactions');

const app = express();
app.use(express.json());

// Không dùng helmet/cors/rateLimit để test gọn hơn
app.use('/api/auth',                  authRoutes);
app.use('/api/transactions',          transactionRoutes);
app.use('/api/categories',            categoryRoutes);
app.use('/api/budgets',               budgetRoutes);
app.use('/api/ai',                    aiRoutes);
app.use('/api/savings-goals',         savingsGoalRoutes);
app.use('/api/recurring-transactions',recurringRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = app;
