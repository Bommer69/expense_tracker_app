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

// ======================== HOOKS: GỬI PUSH NOTIFICATION ========================
//
// Mỗi khi một Notification được tạo mới (không phải update), tự động gửi
// push notification đến tất cả thiết bị đã đăng ký của user.
// Dùng setImmediate để không block luồng chính.

// Đánh dấu document là mới hay update
notificationSchema.pre('save', function(next) {
  this.__isNewDoc = this.isNew;
  next();
});

notificationSchema.post('save', function(doc, next) {
  // Chỉ gửi push cho document mới tạo, không gửi khi update
  if (!doc.__isNewDoc) {
    return next();
  }

  setImmediate(async () => {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(doc.userId).select('pushTokens').lean();

      if (!user || !user.pushTokens || user.pushTokens.length === 0) {
        return; // Không có token, bỏ qua
      }

      // Dynamic require để tránh circular dependency
      const { sendPushToUser } = require('../services/pushService');
      await sendPushToUser(user, doc);
    } catch (err) {
      console.error('[Notification.postSave] Push send error:', err.message);
    }
  });

  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
