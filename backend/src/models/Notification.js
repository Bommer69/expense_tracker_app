const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'transaction_update', // Mọi giao dịch phát sinh
      'balance_change',     // Biến động số dư lớn
      'large_transaction',  // Giao dịch giá trị lớn
      'budget_alert',       // Cảnh báo ngân sách
      'anomaly',            // Chi tiêu bất thường
      'daily_summary',      // Tổng kết cuối ngày
      'ai_insight',         // Insight từ AI
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    amount: Number,
    balanceAfter: Number,
    percentageChange: Number,
    // Dữ liệu mở rộng cho từng loại
    extra: mongoose.Schema.Types.Mixed,
  },
  aiGenerated: { type: Boolean, default: false },
  aiAnalysis: { type: String },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
