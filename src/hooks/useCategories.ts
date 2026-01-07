import { useState, useEffect } from 'react';
import { categoryService } from '@/services/categoryService';
import type { Category } from '@/types/transaction';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const data = await categoryService.getAll();
        setCategories(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getCategoriesByType = (type: 'entrada' | 'saida') => {
    return categories.filter(cat => cat.type === type);
  };

  const getCategoryById = (id: string | null) => {
    if (!id) return null;
    return categories.find(cat => cat.id === id) || null;
  };

  return {
    categories,
    isLoading,
    error,
    getCategoriesByType,
    getCategoryById,
  };
}
