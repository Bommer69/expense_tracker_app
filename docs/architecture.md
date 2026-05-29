# Kiến trúc hệ thống — Expense Tracker

> Tổng quan kiến trúc full-stack: React Native (Expo) + Node.js/Express + MongoDB + Gemini AI

---

## 1. Tổng quan cấu trúc thư mục

```
expense-tracker/
├── backend/                        # Node.js/Express REST API
│   └── src/
│       ├── routes/                 # Định tuyến HTTP (tách biệt từng resource)
│       ├── controllers/            # Xử lý request/response
│       ├── services/               # Business logic (AI, recurring transactions)
│       ├── models/                 # Mongoose schemas (MongoDB ODM)
│       ├── middleware/             # Express middleware (auth, ...)
│       └── utils/                  # JWT helpers, utility functions
│
├── mobile/                         # React Native (Expo) client
│   ├── app/                        # Expo Router — file-based routing
│   │   ├── (auth)/                 # Auth group (login, onboarding)
│   │   └── (tabs)/                 # Tab group (trang chủ, giao dịch, ...)
│   └── src/
│       ├── api/                    # Tầng API — Axios + interceptors
│       ├── context/                # React Context (Auth, Theme)
│       ├── hooks/                  # Custom hooks (data fetching, logic)
│       ├── components/             # UI components tái sử dụng
│       ├── styles/                 # Style modules
│       └── utils/                  # Formatters, error handlers
│
└── docs/                           # Tài liệu thiết kế & kế hoạch
```

---

## 2. Backend — Layered Architecture (Kiến trúc phân lớp)

### 2.1 Luồng xử lý request

```
Route (định tuyến HTTP)
   ↓
Controller (xử lý req/res, gọi service nếu cần)
   ↓
Service (business logic — AI, recurring generator)
   ↓
Model (Mongoose schema + indexes)
   ↓
MongoDB Atlas
```

### 2.2 Ví dụ luồng: `POST /api/transactions`

```
routes/transactions.js
  → router.post('/', create)
    → controllers/transactionController.js
      → getUserId(req) → xác thực JWT
      → Transaction.create(payload) → Mongoose → MongoDB
      → res.json(transaction)
```

### 2.3 Các thành phần backend

| Thành phần | Pattern | Công nghệ | Mô tả |
|---|---|---|---|
| **Routing** | RESTful, resource-based | Express Router | Mỗi resource một file route riêng |
| **Controllers** | Handler functions | `async (req, res)` | Xử lý request, validate, gọi Model/Service |
| **Auth** | JWT stateless | `jsonwebtoken` + middleware | `requireAuth` / `optionalAuth` / inline `getUserId()` |
| **Database** | ODM | Mongoose + MongoDB Atlas | Schema validation, indexes, population |
| **AI** | Function calling + tool pattern | Gemini 2.5-flash | Tool declarations → tool functions → MongoDB |
| **Security** | Middleware chain | helmet, cors, express-rate-limit | Rate limiting chỉ áp dụng cho auth routes |
| **Validation** | Manual | if/throw | Không dùng Joi/Zod |

### 2.4 Danh sách API endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/transactions
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
GET    /api/transactions/summary

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/budgets
POST   /api/budgets
DELETE /api/budgets/:id

POST   /api/ai/chat
POST   /api/ai/classify
POST   /api/ai/spending-advice

GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/balance

GET    /api/savings-goals
POST   /api/savings-goals
PUT    /api/savings-goals/:id
DELETE /api/savings-goals/:id

GET    /api/recurring-transactions
POST   /api/recurring-transactions
DELETE /api/recurring-transactions/:id

GET    /api/health
```

---

## 3. Frontend — Component-based + Custom Hooks

### 3.1 File-based Routing (Expo Router)

```
app/
├── _layout.js                    ← Root layout: AuthGuard + Providers
├── (auth)/
│   ├── _layout.js                ← Auth group layout
│   └── login.js                  ← Login + Onboarding slides carousel
├── (tabs)/
│   ├── _layout.js                ← Tab navigator (6 tabs, Ionicons)
│   ├── index.js                  ← Trang chủ (dashboard)
│   ├── transactions.js           ← Giao dịch (CRUD, filter, search)
│   ├── budget.js                 ← Ngân sách (theo tháng, category)
│   ├── statistics.js             ← Thống kê (biểu đồ)
│   ├── ai-chat.js                ← AI Chat (hội thoại)
│   └── profile.js                ← Hồ sơ + cài đặt
└── onboarding.js                 ← Onboarding screen
```

### 3.2 API Layer — Axios Interceptors

```
src/api/
├── client.js                     ← Axios instance + 2 interceptors:
│                                    • Request: gắn Bearer token từ AsyncStorage
│                                    • Response: xóa token khi 401
├── index.js                      ← Barrel export
├── auth.js, transactions.js, categories.js, budgets.js,
│   accounts.js, ai.js, savingsGoals.js, recurringTransactions.js
```

**Interceptor pattern:**
- **Request interceptor**: `config.headers.Authorization = Bearer ${token}` — tự động với mọi request
- **Response interceptor**: Khi gặp HTTP 401 → xóa `authToken` + `userData` khỏi AsyncStorage

### 3.3 State Management — Context + Custom Hooks

```
React Context API
├── AuthContext          ← token, user, login/register/logout
└── ThemeContext         ← dark/light mode, theme colors

Custom Hooks (mỗi hook = một resource)
├── useTransactions()    ← transactions, loading, error, CRUD functions
├── useCategories()      ← categories CRUD
├── useBudgets()         ← budgets CRUD
├── useAuth()            ← user, isAuthenticated
├── useTheme()           ← theme colors object
├── useAccounts()        ← account balance
└── useRecurringTransactions() ← recurring CRUD
```

**Mỗi custom hook tuân theo pattern:**
```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetch = useCallback(async () => {
  setLoading(true);
  try {
    const res = await api.get(...);
    setData(res.data);
  } catch (err) {
    setError(err.message);
  } finally { setLoading(false); }
}, []);

useEffect(() => { fetch(); }, [fetch]);
// Trả về { data, loading, error, fetch, create, update, delete }
```

### 3.4 Component Tree

```
RootLayout (GestureHandlerRootView)
  └── AuthProvider
      └── ThemeProvider
          └── Stack Navigator
              ├── (auth) LoginScreen
              │    └── OnboardingSlides (3 slides carousel)
              └── (tabs) TabNavigator (6 tabs)
                   ├── Home → QuickActions, BalanceCard, RecentTransactions
                   ├── Transactions → TransactionFilter, TransactionItem
                   ├── Budget → BudgetItem (progress bars)
                   ├── Statistics → DailyTrendChart (biểu đồ đường)
                   ├── AI Chat → ChatBubble, QuickPrompts
                   └── Profile → Settings, Logout
```

### 3.5 UI Components tái sử dụng

```
src/components/
├── ConfirmModal.js            ← Modal xác nhận (xóa, ...)
├── UserGuideModal.js          ← Modal hướng dẫn
├── DailyTrendChart.js         ← Biểu đồ chi tiêu theo ngày
├── Header.js                  ← Header component
├── home/
│   ├── BalanceCard.js         ← Thẻ số dư
│   ├── QuickActions.js        ← 4 action buttons nhanh
│   └── RecentTransactions.js  ← 5 giao dịch gần nhất
├── transactions/
│   ├── TransactionFilter.js   ← Bộ lọc (all/income/expense + search)
│   └── TransactionItem.js     ← Item swipeable (sửa/xóa)
└── ui/
    ├── Card.js                ← Thẻ container
    ├── EmptyState.js          ← Trạng thái rỗng
    ├── LoadingIndicator.js    ← Loading spinner
    └── SectionHeader.js       ← Section heading
```

---

## 4. Luồng dữ liệu tổng thể

```
Mobile App (Expo)                        Backend (Render)                    MongoDB Atlas
┌──────────────────┐    HTTP/JSON     ┌──────────────────┐    Mongoose    ┌──────────────┐
│ Component (Hook) │ ──── Axios ───→ │ Controller       │ ─── Model ──→ │  Database    │
│   gọi API        │                 │   → Service (AI) │               │              │
│   hiển thị UI    │ ←─── JSON ──── │   → Response      │ ←─── Doc ──── │              │
└──────────────────┘                 └──────────────────┘               └──────────────┘
       │                                    
       ▼                                    
 AsyncStorage                          
 (authToken, userData)                
```

---

## 5. Kiến trúc AI

### 5.1 Thành phần

```
aiController.js           ← Nhận chat request, gọi classifier
    │
aiClassifier.js           ← Google Generative AI SDK
    │                         • Khởi tạo Gemini model (lazy singleton)
    │                         • Quản lý history (in-memory cache + MongoDB)
    │                         • Function calling với tool declarations
    │
aiTools.js                ← Định nghĩa tools + implementation
    ├── get_monthly_summary     ← Tổng hợp thu/chi theo tháng
    ├── get_category_breakdown  ← Chi tiết theo category
    ├── get_budget_status       ← Trạng thái ngân sách
    ├── get_recent_transactions ← 10 giao dịch gần nhất
    ├── get_spending_trend     ← Xu hướng 6 tháng
    ├── get_forecast            ← Dự báo cuối tháng
    └── detect_anomalies        ← Phát hiện bất thường
```

### 5.2 Luồng chat AI

```
User gửi tin nhắn
  → POST /api/ai/chat
    → aiController.js
      → Gemini model (gemini-2.5-flash) với system prompt
        → Gemini quyết định gọi tool function
          → toolFunctions[functionName](args) → MongoDB queries
          → Gemini nhận kết quả → sinh response text
      → Lưu history vào ChatMessage collection
    → Response về client
```

### 5.3 Lưu ý

- **AI History Cache**: In-memory Map (`userHistories`), load từ DB lần đầu, tối đa 40 messages (20 exchanges)
- **Model Singleton**: `getGenAI()` + `getModel()` — lazy init, kiểm tra API key
- **Fallback**: Khi không có API key hoặc model lỗi → trả về thông báo lỗi tiếng Việt

---

## 6. Patterns & Kỹ thuật đã sử dụng

| Pattern | Mô tả | Áp dụng tại |
|---|---|---|
| **Layered Architecture** | Phân tách routes → controllers → services → models | Backend |
| **Repository Pattern** | Tách data access layer riêng | `mobile/src/api/*.js` |
| **Provider Pattern** | Context providers bao quanh app tree | `AuthProvider`, `ThemeProvider` |
| **Custom Hooks** | Tách logic data fetching khỏi UI | `useTransactions()`, `useCategories()`, ... |
| **Interceptor** | Axios request/response interceptors toàn cục | `client.js` — auth token + 401 handling |
| **Middleware Chain** | Express middleware cho cross-cutting concerns | `helmet`, `cors`, rate limiting, auth |
| **Singleton (AI)** | Lazy initialization cho Gemini model | `getGenAI()`, `getModel()` |
| **In-memory Cache** | Cache AI history để tránh query DB mỗi lần | `userHistories` Map |
| **Strategy (AI Tools)** | Function declarations → dynamic dispatch | `aiTools.js` — tool name → implementation |
| **File-based Routing** | Định tuyến dựa trên cấu trúc file | Expo Router (`app/` directory) |
| **JWT Stateless Auth** | Token-based authentication, không server session | `jsonwebtoken` + AsyncStorage |
| **Component Composition** | UI components nhỏ, ghép lại thành màn hình lớn | `src/components/` |

---

## 7. Security

- **JWT**: Token 7-day expiry, stored trong AsyncStorage
- **Rate Limiting**: 20 requests/15 phút cho auth routes (chống brute force)
- **helmet**: Security headers (XSS, content-type sniffing, ...)
- **CORS**: Cấu hình qua `ALLOWED_ORIGIN` env var
- **Password**: bcryptjs hash (User model)
- **Authorization**: Mỗi controller kiểm tra `userId` trước khi query — user chỉ truy cập dữ liệu của mình

---

## 8. Deployment

```
Frontend:  React Native (Expo) → App Store / Google Play
           + Expo Web (Vercel)
Backend:   Node.js/Express → Render (PaaS)
Database:  MongoDB Atlas (cloud)
AI:        Google Gemini API
```

---

*Tài liệu kiến trúc — Cập nhật lần cuối: 2026-05-29*
