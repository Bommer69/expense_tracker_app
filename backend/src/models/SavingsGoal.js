const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // YYYY-MM
  targetAmount: { type: Number, required: true, min: 0 },
  note: { type: String, default: '' },
  alertEnabled: { type: Boolean, default: true }
}, { timestamps: true });

savingsGoalSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
