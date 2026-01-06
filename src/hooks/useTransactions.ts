import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { transactionService } from '@/services/transactionService';
import type { 
  Transaction, 
  TransactionFormData, 
  TransactionStats, 
  FilterType, 
  SortType 
} from '@/types/transaction';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date-desc');

  // Fetch initial transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await transactionService.getAll();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newTransaction = {
              ...payload.new,
              amount: Number(payload.new.amount),
            } as Transaction;
            setTransactions((prev) => [newTransaction, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setTransactions((prev) => 
              prev.filter((t) => t.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  // Create transaction
  const createTransaction = useCallback(async (data: TransactionFormData) => {
    await transactionService.create(data);
    // Realtime will handle the update
  }, []);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
    // Realtime will handle the update
  }, []);

  // Calculate stats
  const stats: TransactionStats = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply filter
    if (filter !== 'all') {
      result = result.filter((t) => t.type === filter);
    }

    // Apply sort
    result.sort((a, b) => {
      switch (sort) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, filter, sort]);

  // Chart data
  const chartData = useMemo(() => {
    return [
      { name: 'Entradas', value: stats.totalIncome, fill: 'hsl(160 84% 39%)' },
      { name: 'Saídas', value: stats.totalExpense, fill: 'hsl(0 72% 51%)' },
    ];
  }, [stats]);

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    stats,
    chartData,
    isLoading,
    error,
    filter,
    sort,
    setFilter,
    setSort,
    createTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
