import { useState, useEffect, useCallback } from 'react';
import { categoriesAPI } from '../services/api';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async (type = null) => {
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
  }, []);

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
    fetchCategories();
  }, [fetchCategories]);

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