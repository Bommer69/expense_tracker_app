import { useState, useEffect, useCallback } from 'react';
import { transactionsAPI } from '../services/api';
import { getCurrentMonth } from '../utils/formatters';

export const useTransactions = (limit = 50) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await transactionsAPI.getAll({ limit, ...params });
      setTransactions(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const createTransaction = useCallback(async (data) => {
    setLoading(true);
    try {
      await transactionsAPI.create(data);
      await fetchTransactions();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions]);

  const deleteTransaction = useCallback(async (id) => {
    setLoading(true);
    try {
      await transactionsAPI.delete(id);
      setTransactions(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
};

export const useTransactionSummary = () => {
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, byCategory: {} });
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async (month = getCurrentMonth()) => {
    setLoading(true);
    try {
      const response = await transactionsAPI.getSummary(month);
      setSummary(response.data);
      return response.data;
    } catch (err) {
      console.error('Summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    fetchSummary,
  };
};

export default useTransactions;