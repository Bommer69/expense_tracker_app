import { useState, useEffect, useCallback } from 'react';
import { recurringTransactionsAPI } from '../services/api';

export const useRecurringTransactions = () => {
  const [recurrings, setRecurrings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecurrings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await recurringTransactionsAPI.getAll();
      setRecurrings(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecurring = useCallback(async (data) => {
    setLoading(true);
    try {
      await recurringTransactionsAPI.create(data);
      await fetchRecurrings();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRecurrings]);

  const removeRecurring = useCallback(async (id) => {
    setLoading(true);
    try {
      await recurringTransactionsAPI.delete(id);
      await fetchRecurrings();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRecurrings]);

  useEffect(() => {
    fetchRecurrings();
  }, [fetchRecurrings]);

  return {
    recurrings,
    loading,
    error,
    fetchRecurrings,
    createRecurring,
    removeRecurring,
  };
};

export default useRecurringTransactions;
