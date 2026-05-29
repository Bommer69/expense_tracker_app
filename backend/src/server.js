const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';
const Transaction = require('./models/Transaction');
const User = require('./models/User');
const { generateDailySummary, evaluateAnomalies } = require('./services/aiTriggerService');

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

    // ===== In-process scheduler cho AI triggers =====
    // Kiểm tra mỗi 60 phút xem có nên chạy daily summary & anomaly scan không
    const SCHEDULE_INTERVAL = 60 * 60 * 1000; // 60 phút

    setInterval(async () => {
      try {
        const now = new Date();
        const hour = now.getHours();

        // Daily summary: chạy lúc 21:00-22:00 mỗi ngày
        if (hour === 21) {
          console.log('[Scheduler] Running daily summaries...');
          const users = await User.find({}).select('_id');
          for (const user of users) {
            try {
              await generateDailySummary(user._id);
            } catch (err) {
              console.error(`[Scheduler] daily summary failed for user ${user._id}:`, err.message);
            }
          }
          console.log(`[Scheduler] Daily summaries done for ${users.length} users`);
        }

        // Anomaly scan: chạy lúc 12:00 và 18:00 mỗi ngày
        if (hour === 12 || hour === 18) {
          console.log('[Scheduler] Running anomaly evaluations...');
          const users = await User.find({}).select('_id');
          for (const user of users) {
            try {
              await evaluateAnomalies(user._id);
            } catch (err) {
              console.error(`[Scheduler] anomaly eval failed for user ${user._id}:`, err.message);
            }
          }
          console.log(`[Scheduler] Anomaly evaluations done for ${users.length} users`);
        }
      } catch (err) {
        console.error('[Scheduler] error:', err.message);
      }
    }, SCHEDULE_INTERVAL);

    console.log(`⏰ AI Trigger scheduler started (interval: ${SCHEDULE_INTERVAL / 60000} min)`);

  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
