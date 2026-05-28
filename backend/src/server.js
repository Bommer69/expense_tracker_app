const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
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
