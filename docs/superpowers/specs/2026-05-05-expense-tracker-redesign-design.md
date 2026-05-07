# Expense Tracker Redesign - Design Document

## Overview
Transform the existing expense tracker app into a complete, production-ready personal finance management application with improved UI/UX and comprehensive features.

## Technology Stack
- Frontend: React Native (Expo)
- Backend: Node.js + Express
- Database: MongoDB
- AI: LangChain + Ollama (llama3.2)

## UI/UX Design

### Visual Style: Minimalist
- Clean, spacious layout
- System font, 16px base size
- No heavy shadows, subtle 1px borders
- 8px border radius
- Outline-style icons (24px)

### Color Scheme

**Light Mode:**
| Element | Color |
|---------|-------|
| Background | #FFFFFF |
| Surface | #F5F5F5 |
| Text Primary | #1A1A1A |
| Text Secondary | #666666 |
| Accent | #007AFF |
| Success | #34C759 |
| Warning | #FF9500 |
| Error | #FF3B30 |

**Dark Mode:**
| Element | Color |
|---------|-------|
| Background | #1A1A1A |
| Surface | #2C2C2E |
| Text Primary | #FFFFFF |
| Text Secondary | #ABABAB |
| Accent | #0A84FF |

### Navigation Structure

```
┌─────────────────────────────────────┐
│            Header                   │
├─────────────────────────────────────┤
│                                     │
│           Content Area              │
│           (Screen)                  │
│                                     │
├─────────────────────────────────────┤
│  🏠   📝   🎯   👤                 │
│ Home Trans Budget Profile          │
└─────────────────────────────────────┘
```

- 4 Fixed Tabs: Home, Transactions, Budget, Profile
- Each tab has its own stack navigation
- Floating Action Button (FAB) for quick add

## Features to Implement

### 1. Accounts Management (Tài khoản)
- Multiple account types: Cash, Bank, Credit Card
- Track balance per account
- Default account selection
- Transfer between accounts

### 2. Recurring Transactions (Giao dịch định kỳ)
- Frequency: Daily, Weekly, Monthly, Yearly
- Auto-create transactions based on schedule
- Enable/disable recurring

### 3. Savings Goals (Mục tiêu tiết kiệm)
- Set target amount and deadline
- Track progress
- Visual progress indicator
- Add funds to goal

### 4. Data Export
- Export to CSV/Excel
- Date range selection

### 5. Notifications
- Budget warning alerts
- Recurring transaction reminders
- Bill due date reminders

### 6. User Profile
- User information management
- Account overview
- Settings access
- Dark mode toggle

### 7. Onboarding
- 3 introduction slides
- Skip option
- First-time user detection via AsyncStorage

### 8. Dark Mode
- System-aware (auto-detect phone settings)
- Manual toggle in Profile
- Persisted preference

## Data Models

### Account
```javascript
{
  name: String,
  type: String (cash/bank/card),
  balance: Number,
  color: String,
  isDefault: Boolean,
  userId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### RecurringTransaction
```javascript
{
  userId: ObjectId,
  amount: Number,
  description: String,
  categoryId: ObjectId,
  type: String (income/expense),
  frequency: String (daily/weekly/monthly/yearly),
  nextDate: Date,
  isActive: Boolean,
  createdAt: Date
}
```

### SavingsGoal
```javascript
{
  userId: ObjectId,
  name: String,
  targetAmount: Number,
  currentAmount: Number,
  deadline: Date,
  icon: String,
  color: String,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Notification
```javascript
{
  userId: ObjectId,
  type: String (budget_warning/recurring_reminder/bill_due),
  title: String,
  message: String,
  scheduledDate: Date,
  isRead: Boolean,
  createdAt: Date
}
```

## Screens Specification

### Onboarding Screen
- 3 slides: Welcome, Features, Get Started
- Page indicators
- Skip button (top right)
- Get Started button (last slide)
- Stored in AsyncStorage (hasOnboarded)

### Home Tab
- Monthly summary card (income, expense, balance)
- Recent transactions (last 5)
- Quick add button (FAB)
- Budget overview summary
- Savings goals progress (if any)

### Transactions Tab
- Tab switcher: All / Income / Expense
- Search bar
- Filter by date, category, account
- Swipe to delete
- Pull to refresh
- Floating add button

### Budget Tab
- Monthly budget selector
- Budget cards per category
- Progress bar with percentage
- Add new budget button
- Warning color when >= 80%
- Error color when >= 100%

### Profile Tab
- User avatar and name
- Total balance across accounts
- Accounts list (expandable)
- Savings goals section
- Settings:
  - Dark mode toggle
  - Notifications toggle
  - Export data button
  - About

## Implementation Priority

1. Tab Navigation Setup
2. Onboarding Screen
3. UI Refactoring (Minimalist Design)
4. Dark Mode Implementation
5. Accounts Feature
6. Recurring Transactions
7. Savings Goals
8. Notifications
9. Data Export
10. Profile Enhancements

## API Endpoints Required

### Accounts
- GET /api/accounts
- POST /api/accounts
- PUT /api/accounts/:id
- DELETE /api/accounts/:id

### Recurring
- GET /api/recurring
- POST /api/recurring
- PUT /api/recurring/:id
- DELETE /api/recurring/:id

### Savings Goals
- GET /api/goals
- POST /api/goals
- PUT /api/goals/:id
- DELETE /api/goals/:id
- POST /api/goals/:id/add

### Export
- GET /api/export/csv

### Settings
- GET /api/settings
- PUT /api/settings