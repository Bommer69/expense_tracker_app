import { useState, useEffect, useCallback } from 'react';
import { budgetsAPI } from '../services/api';
import { getCurrentMonth } from '../utils/formatters';

export const useBudgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async (month = getCurrentMonth()) => {
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
  }, []);

  const createBudget = useCallback(async (data) => {
    setLoading(true);
    try {
      await budgetsAPI.create(data);
      await fetchBudgets();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets]);

  const deleteBudget = useCallback(async (id) => {
    setLoading(true);
    try {
      await budgetsAPI.delete(id);
      setBudgets(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return {
    budgets,
    loading,
    error,
    fetchBudgets,
    createBudget,
    deleteBudget,
  };
};

export default useBudgets;