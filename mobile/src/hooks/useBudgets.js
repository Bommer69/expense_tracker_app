import { useState, useEffect, useCallback, useContext } from 'react';
import { budgetsAPI } from '../api';
import { getCurrentMonth } from '../utils/formatters';
import { AuthContext } from '../context/AuthContext';

function useAuthGuard() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { isAuthenticated: false, isLoading: true };
  return { isAuthenticated: ctx.isAuthenticated, isLoading: ctx.isLoading };
}

export const useBudgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const fetchBudgets = useCallback(async (month = getCurrentMonth()) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await budgetsAPI.getAll(month);
      setBudgets(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createBudget = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await budgetsAPI.create(data);
      await fetchBudgets(data?.month || getCurrentMonth());
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets]);

  const updateBudget = useCallback(async (id, data) => {
    setLoading(true);
    try {
      const response = await budgetsAPI.update(id, data);
      await fetchBudgets(data?.month || getCurrentMonth());
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets]);

  const deleteBudget = useCallback(async (id, month = getCurrentMonth()) => {
    setLoading(true);
    try {
      await budgetsAPI.delete(id);
      await fetchBudgets(month);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchBudgets();
  }, [fetchBudgets, isAuthenticated, authLoading]);

  return {
    budgets,
    loading,
    error,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
  };
};

export default useBudgets;
