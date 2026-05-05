import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'authToken',
  USER: 'userData',
};

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const [tokenStr, userStr] = await AsyncStorage.multiGet([
        AUTH_STORAGE_KEYS.TOKEN,
        AUTH_STORAGE_KEYS.USER,
      ]);
      
      setToken(tokenStr[1]);
      setUser(userStr[1] ? JSON.parse(userStr[1]) : null);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (token, userData) => {
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token);
    await AsyncStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([AUTH_STORAGE_KEYS.TOKEN, AUTH_STORAGE_KEYS.USER]);
    setToken(null);
    setUser(null);
  };

  return {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    checkAuth,
    login,
    logout,
  };
};

export default useAuth;