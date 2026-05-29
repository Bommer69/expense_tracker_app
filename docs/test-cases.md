# Danh sách Test Cases — Expense Tracker

> Tổng hợp tất cả test cases backend.  
> Framework: **Jest** + **Supertest**  
> Database: **mongodb-memory-server** (test DB riêng, không ảnh hưởng production)  
> Thư mục: `backend/tests/`

---

## 📋 Tổng quan

| Module | Số TC | File |
|---|---|---|
| Auth (Xác thực) | 14 | `tests/auth.test.js` |
| Transaction (Giao dịch) | 15 | `tests/transaction.test.js` |
| Category (Danh mục) | 10 | `tests/category.test.js` |
| Budget (Ngân sách) | 11 | `tests/budget.test.js` |
| AI (Trí tuệ nhân tạo) | 16 | `tests/aiClassifier.test.js` |
| **Tổng** | **66** | |

---

## 1. Auth — Xác thực (`auth.test.js`)

### POST /api/auth/register

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AUTH-01** | Đăng ký hợp lệ — trả về token + user info | `{ email, password, name }` | `200`, có `token`, `user.id`, `user.name`, `user.email` |
| **TC-AUTH-02** | Seed 10 danh mục mặc định + 2 tài khoản mặc định | (sau register) | Categories ≥ 10, Accounts ≥ 2 |
| **TC-AUTH-03** | Thiếu trường name — 400 | `{ email, password }` | `400`, có `error` |
| **TC-AUTH-04** | Password quá ngắn (< 6 ký tự) — 400 | `password: '123'` | `400`, error match `/ít nhất 6/i` |
| **TC-AUTH-05** | Email không đúng định dạng — 400 | `email: 'not-an-email'` | `400`, error match `/email/i` |
| **TC-AUTH-06** | Email đã tồn tại — 400 | register 2 lần cùng email | `400`, error match `/đã được sử dụng/i` |
| **TC-AUTH-07** | Email không phân biệt hoa/thường — coi là trùng | `'VINH@EXAMPLE.COM'` sau `'vinh@example.com'` | `400` |

### POST /api/auth/login

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AUTH-08** | Đăng nhập đúng — trả về JWT | `{ email, password }` | `200`, token có 3 phần (JWT) |
| **TC-AUTH-09** | Sai mật khẩu — 401 | `password: 'wrongpass'` | `401`, error match `/không đúng/i` |
| **TC-AUTH-10** | Email không tồn tại — 401 | `email: 'notexist@example.com'` | `401` |
| **TC-AUTH-11** | Thiếu password — 400 | `{ email }` | `400` |

### GET /api/auth/me

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AUTH-12** | Token hợp lệ — trả về thông tin user | Bearer token | `200`, `{ email, name }`, không có `passwordHash` |
| **TC-AUTH-13** | Không có token — 401 | (no header) | `401` |
| **TC-AUTH-14** | Token sai định dạng — 401 | `Bearer invalid.token.here` | `401` |

---

## 2. Transaction — Giao dịch (`transaction.test.js`)

### POST /api/transactions

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-TX-01** | Tạo giao dịch chi hợp lệ | `{ amount, description, type: 'expense', categoryId, date }` | `200`, object đầy đủ |
| **TC-TX-02** | Tạo giao dịch thu hợp lệ | `{ amount, description, type: 'income', categoryId, date }` | `200`, `type === 'income'` |
| **TC-TX-03** | Không có categoryId — AI tự phân loại | `{ amount, description, type: 'expense', date }` | `200`, có `aiCategory` |
| **TC-TX-04** | Thiếu amount — lỗi validation | (không amount) | `400` |
| **TC-TX-05** | Không có token — 401 | (no auth header) | `401` |

### GET /api/transactions

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-TX-06** | Lấy tất cả giao dịch — trả về array | (7 transactions) | `200`, array length = 7 |
| **TC-TX-07** | Lọc theo type=expense | `?type=expense` | `200`, all type === 'expense', length = 5 |
| **TC-TX-08** | Lọc theo type=income | `?type=income` | `200`, length = 2 |
| **TC-TX-09** | Giới hạn kết quả bằng limit | `?limit=3` | `200`, length = 3 |
| **TC-TX-10** | Không thấy giao dịch của user khác | user khác tạo tx | Không chứa tx của user khác |

### PUT /api/transactions/:id

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-TX-11** | Cập nhật amount + description | `{ amount, description }` | `200`, amount + description thay đổi |
| **TC-TX-12** | Sửa giao dịch của user khác — 404 | otherUser sửa | `404` |

### DELETE /api/transactions/:id

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-TX-13** | Xóa giao dịch thành công | `DELETE /:id` | `200`, `{ success: true }`, không còn trong list |
| **TC-TX-14** | Xóa giao dịch của user khác — 404 | otherUser xóa | `404` |

### GET /api/transactions/summary

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-TX-15** | Summary tổng hợp thu/chi đúng trong tháng | `?month=YYYY-MM` | `200`, totalExpense = 300000, totalIncome = 5000000 |

---

## 3. Category — Danh mục (`category.test.js`)

### GET /api/categories

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-CAT-01** | Lấy danh sách sau đăng ký — có sẵn default | - | `200`, array ≥ 10 items |
| **TC-CAT-02** | Mỗi danh mục có đủ name, icon, color, type | - | `{ name, icon, color, type }` |
| **TC-CAT-03** | Không thấy danh mục của user khác | otherUser | Không lẫn category |

### POST /api/categories

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-CAT-04** | Tạo danh mục chi tùy chỉnh | `{ name, icon, color, type: 'expense' }` | `200`, match object |
| **TC-CAT-05** | Tạo danh mục thu tùy chỉnh | `{ name, icon, color, type: 'income' }` | `200`, `type === 'income'` |
| **TC-CAT-06** | Thiếu name — lỗi validation | (không name) | `400` |
| **TC-CAT-07** | type không hợp lệ — lỗi validation | `type: 'invalid-type'` | `400` |

### PUT /api/categories/:id

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-CAT-08** | Cập nhật tên + icon danh mục | `{ name, icon }` | `200`, name + icon thay đổi |
| **TC-CAT-09** | Cập nhật danh mục của user khác — 404 | otherUser | `404` |

### DELETE /api/categories/:id

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-CAT-10** | Xóa danh mục tùy chỉnh thành công | (category custom) | `200`, `{ success: true }` |

---

## 4. Budget — Ngân sách (`budget.test.js`)

### POST /api/budgets

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-BUD-01** | Tạo ngân sách mới hợp lệ | `{ categoryId, amount, month }` | `200`, `{ amount, month, _id }` |
| **TC-BUD-02** | Upsert — POST cùng categoryId + month → cập nhật thay vì tạo mới | POST 2 lần | 1 record, amount = giá trị mới |
| **TC-BUD-03** | Thiếu token — 401 | (no auth) | `401` |

### GET /api/budgets

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-BUD-04** | Lấy danh sách có spent tính từ transactions | tạo budget + 2 tx | budget.spent = 500000 |
| **TC-BUD-05** | Không thấy ngân sách của user khác | otherUser | `200`, array rỗng |

### PUT /api/budgets/:id

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-BUD-06** | Cập nhật amount ngân sách | `{ amount }` | `200`, amount thay đổi |
| **TC-BUD-07** | Cập nhật ngân sách của user khác — 404 | otherUser | `404` |

### DELETE /api/budgets/:id

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-BUD-08** | Xóa ngân sách thành công | `DELETE /:id` | `200`, `{ success: true }` |

### GET /api/budgets/alerts

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-BUD-09** | Không cảnh báo khi chi < 80% | chi 500k/1tr (50%) | `200`, alerts rỗng |
| **TC-BUD-10** | Cảnh báo warning khi chi 80–100% | chi 850k/1tr (85%) | `200`, status = 'warning', percent = 85 |
| **TC-BUD-11** | Cảnh báo exceeded khi chi > 100% | chi 1.2tr/1tr (120%) | `200`, status = 'exceeded', percent > 100 |

---

## 5. AI — Trí tuệ nhân tạo (`aiClassifier.test.js`)

### fallbackClassify — Keyword matching

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AI-01** | "ăn phở buổi sáng" → Ăn uống | `classifyTransaction('ăn phở buổi sáng', 50000)` | category = 'Ăn uống' |
| **TC-AI-02** | "grab đi làm" → Đi lại | `classifyTransaction('grab đi làm', 25000)` | category = 'Đi lại' |
| **TC-AI-03** | "mua sách lập trình" → Giáo dục | `classifyTransaction('mua sách lập trình', 200000)` | category ∈ ['Giáo dục', 'Mua sắm'] |
| **TC-AI-04** | "nhận lương tháng 5" → Lương | `classifyTransaction('nhận lương tháng 5', 15000000)` | category = 'Lương' |
| **TC-AI-05** | Mô tả không rõ ràng → Khác | `classifyTransaction('abc xyz 999', 10000)` | category = 'Khác', confidence ≤ 0.5 |
| **TC-AI-06** | "grab đi làm" → Đi lại (lặp lại) | `classifyTransaction('grab đi làm', 25000)` | category = 'Đi lại' |
| **TC-AI-07** | "đóng tiền điện nước" → Bills | `classifyTransaction('đóng tiền điện nước', 300000)` | category = 'Bills' |

### POST /api/ai/chat

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AI-08** | Chat với token hợp lệ — trả về answer | `{ message }` | `200`, có `answer` |
| **TC-AI-09** | Thiếu message — 400 | `{}` | `400`, có `error` |
| **TC-AI-10** | Message rỗng (chỉ khoảng trắng) — 400 | `{ message: '   ' }` | `400` |
| **TC-AI-11** | Không có token — 401 | (no auth) | `401` |

### GET /api/ai/stats

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AI-12** | Stats trả về đủ field | - | `200`, có `totalIncome`, `totalExpense`, `transactionCount` |
| **TC-AI-13** | User không có giao dịch — trả về 0 | (no tx) | `200`, cả 3 field = 0 |

### GET /api/ai/chat/history

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AI-14** | Lịch sử trống khi chưa chat | - | `200`, `messages` là array |
| **TC-AI-15** | Sau khi chat, lịch sử lưu đúng | insert message thẳng DB | `200`, messages chứa text 'Xin chào AI' |

### DELETE /api/ai/chat/history

| ID | Mô tả | Input | Expected |
|---|---|---|---|
| **TC-AI-16** | Xóa lịch sử chat thành công | insert history → DELETE | `200`, `{ success: true }`, history empty |

---

## 6. Test Helpers

### `helpers/db.js` — Quản lý kết nối MongoDB

| Function | Mô tả |
|---|---|
| `connect()` | Kết nối đến mongodb-memory-server (dùng URI từ file tạm hoặc env) |
| `clearAll()` | Xoá tất cả documents trong tất cả collections |
| `disconnect()` | Ngắt kết nối MongoDB |

### `helpers/app.js` — Express app test

- Mirror `index.js` nhưng **không** helmet/cors/rateLimit (test nhanh hơn)
- **Không** kết nối MongoDB (db.js quản lý riêng)
- Routes giống production

### `helpers/factory.js` — Factory functions

| Function | Mô tả |
|---|---|
| `createUser(overrides)` | Đăng ký user → trả về `{ token, userId, email }` |
| `getCategories(token)` | Lấy danh sách categories (seed mặc định) |
| `getAccounts(token)` | Lấy danh sách accounts (seed mặc định) |
| `createTransaction(token, overrides)` | Tạo giao dịch mẫu → trả về transaction object |

### Setup/Teardown global

| File | Mô tả |
|---|---|
| `helpers/globalSetup.js` | Khởi tạo mongodb-memory-server trước khi chạy test |
| `helpers/globalTeardown.js` | Dọn dẹp mongodb-memory-server sau khi test |

---

## 7. Chạy test

```bash
cd backend
npm test                    # Chạy tất cả test
npm run test:watch          # Watch mode
npm run test:coverage       # Báo cáo coverage
```

---

*Tổng hợp test cases — Cập nhật lần cuối: 2026-05-29*
