import { useState, useEffect, useCallback } from 'react';
import { goalService } from '@/services/goalService';
import type { FinancialGoal } from '@/types/transaction';

export function useGoals() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState<FinancialGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [allGoals, current] = await Promise.all([
        goalService.getAll(),
        goalService.getCurrentMonthGoal(),
      ]);
      setGoals(allGoals);
      setCurrentGoal(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const upsertGoal = useCallback(async (targetAmount: number, month: number, year: number) => {
    const goal = await goalService.upsert(targetAmount, month, year);
    await fetchGoals();
    return goal;
  }, [fetchGoals]);

  const deleteGoal = useCallback(async (id: string) => {
    await goalService.delete(id);
    await fetchGoals();
  }, [fetchGoals]);

  return {
    goals,
    currentGoal,
    isLoading,
    error,
    upsertGoal,
    deleteGoal,
    refetch: fetchGoals,
  };
}
