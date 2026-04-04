import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { assertValid, budgetSchema, uuidSchema } from '@/lib/validation';
import { apiRateLimiter } from '@/lib/rateLimiter';

export interface Budget {
  id: string;
  category_id: string;
  monthly_limit: number;
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setBudgets([]); return; }

      const now = new Date();
      const { data, error: fetchError } = await (supabase
        .from('category_budgets' as any)
        .select('id, category_id, monthly_limit')
        .eq('user_id', user.id)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear()));

      if (fetchError) throw fetchError;
      setBudgets((data as Budget[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const upsertBudget = useCallback(async (categoryId: string, limit: number) => {
    const { allowed } = apiRateLimiter.check('budget:upsert');
    if (!allowed) throw new Error('Muitas requisições. Aguarde um momento.');

    assertValid(budgetSchema, { categoryId, limit });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const now = new Date();
    const { error: upsertError } = await (supabase
      .from('category_budgets' as any)
      .upsert(
        {
          user_id: user.id,
          category_id: categoryId,
          monthly_limit: limit,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        { onConflict: 'user_id,category_id,month,year' },
      ));

    if (upsertError) throw upsertError;
    await fetchBudgets();
  }, [fetchBudgets]);

  const deleteBudget = useCallback(async (categoryId: string) => {
    assertValid(uuidSchema, categoryId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const now = new Date();
    const { error: deleteError } = await (supabase
      .from('category_budgets' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear()));

    if (deleteError) throw deleteError;
    await fetchBudgets();
  }, [fetchBudgets]);

  return { budgets, isLoading, error, fetchBudgets, upsertBudget, deleteBudget };
}
