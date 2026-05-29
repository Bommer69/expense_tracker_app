import { useState, useEffect, useCallback, useContext } from 'react';
import { categoriesAPI } from '../api';
import { AuthContext } from '../context/AuthContext';

function useAuthGuard() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { isAuthenticated: false, isLoading: true };
  return { isAuthenticated: ctx.isAuthenticated, isLoading: ctx.isLoading };
}

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const fetchCategories = useCallback(async (type = null) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await categoriesAPI.getAll(type);
      setCategories(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createCategory = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await categoriesAPI.create(data);
      await fetchCategories();
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id) => {
    setLoading(true);
    try {
      await categoriesAPI.remove(id);
      await fetchCategories();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    fetchCategories();
  }, [fetchCategories, isAuthenticated, authLoading]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    deleteCategory,
  };
};

export default useCategories;
