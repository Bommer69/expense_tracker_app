import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API configuration:
// 1) From app.json extra (most reliable in Expo builds)
// 2) From EXPO_PUBLIC_API_URL env variable (Metro bundler)
// 3) In Expo dev, derive host from Metro address (works when LAN IP changes)
// 4) Fallback to platform-friendly defaults
const resolveApiUrl = () => {
  // Ưu tiên 1: Config từ app.json (extra) — đáng tin cậy nhất
  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraApiUrl) {
    return extraApiUrl;
  }

  // Ưu tiên 2: Environment variable (EXPO_PUBLIC_)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // Ưu tiên 3: Metro bundler host (dev mode, cùng WiFi)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    null;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000/api`;
  }

  // Ưu tiên 4: Platform-specific localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  // Mặc định: production (Render)
  return 'https://expense-tracker-app-ee14.onrender.com/api';
};

export const API_URL = resolveApiUrl();
console.log('API_URL resolved to:', API_URL); // Tạm thời để debug

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  
  // Transactions
  TRANSACTIONS: '/transactions',
  TRANSACTION_SUMMARY: '/transactions/summary',
  
  // Budget
  BUDGETS: '/budgets',
  
  // Categories
  CATEGORIES: '/categories',
  
  // AI
  AI_STATS: '/ai/stats',
  AI_CHAT: '/ai/chat',
};