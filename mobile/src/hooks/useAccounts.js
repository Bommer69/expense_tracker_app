import { useState, useEffect, useCallback, useContext } from 'react';
import { accountsAPI } from '../api';
import { AuthContext } from '../context/AuthContext';

function useAuthGuard() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { isAuthenticated: false, isLoading: true };
  return { isAuthenticated: ctx.isAuthenticated, isLoading: ctx.isLoading };
}

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const fetchAccounts = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await accountsAPI.getAll();
      setAccounts(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createAccount = useCallback(async (data) => {
    setLoading(true);
    try {
      await accountsAPI.create(data);
      await fetchAccounts();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAccounts]);

  const updateAccount = useCallback(async (id, data) => {
    setLoading(true);
    try {
      await accountsAPI.update(id, data);
      await fetchAccounts();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAccounts]);

  const deleteAccount = useCallback(async (id) => {
    setLoading(true);
    try {
      await accountsAPI.delete(id);
      setAccounts(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBalance = useCallback(async () => {
    if (!isAuthenticated) return [];
    setLoading(true);
    try {
      const response = await accountsAPI.getBalance();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchAccounts();
  }, [fetchAccounts, isAuthenticated, authLoading]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getBalance,
  };
};

export default useAccounts;
