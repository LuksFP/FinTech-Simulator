import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { categoryService } from '@/services/categoryService';
import type { Category, CategoryFormData } from '@/types/transaction';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();

    const channel = supabase
      .channel('categories-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCategories]);

  const createCategory = useCallback(async (data: CategoryFormData) => {
    return await categoryService.create(data);
  }, []);

  const updateCategory = useCallback(async (id: string, data: CategoryFormData) => {
    return await categoryService.update(id, data);
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await categoryService.delete(id);
  }, []);

  const getCategoriesByType = useCallback((type: 'entrada' | 'saida') => {
    return categories.filter(cat => cat.type === type);
  }, [categories]);

  const getCategoryById = useCallback((id: string | null) => {
    if (!id) return null;
    return categories.find(cat => cat.id === id) || null;
  }, [categories]);

  const getUserCategories = useCallback(() => {
    return categories.filter(cat => cat.user_id !== null);
  }, [categories]);

  const getSystemCategories = useCallback(() => {
    return categories.filter(cat => cat.user_id === null);
  }, [categories]);

  return {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    getCategoryById,
    getUserCategories,
    getSystemCategories,
    refetch: fetchCategories,
  };
}
