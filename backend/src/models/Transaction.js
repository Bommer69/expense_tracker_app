const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  type: { type: String, enum: ['expense', 'income', 'transfer'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'VND' },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String },
  tags: [String],
  attachments: [String],
  aiConfidence: Number,
  aiCategory: String,
  recurringTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTransaction' },
  recurringKey: { type: String }
}, { timestamps: true });

// Index for query performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1 });
transactionSchema.index(
  { userId: 1, recurringKey: 1 },
  { unique: true, partialFilterExpression: { recurringKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Transaction', transactionSchema);