import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { recurringService } from '@/services/recurringService';
import type { RecurringTransaction, RecurringFormData } from '@/types/recurring';

export function useRecurring() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecurring = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await recurringService.getAll();
      setRecurring(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurring();

    const channel = supabase
      .channel('recurring-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recurring_transactions',
        },
        () => {
          fetchRecurring();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecurring]);

  const createRecurring = useCallback(async (data: RecurringFormData) => {
    return await recurringService.create(data);
  }, []);

  const updateRecurring = useCallback(async (id: string, data: RecurringFormData) => {
    return await recurringService.update(id, data);
  }, []);

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await recurringService.toggleActive(id, isActive);
  }, []);

  const deleteRecurring = useCallback(async (id: string) => {
    await recurringService.delete(id);
  }, []);

  return {
    recurring,
    isLoading,
    error,
    createRecurring,
    updateRecurring,
    toggleActive,
    deleteRecurring,
    refetch: fetchRecurring,
  };
}
