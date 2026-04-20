import { useState, useEffect } from 'react';
import { suggestCategory } from '@/services/autoCategoryService';
import type { Category, TransactionType } from '@/types/transaction';

export function useAutoCategory(
  description: string,
  type: TransactionType,
  categories: Category[],
  currentCategoryId: string
): Category | null {
  const [suggestion, setSuggestion] = useState<Category | null>(null);

  useEffect(() => {
    if (currentCategoryId) {
      setSuggestion(null);
      return;
    }

    const timeout = setTimeout(() => {
      setSuggestion(suggestCategory(description, type, categories));
    }, 350);

    return () => clearTimeout(timeout);
  }, [description, type, categories, currentCategoryId]);

  // clear suggestion when user manually picks a category
  useEffect(() => {
    if (currentCategoryId) setSuggestion(null);
  }, [currentCategoryId]);

  return suggestion;
}
