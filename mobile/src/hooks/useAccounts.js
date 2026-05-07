import { useState, useEffect, useCallback } from 'react';
import { accountsAPI } from '../services/api';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
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
  }, []);

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
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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