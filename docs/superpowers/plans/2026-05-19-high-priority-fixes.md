# High Priority Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 high-priority issues: swipe-to-edit transactions, wrong AI model name, and insecure backend (CORS/rate-limit/helmet).

**Architecture:** Independent fixes across mobile frontend and Node.js backend. The swipe-to-edit feature reuses the existing add-transaction modal form and the already-existing `PUT /transactions/:id` backend endpoint. Backend security hardening adds middleware layers in `index.js`.

**Tech Stack:** React Native (Expo 52), expo-router, react-native-gesture-handler, Node.js/Express, helmet, express-rate-limit, Google Gemini API.

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `mobile/src/hooks/useTransactions.js` | Modify | Add `updateTransaction` method |
| `mobile/app/(tabs)/transactions.js` | Modify | Add swipe UI, edit state, edit modal |
| `backend/src/services/aiClassifier.js` | Modify | Fix model name `gemini-flash-latest` → `gemini-2.0-flash` |
| `backend/src/index.js` | Modify | Add helmet, rate limit, fix CORS |
| `backend/package.json` | Modify | Add helmet, express-rate-limit dependencies |

---

## Task 1: Install dependencies

**Files:**
- Modify: `mobile/package.json` (via expo install)
- Modify: `backend/package.json` (via npm install)

- [ ] **Step 1: Install react-native-gesture-handler vào mobile**

```bash
cd mobile
npx expo install react-native-gesture-handler
```

Expected: package added to `mobile/package.json` dependencies.

- [ ] **Step 2: Install helmet và express-rate-limit vào backend**

```bash
cd backend
npm install helmet express-rate-limit
```

Expected: 2 packages added to `backend/package.json` dependencies.

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json backend/package.json backend/package-lock.json
git commit -m "chore: add react-native-gesture-handler, helmet, express-rate-limit"
```

---

## Task 2: Fix AI model name

**Files:**
- Modify: `backend/src/services/aiClassifier.js:17`

- [ ] **Step 1: Đổi model name**

Trong `backend/src/services/aiClassifier.js`, dòng 17, đổi:
```js
// TRƯỚC
model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
// SAU
model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
```

- [ ] **Step 2: Kiểm tra thủ công**

Khởi động backend (`npm run dev` trong thư mục `backend`), gửi message trong AI Chat tab. Nếu có GEMINI_API_KEY hợp lệ, AI phải trả lời thay vì báo lỗi model không tồn tại.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/aiClassifier.js
git commit -m "fix: correct Gemini model name to gemini-2.0-flash"
```

---

## Task 3: Hardening backend security

**Files:**
- Modify: `backend/src/index.js`

- [ ] **Step 1: Thêm helmet, rate-limit, và fix CORS**

Thay toàn bộ phần đầu `backend/src/index.js` (từ dòng 1 đến dòng 19) thành:

```js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const aiRoutes = require('./routes/ai');
const accountRoutes = require('./routes/accounts');
const savingsGoalRoutes = require('./routes/savingsGoals');
const recurringTransactionRoutes = require('./routes/recurringTransactions');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

// Rate limiting cho auth routes (chống brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);
```

Phần còn lại của file (routes, health check, MongoDB connect) giữ nguyên từ dòng 20 trở đi.

- [ ] **Step 2: Kiểm tra backend khởi động**

```bash
cd backend && npm run dev
```

Expected output: `✅ Connected to MongoDB` và `🚀 Server running on 0.0.0.0:3000` (không có lỗi).

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.js
git commit -m "fix: add helmet, rate limiting on /auth, restrict CORS via env var"
```

---

## Task 4: Thêm updateTransaction vào hook

**Files:**
- Modify: `mobile/src/hooks/useTransactions.js`

- [ ] **Step 1: Thêm method updateTransaction**

Trong `mobile/src/hooks/useTransactions.js`, sau `deleteTransaction` (sau dòng 49), thêm:

```js
const updateTransaction = useCallback(async (id, data) => {
  setLoading(true);
  try {
    const response = await transactionsAPI.update(id, data);
    setTransactions(prev => prev.map(t => t._id === id ? response.data : t));
    return response.data;
  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
}, []);
```

- [ ] **Step 2: Thêm updateTransaction vào return object**

Đổi return statement của `useTransactions` thành:

```js
return {
  transactions,
  loading,
  error,
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useTransactions.js
git commit -m "feat: add updateTransaction to useTransactions hook"
```

---

## Task 5: Swipe-to-edit trong TransactionsScreen

**Files:**
- Modify: `mobile/app/(tabs)/transactions.js`

Đây là task lớn nhất, chia thành nhiều bước nhỏ.

- [ ] **Step 1: Thêm imports**

Tại đầu file, thêm vào import từ `react-native-gesture-handler`:

```js
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
```

Đổi dòng destructure hook useTransactions (dòng 40) để lấy thêm `updateTransaction`:

```js
const { transactions, loading, fetchTransactions, createTransaction, updateTransaction, deleteTransaction } = useTransactions(100);
```

- [ ] **Step 2: Thêm state cho edit**

Trong phần khai báo state (sau dòng `const [submitting, setSubmitting] = useState(false);`), thêm:

```js
const [editingTx, setEditingTx] = useState(null);
```

- [ ] **Step 3: Thêm helper closeModal**

Thêm function `closeModal` ngay trước `handleSubmit`:

```js
const closeModal = () => {
  setModalVisible(false);
  setFormData({ amount: '', description: '', type: 'expense' });
  setSelectedCategory(null);
  setSelectedDate(new Date());
  setEditingTx(null);
};
```

- [ ] **Step 4: Thêm handleEdit**

Thêm function `handleEdit` ngay sau `closeModal`:

```js
const handleEdit = (tx) => {
  setFormData({
    amount: formatNumberInput(String(tx.amount)),
    description: tx.description || '',
    type: tx.type,
  });
  setSelectedCategory(tx.categoryId || null);
  setSelectedDate(new Date(tx.date));
  setEditingTx(tx);
  setPickerMonth(new Date(tx.date));
  setModalVisible(true);
};
```

- [ ] **Step 5: Cập nhật handleSubmit để xử lý cả create và edit**

Thay toàn bộ function `handleSubmit` hiện tại thành:

```js
const handleSubmit = async () => {
  const amount = parseFormattedNumber(formData.amount);
  if (!amount || amount <= 0) { Alert.alert('Lỗi', 'Nhập số tiền hợp lệ'); return; }
  if (!selectedCategory) { Alert.alert('Lỗi', 'Chọn danh mục'); return; }
  setSubmitting(true);
  try {
    const payload = {
      amount,
      description: formData.description,
      type: formData.type,
      categoryId: selectedCategory._id,
      date: selectedDate.toISOString(),
    };
    if (editingTx) {
      await updateTransaction(editingTx._id, payload);
    } else {
      await createTransaction(payload);
    }
    closeModal();
  } catch {
    Alert.alert('Lỗi', editingTx ? 'Không thể cập nhật giao dịch' : 'Không thể tạo giao dịch');
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 6: Thêm renderRightActions**

Thêm function `renderRightActions` ngay trước `renderItem`:

```js
const renderRightActions = (tx) => (
  <View style={s.swipeActions}>
    <TouchableOpacity
      style={[s.swipeBtn, { backgroundColor: theme.primary }]}
      onPress={() => handleEdit(tx)}
    >
      <Ionicons name="pencil-outline" size={18} color="#fff" />
      <Text style={s.swipeBtnText}>Sửa</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[s.swipeBtn, { backgroundColor: theme.error }]}
      onPress={() => handleDelete(tx)}
    >
      <Ionicons name="trash-outline" size={18} color="#fff" />
      <Text style={s.swipeBtnText}>Xóa</Text>
    </TouchableOpacity>
  </View>
);
```

- [ ] **Step 7: Cập nhật renderItem — dùng Swipeable, xóa trash icon**

Thay toàn bộ function `renderItem` thành:

```js
const renderItem = ({ item }) => (
  <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
    <View style={[s.txItem, { borderBottomColor: theme.border + '60', backgroundColor: theme.background }]}>
      <View style={[s.txIcon, { backgroundColor: item.type === 'income' ? theme.success + '12' : theme.error + '12' }]}>
        <Ionicons name={mapIconToIonicons(item.categoryId?.icon) || 'card-outline'} size={18} color={item.type === 'income' ? theme.success : theme.error} />
      </View>
      <View style={s.txMid}>
        <Text style={[s.txDesc, { color: theme.text }]} numberOfLines={1}>{item.description || item.categoryId?.name || 'Giao dịch'}</Text>
        <Text style={[s.txDate, { color: theme.textSecondary }]}>{formatDateShort(item.date)}{item.categoryId?.name ? ` · ${item.categoryId.name}` : ''}</Text>
      </View>
      <Text style={[s.txAmt, { color: item.type === 'income' ? theme.success : theme.error }]}>
        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
      </Text>
    </View>
  </Swipeable>
);
```

- [ ] **Step 8: Bọc FlatList trong GestureHandlerRootView**

Tìm `<View style={[s.container, ...` (dòng đầu tiên trong return), đổi thành `GestureHandlerRootView`:

```js
return (
  <GestureHandlerRootView style={[s.container, { backgroundColor: theme.background }]}>
    {/* ... toàn bộ nội dung hiện tại ... */}
  </GestureHandlerRootView>
);
```

Đổi thẻ đóng cuối cùng `</View>` thành `</GestureHandlerRootView>`.

- [ ] **Step 9: Cập nhật modal title, submit text, và onRequestClose**

Trong Add Transaction Modal:
- Đổi title: `{editingTx ? 'Sửa giao dịch' : 'Thêm giao dịch'}`
- Đổi submit button text: `{submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{editingTx ? 'Cập nhật' : 'Thêm giao dịch'}</Text>}`
- Đổi `onRequestClose={() => setModalVisible(false)}` thành `onRequestClose={closeModal}`
- Đổi nút X `onPress={() => setModalVisible(false)}` thành `onPress={closeModal}`

- [ ] **Step 10: Thêm styles cho swipe actions**

Trong `StyleSheet.create({ ... })` ở cuối file, thêm:

```js
swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
swipeBtn: { width: 72, justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 14 },
swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
```

Xóa các styles không dùng nữa: `txRight` và `deleteBtn` (vì đã thay bằng swipe actions).

- [ ] **Step 11: Kiểm tra thủ công**

1. Chạy app: `cd mobile && npx expo start`
2. Mở tab Giao dịch
3. Swipe trái một transaction → phải hiện 2 nút Sửa (xanh) và Xóa (đỏ)
4. Nhấn Sửa → modal mở với dữ liệu đã điền sẵn
5. Thay đổi số tiền, nhấn Cập nhật → transaction cập nhật trong list
6. Swipe trái → nhấn Xóa → confirm modal → transaction bị xóa

- [ ] **Step 12: Commit**

```bash
git add mobile/app/(tabs)/transactions.js mobile/src/hooks/useTransactions.js
git commit -m "feat: add swipe-to-edit transactions with Swipeable gesture"
```

---

## Checklist tự review

- [x] **Task 2** fix model name `gemini-2.0-flash` — covered
- [x] **Task 3** helmet + rate limit + CORS — covered
- [x] **Task 4** `updateTransaction` method + return value — covered
- [x] **Task 5** swipe UI + edit state + modal reuse + styles — covered
- [x] `closeModal` dùng nhất quán ở cả `onRequestClose`, nút X, và sau submit
- [x] `editingTx` được reset về `null` trong `closeModal`
- [x] `GestureHandlerRootView` bao bọc toàn bộ component tree
- [x] Backend `index.js` giữ nguyên phần routes và MongoDB connect
