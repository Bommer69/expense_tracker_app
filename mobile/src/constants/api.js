import { Platform } from 'react-native';
import Constants from 'expo-constants';

// API configuration:
// 1) Prefer EXPO_PUBLIC_API_URL if provided.
// 2) In Expo dev, derive host from Metro address (works when LAN IP changes).
// 3) Fallback to platform-friendly localhost defaults.
const resolveApiUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    null;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api';
  }

  return 'http://localhost:3000/api';
};

export const API_URL = resolveApiUrl();

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