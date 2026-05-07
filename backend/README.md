# Expense Tracker Backend

REST API cho ứng dụng theo dõi chi tiêu.

## Cấu Trúc

```
src/
├── controllers/   # Xử lý logic request
├── models/       # Schema database (MongoDB/Mongoose)
├── routes/       # Định nghĩa API endpoints
├── services/     # Logic nghiệp vụ (AI classifier, etc.)
├── utils/        # Tiện ích (auth helpers)
└── index.js      # Entry point
```

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | `/api/auth/register`, `/api/auth/login` |
| Transactions | `/api/transactions` (CRUD) |
| Categories | `/api/categories` (CRUD) |
| Budgets | `/api/budgets` (CRUD) |
| Accounts | `/api/accounts` (CRUD) |
| AI | `/api/ai/classify` |

## Chạy Local

```bash
npm install
cp .env.example .env
# Cập nhật .env với MongoDB URI
npm run dev
```

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication