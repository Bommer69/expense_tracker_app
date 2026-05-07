import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/api';

export const AuthContext = createContext();

const AUTH_KEYS = {
  TOKEN: 'authToken',
  USER: 'userData',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkStoredAuth();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet([
        AUTH_KEYS.TOKEN,
        AUTH_KEYS.USER,
      ]);

      const tokenValue = storedToken[1];
      const userValue = storedUser[1];

      if (tokenValue && userValue) {
        // Verify token is still valid
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${tokenValue}` },
            timeout: 5000,
          });
          if (!mountedRef.current) return;
          setToken(tokenValue);
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (err) {
          // Token expired or invalid
          await AsyncStorage.multiRemove([AUTH_KEYS.TOKEN, AUTH_KEYS.USER]);
          if (!mountedRef.current) return;
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const login = useCallback(async (email, password) => {
    console.log('[AuthContext] Login attempt for:', email);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
        timeout: 10000, // 10 second timeout
      });
      const { token: newToken, user: userData } = response.data;
      console.log('[AuthContext] Login successful for:', email);

      await AsyncStorage.setItem(AUTH_KEYS.TOKEN, newToken);
      await AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);

      return userData;
    } catch (err) {
      console.error('[AuthContext] Login error:', err.response?.data || err.message);
      if (err.code === 'ECONNABORTED') {
        throw new Error('Yêu cầu hết thời gian. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
      throw err.response?.data || err;
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    console.log('[AuthContext] Register attempt for:', email);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { email, password, name }, {
        timeout: 10000, // 10 second timeout
      });
      const { token: newToken, user: userData } = response.data;
      console.log('[AuthContext] Register successful for:', email);

      await AsyncStorage.setItem(AUTH_KEYS.TOKEN, newToken);
      await AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);

      return userData;
    } catch (err) {
      console.error('[AuthContext] Register error:', err.response?.data || err.message);
      if (err.code === 'ECONNABORTED') {
        throw new Error('Yêu cầu hết thời gian. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
      throw err.response?.data || err;
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([AUTH_KEYS.TOKEN, AUTH_KEYS.USER]);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        checkStoredAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
