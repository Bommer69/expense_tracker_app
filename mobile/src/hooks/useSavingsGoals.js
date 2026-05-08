import { useState, useEffect, useCallback } from 'react';
import { savingsGoalsAPI } from '../services/api';
import { getCurrentMonth } from '../utils/formatters';

export const useSavingsGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGoals = useCallback(async (month = getCurrentMonth()) => {
    setLoading(true);
    setError(null);
    try {
      const response = await savingsGoalsAPI.getAll(month);
      setGoals(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveGoal = useCallback(async (data) => {
    setLoading(true);
    try {
      await savingsGoalsAPI.createOrUpdate(data);
      await fetchGoals(data.month);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchGoals]);

  const deleteGoal = useCallback(async (id, month = getCurrentMonth()) => {
    setLoading(true);
    try {
      await savingsGoalsAPI.delete(id);
      await fetchGoals(month);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchGoals]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    saveGoal,
    deleteGoal,
  };
};

export default useSavingsGoals;
