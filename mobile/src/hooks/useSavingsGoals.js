import { useState, useEffect, useCallback, useContext } from 'react';
import { savingsGoalsAPI } from '../api';
import { getCurrentMonth } from '../utils/formatters';
import { AuthContext } from '../context/AuthContext';

function useAuthGuard() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { isAuthenticated: false, isLoading: true };
  return { isAuthenticated: ctx.isAuthenticated, isLoading: ctx.isLoading };
}

export const useSavingsGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const fetchGoals = useCallback(async (month = getCurrentMonth()) => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

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
    if (!isAuthenticated || authLoading) return;
    fetchGoals();
  }, [fetchGoals, isAuthenticated, authLoading]);

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
