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
    fetchBudgets();
  }, [fetchBudgets]);

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