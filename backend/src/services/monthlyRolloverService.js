/**
 * Monthly Rollover Service
 *
 * Tự động chuyển đổi dữ liệu sang tháng mới:
 * 1. Sinh các giao dịch định kỳ (recurring) cho tháng mới
 * 2. Copy ngân sách từ tháng trước sang tháng mới
 * 3. Gửi thông báo tổng kết tháng cũ + bắt đầu tháng mới
 */

const User = require('../models/User');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const { generateRecurringTransactions } = require('./recurringGenerator');

/**
 * Kiểm tra và thực hiện rollover sang tháng mới cho một user.
 * Chỉ gửi thông báo LẦN ĐẦU khi tháng mới bắt đầu (khi có budget được copy).
 */
async function rolloverUser(userId) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

  // Kiểm tra xem đã rollover tháng này chưa (dựa vào budget tháng hiện tại)
  const existingBudgetCount = await Budget.countDocuments({
    userId,
    month: currentMonth,
  });
  const isFirstRollover = existingBudgetCount === 0;

  // ===== 1. Sinh giao dịch định kỳ cho tháng mới =====
  const recurringResult = await generateRecurringTransactions(userId, now);

  // ===== 2. Copy ngân sách từ tháng trước sang tháng mới (nếu chưa có) =====
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const prevBudgets = await Budget.find({ userId, month: prevMonth }).populate('categoryId');

  let copiedBudgetCount = 0;
  for (const prevBudget of prevBudgets) {
    const existing = await Budget.findOne({
      userId,
      categoryId: prevBudget.categoryId?._id || prevBudget.categoryId,
      month: currentMonth,
    });

    if (!existing && prevBudget.categoryId) {
      await Budget.create({
        userId,
        categoryId: prevBudget.categoryId._id || prevBudget.categoryId,
        amount: prevBudget.amount,
        month: currentMonth,
        spent: 0,
      });
      copiedBudgetCount++;
    }
  }

  // ===== 3. Chỉ gửi thông báo nếu là lần rollover đầu tiên của tháng =====
  if (isFirstRollover && (prevBudgets.length > 0 || recurringResult.generatedCount > 0)) {
    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ];
    const currentMonthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    if (prevBudgets.length > 0) {
      await Notification.create({
        userId,
        type: 'daily_summary',
        severity: 'info',
        title: `📊 Tổng kết ${monthNames[prevDate.getMonth()]} ${prevDate.getFullYear()}`,
        message: `Bạn đã thiết lập ${prevBudgets.length} ngân sách trong tháng trước. Đã copy ${copiedBudgetCount} ngân sách sang ${currentMonthName}.`,
        data: {
          extra: { prevMonth, currentMonth, budgetCount: prevBudgets.length, copiedBudgetCount },
        },
        aiGenerated: false,
      });
    }

    if (recurringResult.generatedCount > 0) {
      await Notification.create({
        userId,
        type: 'transaction_update',
        severity: 'info',
        title: `🔄 Đã tạo giao dịch định kỳ cho ${currentMonthName}`,
        message: `Hệ thống đã tự động tạo ${recurringResult.generatedCount} giao dịch định kỳ cho tháng mới.`,
        data: {
          extra: { month: currentMonth, generatedCount: recurringResult.generatedCount },
        },
        aiGenerated: false,
      });
    }
  }

  return {
    recurringGenerated: recurringResult.generatedCount,
    budgetsCopied: copiedBudgetCount,
    isNewMonth: isFirstRollover,
  };
}

/**
 * Kiểm tra tất cả users và thực hiện rollover nếu cần
 * Chạy 1 lần/ngày, kiểm tra xem tháng hiện tại đã được rollover chưa
 * Bằng cách xem có budget và/hoặc recurring transactions cho tháng mới không
 */
async function monthlyRolloverCheck() {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  console.log(`[MonthlyRollover] Kiểm tra rollover cho tháng ${currentMonth}...`);

  const users = await User.find({}).select('_id');
  let totalRecurring = 0;
  let totalBudgets = 0;
  let processedUsers = 0;

  for (const user of users) {
    try {
      // Kiểm tra nếu tháng này đã có budget nào chưa
      const existingBudgetCount = await Budget.countDocuments({
        userId: user._id,
        month: currentMonth,
      });

      // Nếu chưa có budget nào cho tháng này => cần rollover
      // (Budget là chỉ báo tốt vì nếu đã rollover thì sẽ có budget cho tháng mới)
      if (existingBudgetCount === 0) {
        console.log(`[MonthlyRollover] Đang rollover cho user ${user._id}...`);
        const result = await rolloverUser(user._id);
        totalRecurring += result.recurringGenerated;
        totalBudgets += result.budgetsCopied;
        processedUsers++;
      }
    } catch (err) {
      console.error(`[MonthlyRollover] Lỗi khi rollover user ${user._id}:`, err.message);
    }
  }

  console.log(
    `[MonthlyRollover] ✅ Hoàn tất: ${processedUsers} users, ` +
    `${totalRecurring} giao dịch định kỳ, ${totalBudgets} ngân sách đã copy.`
  );

  return { processedUsers, totalRecurring, totalBudgets };
}

module.exports = { rolloverUser, monthlyRolloverCheck };
