# 🚀 Hướng dẫn chạy dự án Expense Tracker

## 📋 Mục lục

- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [1. Chạy Backend](#1-chạy-backend)
- [2. Chạy Mobile App](#2-chạy-mobile-app)
- [3. Chuyển đổi Local / Production](#3-chuyển-đổi-local--production)
- [4. Build Android APK](#4-build-android-apk)
- [Troubleshooting](#-troubleshooting)

---

## 💻 Yêu cầu hệ thống

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| **Node.js** | ≥ 18 | Kiểm tra: `node -v` |
| **npm** | ≥ 9 | Kiểm tra: `npm -v` |
| **MongoDB** | ≥ 6 | Chạy local hoặc dùng MongoDB Atlas |
| **Expo CLI** | mới nhất | Cài: `npm i -g expo-cli` |
| **Android Studio** (tuỳ chọn) | mới nhất | Chỉ cần nếu build APK |

---

## 📁 Cấu trúc dự án

```
expense-tracker/
│
├── backend/                    # Server Node.js + Express
│   ├── src/
│   │   ├── controllers/        # Xử lý logic API
│   │   ├── models/             # Schema Mongoose (User, Transaction, Budget...)
│   │   ├── routes/             # Định nghĩa endpoint
│   │   ├── services/           # AI Gemini, triggers...
│   │   └── utils/              # Helper functions
│   ├── uploads/                # (Không dùng nữa — avatar lưu base64 trong DB)
│   ├── .env                    # Cấu hình backend
│   └── package.json
│
├── mobile/                     # React Native App (Expo Router)
│   ├── app/
│   │   ├── (auth)/             # Màn hình: Login, Register
│   │   └── (tabs)/             # Tab chính: Home, Transactions, Budget...
│   ├── src/
│   │   ├── api/                # Gọi REST API backend
│   │   ├── components/         # UI components dùng chung
│   │   ├── context/            # React Context (Auth, Theme, Notification)
│   │   ├── hooks/              # Custom hooks (useBudgets, useTransactions...)
│   │   ├── services/           # Push notification service
│   │   ├── styles/             # Style sheets
│   │   └── utils/              # Formatters, error handler...
│   └── .env                    # API URL (chọn local hoặc production)
│
├── scripts/                    # Scripts phụ trợ
│   └── generate_icon.py        # Tạo app icon
│
└── .gitignore
```

---

## 1. Chạy Backend

### Bước 1: Cài đặt dependencies

```bash
cd backend
npm install
```

### Bước 2: Tạo file `.env`

Tạo file `backend/.env` với nội dung:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_google_gemini_api_key_here
```

> **MONGODB_URI**: Nếu dùng MongoDB local, để như trên. Nếu dùng MongoDB Atlas, lấy connection string từ Atlas Dashboard.
>
> **GEMINI_API_KEY**: Lấy từ [Google AI Studio](https://aistudio.google.com/) (miễn phí). Để trống nếu không dùng AI Chat.

### Bước 3: Khởi động server

```bash
npm start
```

Server sẽ chạy tại **http://localhost:3000**. Kiểm tra:

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", "timestamp": "..." }
```

> **Lưu ý**: Lần đầu chạy, backend sẽ tự tạo database và collection khi có request đầu tiên.

---

## 2. Chạy Mobile App

### Bước 1: Cài đặt dependencies

```bash
cd mobile
npm install
```

### Bước 2: Chọn môi trường backend

Xem mục [3. Chuyển đổi Local / Production](#3-chuyển-đổi-local--production) bên dưới.

### Bước 3: Khởi động Expo

```bash
npx expo start
```

Sau đó:

| Nền tảng | Cách chạy |
|---|---|
| **Điện thoại thật** | Mở app **Expo Go** → Quét QR code |
| **Web** | Ấn `w` trong terminal |
| **Android emulator** | Ấn `a` trong terminal |
| **iOS simulator** (macOS) | Ấn `i` trong terminal |

---

## 3. Chuyển đổi Local / Production

App có 2 chế độ backend:

| Chế độ | API URL | Khi nào dùng |
|---|---|---|
| **Local** | `http://localhost:3000/api` | Phát triển, test |
| **Production** | `https://expense-tracker-app-ee14.onrender.com/api` | Dùng thật, deploy |

### Cấu trúc file

```
mobile/.env              ← File thật sự được Expo đọc (hiện tại)
mobile/.env.local        ← Mẫu cho localhost
mobile/.env.production   ← Mẫu cho Render
mobile/.env.example      ← Hướng dẫn
mobile/switch-env.bat    ← Script chuyển nhanh (Windows)
mobile/switch-env.sh     ← Script chuyển nhanh (Git Bash)
```

### Cách chuyển

#### Cách 1 — npm scripts (khuyên dùng)

```bash
cd mobile

# Chuyển sang local backend
npm run switch:local

# Chuyển sang production (Render)
npm run switch:prod

# Gộp luôn — chuyển + chạy Expo
npm run start:local
npm run start:prod
```

#### Cách 2 — Batch file (Windows CMD)

```bash
cd mobile
switch-env local          # Chuyển sang local
switch-env prod           # Chuyển sang production
```

#### Cách 3 — Shell script (Git Bash)

```bash
cd mobile
bash switch-env.sh local
bash switch-env.sh prod
```

#### Cách 4 — Thủ công

Mở file `mobile/.env`, sửa dòng:

```
# Local:
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# Production:
EXPO_PUBLIC_API_URL=https://expense-tracker-app-ee14.onrender.com/api
```

---

## 4. Build Android APK

### Yêu cầu

- Android Studio (cài đặt Android SDK)
- File `mobile/android/local.properties` (đã tạo sẵn)

### Build debug APK

```bash
cd mobile/android
./gradlew assembleDebug
```

File APK ở: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### Build production (EAS Build)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

> Cần cấu hình `eas.json` và tài khoản Expo để dùng EAS Build.

---

## 🐛 Troubleshooting

### ❌ Backend không chạy

```
Error: listen EADDRINUSE :::3000
```

→ Cổng 3000 đang bận. Kiểm tra và tắt tiến trình cũ:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS / Linux
lsof -i :3000
kill -9 <PID>
```

### ❌ Không kết nối được MongoDB

```
MongooseServerSelectionError: connect ECONNREFUSED ::1:27017
```

→ Kiểm tra MongoDB đã chạy chưa:

```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### ❌ App không gọi được API local trên điện thoại

Nếu chạy Expo Go trên điện thoại thật mà backend ở localhost:

1. Đảm bảo điện thoại và máy tính cùng **một mạng WiFi**
2. Tìm IP máy tính: `ipconfig` (Windows) / `ifconfig` (macOS/Linux)
3. Sửa `mobile/.env.local`:

```
EXPO_PUBLIC_API_URL=http://<IP_MÁY_TÍNH>:3000/api
```

Ví dụ: `http://192.168.1.5:3000/api`

4. Chạy lại: `npm run switch:local` + `npx expo start`

### ❌ Build Android lỗi SDK

```
SDK location not found.
```

→ Kiểm tra file `mobile/android/local.properties` có nội dung:

```
sdk.dir=C:\\Users\\<TÊN_USER>\\AppData\\Local\\Android\\Sdk
```

Hoặc set biến môi trường `ANDROID_HOME`.

---

## 📬 Liên hệ

Mọi thắc mắc hoặc đóng góp, vui lòng tạo issue trên GitHub.
