const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function normalizeSchedule(recurring) {
  if (recurring.frequency === 'weekly') {
    const weeklyDay = Number.isInteger(recurring.dayOfWeek)
      ? recurring.dayOfWeek
      : recurring.startDate.getDay();
    return { weeklyDay };
  }

  if (recurring.frequency === 'monthly') {
    const monthlyDay = Number.isInteger(recurring.dayOfMonth)
      ? recurring.dayOfMonth
      : recurring.startDate.getDate();
    return { monthlyDay };
  }

  return {};
}

function nextDateFrom(current, recurring, schedule) {
  const next = new Date(current);
  if (recurring.frequency === 'daily') {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (recurring.frequency === 'weekly') {
    const targetDay = schedule.weeklyDay;
    const currentDay = next.getDay();
    const add = (targetDay - currentDay + 7) % 7 || 7;
    next.setDate(next.getDate() + add);
    return next;
  }

  const targetDay = schedule.monthlyDay;
  const targetMonth = next.getMonth() + 1;
  next.setDate(1);
  next.setMonth(targetMonth);
  const lastDay = daysInMonth(next.getFullYear(), next.getMonth());
  next.setDate(Math.min(targetDay, lastDay));
  return next;
}

function firstDueDate(recurring, schedule) {
  const start = startOfDay(new Date(recurring.startDate));
  if (recurring.frequency === 'daily') return start;

  if (recurring.frequency === 'weekly') {
    const targetDay = schedule.weeklyDay;
    const currentDay = start.getDay();
    const add = (targetDay - currentDay + 7) % 7;
    const due = new Date(start);
    due.setDate(due.getDate() + add);
    return due;
  }

  const targetDay = schedule.monthlyDay;
  const due = new Date(start.getFullYear(), start.getMonth(), 1);
  due.setDate(Math.min(targetDay, daysInMonth(due.getFullYear(), due.getMonth())));
  if (due < start) {
    due.setMonth(due.getMonth() + 1);
    due.setDate(Math.min(targetDay, daysInMonth(due.getFullYear(), due.getMonth())));
  }
  return due;
}

async function generateRecurringTransactions(userId, upTo = new Date()) {
  const upToDay = startOfDay(new Date(upTo));
  const recurrings = await RecurringTransaction.find({ userId, isActive: true });
  let generatedCount = 0;

  // Tìm tài khoản mặc định để fallback nếu recurring chưa có accountId
  let defaultAccountId = null;
  if (recurrings.some(r => !r.accountId)) {
    const defaultAccount = await Account.findOne({ userId, isDefault: true });
    if (defaultAccount) {
      defaultAccountId = defaultAccount._id;
    }
  }

  for (const recurring of recurrings) {
    const schedule = normalizeSchedule(recurring);
    let cursor = recurring.lastGeneratedAt
      ? nextDateFrom(startOfDay(new Date(recurring.lastGeneratedAt)), recurring, schedule)
      : firstDueDate(recurring, schedule);

    const endDate = recurring.endDate ? startOfDay(new Date(recurring.endDate)) : null;

    while (cursor <= upToDay && (!endDate || cursor <= endDate)) {
      const recurringKey = `${recurring._id}:${formatDateKey(cursor)}`;
      try {
        await Transaction.create({
          userId,
          accountId: recurring.accountId || defaultAccountId,
          categoryId: recurring.categoryId,
          type: recurring.type,
          amount: recurring.amount,
          description: recurring.description,
          date: cursor,
          recurringTransactionId: recurring._id,
          recurringKey
        });
        generatedCount += 1;
      } catch (err) {
        // E11000 = duplicate key: concurrent requests raced to insert same recurringKey
        if (err.code !== 11000) throw err;
      }
      recurring.lastGeneratedAt = cursor;
      cursor = nextDateFrom(cursor, recurring, schedule);
    }

    await recurring.save();
  }

  return { generatedCount };
}

module.exports = { generateRecurringTransactions };
