const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true }, // YYYY-MM format
  spent: { type: Number, default: 0 }
}, { timestamps: true });

budgetSchema.index({ userId: 1, month: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);