// API Configuration
// Change this to your server URL in production
export const API_URL = 'http://localhost:3000/api';

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