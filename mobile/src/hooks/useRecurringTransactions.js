import { useState, useEffect, useCallback, useContext } from 'react';
import { recurringTransactionsAPI } from '../api';
import { AuthContext } from '../context/AuthContext';

function useAuthGuard() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { isAuthenticated: false, isLoading: true };
  return { isAuthenticated: ctx.isAuthenticated, isLoading: ctx.isLoading };
}

export const useRecurringTransactions = () => {
  const [recurrings, setRecurrings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const fetchRecurrings = useCallback(async () => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

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
    if (!isAuthenticated || authLoading) return;
    fetchRecurrings();
  }, [fetchRecurrings, isAuthenticated, authLoading]);

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
