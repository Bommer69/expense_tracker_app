# LangChain AI Chat Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate LangChain conversation memory into the AI chat so the assistant remembers context across messages within a session.

**Architecture:** Add `@langchain/google-genai` + `@langchain/core` to the backend. Replace the raw Gemini SDK call in `aiClassifier.js` with a `ChatGoogleGenerativeAI` chain that maintains a per-user `HumanMessage`/`AIMessage` history in a server-side `Map`. The `chatWithAI` signature gains a `userId` parameter. A new `DELETE /api/ai/chat/history` endpoint lets the frontend clear the memory. The mobile AI Chat screen gains a trash-icon button in its header to trigger that endpoint.

**Tech Stack:** Node.js/Express, `@langchain/google-genai`, `@langchain/core`, React Native (Expo 52), existing `@google/generative-ai` kept for `classifyTransaction` and `getSpendingAdvice`.

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `backend/package.json` | Modify | Add `@langchain/google-genai` and `@langchain/core` |
| `backend/src/services/aiClassifier.js` | Modify | Replace `chatWithAI` with LangChain chain; add `clearUserMemory` |
| `backend/src/controllers/aiController.js` | Modify | Pass `userId` to `chatWithAI`; add `clearHistory` controller function |
| `backend/src/routes/ai.js` | Modify | Add `DELETE /chat/history` route |
| `mobile/src/services/api.js` | Modify | Add `clearHistory` method to `aiAPI` |
| `mobile/app/(tabs)/ai-chat.js` | Modify | Add clear-history button in header; call API on press |

---

## Task 1: Install backend dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install packages**

```bash
cd backend
npm install @langchain/google-genai @langchain/core
```

Expected: `package.json` now lists `@langchain/google-genai` and `@langchain/core` in dependencies with resolved version numbers. `node_modules/@langchain/google-genai` exists.

- [ ] **Step 2: Verify install**

```bash
cd backend
node -e "require('@langchain/google-genai'); require('@langchain/core/messages'); console.log('ok')"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add @langchain/google-genai and @langchain/core"
```

---

## Task 2: Rewrite chatWithAI with LangChain conversation memory

**Files:**
- Modify: `backend/src/services/aiClassifier.js`

The current file uses raw `@google/generative-ai` SDK for `chatWithAI`, `classifyTransaction`, and `getSpendingAdvice`. We keep the raw SDK for classification and advice (they are stateless). We replace only `chatWithAI` with a LangChain chain that maintains per-user history.

- [ ] **Step 1: Replace chatWithAI and add clearUserMemory**

Open `backend/src/services/aiClassifier.js`. Replace the entire file with:

```js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');

// --- Raw Gemini model (for classify + advice) ---
let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'your-gemini-api-key-here') return null;
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
}

// --- LangChain chat model + per-user history ---
let chatModel = null;

function getChatModel() {
  if (!chatModel) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'your-gemini-api-key-here') return null;
    chatModel = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey,
      maxOutputTokens: 512,
    });
  }
  return chatModel;
}

// userId → HumanMessage|AIMessage[]
const userHistories = new Map();

const MAX_HISTORY = 20; // 10 exchanges

function getHistory(userId) {
  if (!userHistories.has(userId)) userHistories.set(userId, []);
  return userHistories.get(userId);
}

function clearUserMemory(userId) {
  userHistories.delete(userId);
}

/**
 * Chat with AI about expenses — maintains conversation history per user
 */
async function chatWithAI(message, context, userId) {
  const llm = getChatModel();
  if (!llm) throw new Error('GEMINI_API_KEY chưa được cấu hình');

  const systemText = `Bạn là "Trợ lý Chi tiêu Thông minh" - một AI chuyên về quản lý tài chính cá nhân.
Hãy trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa 150 từ).
Sử dụng emoji phù hợp để câu trả lời sinh động hơn.

DỮ LIỆU CHI TIÊU CỦA NGƯỜI DÙNG:
${context}

Lưu ý:
- Nếu hỏi về chi tiêu, hãy phân tích dựa trên dữ liệu thực
- Đưa ra lời khuyên cụ thể, thiết thực
- Nếu không đủ dữ liệu, hãy nói rõ và gợi ý thêm giao dịch
- Đơn vị tiền tệ là VND`;

  const history = getHistory(userId);

  const messages = [
    new SystemMessage(systemText),
    ...history,
    new HumanMessage(message),
  ];

  const response = await llm.invoke(messages);
  const replyText = response.content;

  // Append to history and trim
  history.push(new HumanMessage(message));
  history.push(new AIMessage(replyText));
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }

  return replyText;
}

/**
 * Get AI spending advice (stateless — no history needed)
 */
async function getSpendingAdvice(context) {
  const gemini = getModel();
  if (!gemini) return 'Hãy cấu hình GEMINI_API_KEY để nhận lời khuyên từ AI! 🤖';

  const prompt = `Dựa vào dữ liệu chi tiêu sau, đưa ra 3 lời khuyên ngắn gọn (mỗi lời dưới 30 từ) để tiết kiệm chi tiêu hiệu quả hơn. Dùng emoji.

${context}

Trả lời dưới dạng danh sách 3 mục, mỗi mục một dòng.`;

  const result = await gemini.generateContent(prompt);
  return result.response.text();
}

/**
 * Classify transaction using AI (stateless)
 */
async function classifyTransaction(description, amount) {
  const gemini = getModel();
  if (!gemini) return fallbackClassify(description, amount);

  try {
    const prompt = `Phân loại giao dịch tài chính sau vào đúng 1 danh mục.

Danh mục cho phép: Ăn uống, Đi lại, Mua sắm, Bills, Giải trí, Sức khỏe, Giáo dục, Nhà ở, Lương, Thưởng, Đầu tư, Khoản thu khác, Khác

Mô tả: "${description}"
Số tiền: ${amount} VND

Trả lời CHỈ JSON, không có text khác:
{"category": "tên danh mục", "confidence": 0.0-1.0}`;

    const result = await gemini.generateContent(prompt);
    const content = result.response.text();
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return fallbackClassify(description, amount);
  } catch (err) {
    console.log('AI classification failed:', err.message);
    return fallbackClassify(description, amount);
  }
}

function fallbackClassify(description, amount) {
  const desc = (description || '').toLowerCase();
  const keywords = {
    'Ăn uống': ['ăn', 'uống', 'cafe', 'cà phê', 'cơm', 'bún', 'phở', 'đồ ăn', 'food', 'drink', 'trà', 'bia', 'nhà hàng', 'quán'],
    'Đi lại': ['grab', 'bike', 'xe', 'taxi', 'bus', 'buýt', 'tàu', 'metro', 'xăng', 'đi lại', 'transport', 'gojek', 'be'],
    'Mua sắm': ['mua', 'shop', 'amazon', 'shopee', 'lazada', 'tiki', 'đồ', 'quần', 'áo', 'giày'],
    'Bills': ['điện', 'nước', 'internet', 'wifi', 'phone', 'điện thoại', 'bill', 'tiền nhà', 'thuê'],
    'Giải trí': ['game', 'phim', 'netflix', 'spotify', 'youtube', 'giải trí', 'entertainment', 'karaoke'],
    'Sức khỏe': ['bệnh', 'thuốc', 'hospital', 'clinic', 'y tế', 'khám', 'sức khỏe', 'gym', 'tập'],
    'Giáo dục': ['học', 'sách', 'khóa', 'course', 'school', 'trường', 'giáo dục'],
    'Lương': ['lương', 'salary', 'payroll'],
    'Thưởng': ['thưởng', 'bonus', 'award'],
  };
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(w => desc.includes(w))) return { category, confidence: 0.7 };
  }
  return { category: 'Khác', confidence: 0.5 };
}

module.exports = { chatWithAI, classifyTransaction, getSpendingAdvice, clearUserMemory };
```

- [ ] **Step 2: Verify module loads**

```bash
cd backend
node -e "const s = require('./src/services/aiClassifier'); console.log(Object.keys(s))"
```

Expected output: `[ 'chatWithAI', 'classifyTransaction', 'getSpendingAdvice', 'clearUserMemory' ]`

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/aiClassifier.js
git commit -m "feat: replace chatWithAI with LangChain chain + per-user history"
```

---

## Task 3: Update aiController — pass userId and add clearHistory

**Files:**
- Modify: `backend/src/controllers/aiController.js`

The `chat` function currently calls `chatWithAI(message, context.text)` — it needs a third `userId` argument. We also add a new `clearHistory` controller function.

- [ ] **Step 1: Update import and chat function**

In `backend/src/controllers/aiController.js`, change line 8:

```js
// BEFORE
const { chatWithAI, getSpendingAdvice } = require('../services/aiClassifier');
// AFTER
const { chatWithAI, getSpendingAdvice, clearUserMemory } = require('../services/aiClassifier');
```

In the `chat` function, change the `chatWithAI` call on line 90:

```js
// BEFORE
answer = await chatWithAI(message, context.text);
// AFTER
answer = await chatWithAI(message, context.text, userId);
```

- [ ] **Step 2: Add clearHistory function**

At the end of `backend/src/controllers/aiController.js`, before `module.exports`, add:

```js
async function clearHistory(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    clearUserMemory(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 3: Export clearHistory**

Change `module.exports` at the bottom of the file:

```js
// BEFORE
module.exports = { chat, getStats, advice };
// AFTER
module.exports = { chat, getStats, advice, clearHistory };
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/aiController.js
git commit -m "feat: pass userId to chatWithAI, add clearHistory controller"
```

---

## Task 4: Add DELETE /chat/history route in backend

**Files:**
- Modify: `backend/src/routes/ai.js`

- [ ] **Step 1: Add the route**

Replace the entire content of `backend/src/routes/ai.js`:

```js
const express = require('express');
const { chat, getStats, advice, clearHistory } = require('../controllers/aiController');

const router = express.Router();

router.post('/chat', chat);
router.get('/stats', getStats);
router.get('/advice', advice);
router.delete('/chat/history', clearHistory);

module.exports = router;
```

- [ ] **Step 2: Verify backend starts**

```bash
cd backend && npm run dev
```

Expected: `✅ Connected to MongoDB` and `🚀 Server running on 0.0.0.0:3000` — no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/ai.js
git commit -m "feat: add DELETE /api/ai/chat/history route"
```

---

## Task 5: Add clearHistory to mobile API service

**Files:**
- Modify: `mobile/src/services/api.js`

- [ ] **Step 1: Add clearHistory to aiAPI**

In `mobile/src/services/api.js`, find the `aiAPI` object (lines 82–86) and add `clearHistory`:

```js
// BEFORE
export const aiAPI = {
  getStats: () => api.get('/ai/stats'),
  chat: (message) => api.post('/ai/chat', { message }),
  getAdvice: () => api.get('/ai/advice'),
};
// AFTER
export const aiAPI = {
  getStats: () => api.get('/ai/stats'),
  chat: (message) => api.post('/ai/chat', { message }),
  getAdvice: () => api.get('/ai/advice'),
  clearHistory: () => api.delete('/ai/chat/history'),
};
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/services/api.js
git commit -m "feat: add clearHistory to aiAPI"
```

---

## Task 6: Add clear-history button in AI Chat screen

**Files:**
- Modify: `mobile/app/(tabs)/ai-chat.js`

- [ ] **Step 1: Add clearChat function and state**

In `mobile/app/(tabs)/ai-chat.js`, inside `AIChatScreen`, after the `flatListRef` declaration (line 28), add:

```js
const [clearing, setClearing] = useState(false);

const clearChat = async () => {
  if (clearing) return;
  setClearing(true);
  try {
    await aiAPI.clearHistory();
  } catch {
    // Best-effort — clear local messages regardless of API result
  } finally {
    setClearing(false);
  }
  setMessages([{
    id: 'welcome',
    role: 'ai',
    text: 'Xin chào! Tôi là trợ lý AI quản lý chi tiêu của bạn.\n\nHãy hỏi tôi bất cứ điều gì về tài chính cá nhân.',
    time: new Date(),
  }]);
};
```

- [ ] **Step 2: Add trash button to header**

Find the header `TouchableOpacity` (the `book-outline` info button area, around line 114). Add a trash button next to the existing info button:

```js
// BEFORE
<View style={styles.headerTop}>
  <View>
    <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Trợ lý AI</Text>
    <Text style={[styles.headerTitle, { color: theme.text }]}>Chatbot</Text>
  </View>
  <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
    <Ionicons name="book-outline" size={24} color="#6B7194" />
  </TouchableOpacity>
</View>
// AFTER
<View style={styles.headerTop}>
  <View>
    <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Trợ lý AI</Text>
    <Text style={[styles.headerTitle, { color: theme.text }]}>Chatbot</Text>
  </View>
  <View style={styles.headerActions}>
    <TouchableOpacity onPress={clearChat} style={styles.infoBtn} disabled={clearing}>
      <Ionicons name="trash-outline" size={22} color={clearing ? theme.textSecondary : theme.error} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setGuideVisible(true)} style={styles.infoBtn}>
      <Ionicons name="book-outline" size={24} color="#6B7194" />
    </TouchableOpacity>
  </View>
</View>
```

- [ ] **Step 3: Add headerActions style**

In `StyleSheet.create({...})` at the bottom of the file, add:

```js
headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
```

- [ ] **Step 4: Commit**

```bash
git add mobile/app/(tabs)/ai-chat.js
git commit -m "feat: add clear chat history button in AI Chat header"
```

---

## Checklist tự review

- [x] `chatWithAI` signature: `(message, context, userId)` — all call sites updated
- [x] `clearUserMemory` exported from aiClassifier and imported in controller
- [x] `clearHistory` controller exported and wired to `DELETE /api/ai/chat/history`
- [x] `aiAPI.clearHistory()` added on frontend
- [x] `clearChat` clears both backend memory and local message list
- [x] System message includes fresh `context` on every call (spending data stays current)
- [x] History capped at `MAX_HISTORY = 20` messages to avoid unbounded memory growth
- [x] Raw Gemini model (`getModel`) kept for `classifyTransaction` and `getSpendingAdvice`
- [x] `getChatModel()` lazy-initialises LangChain model (same pattern as existing `getModel`)
