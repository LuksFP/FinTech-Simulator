import { useState, useEffect, useCallback, useMemo } from 'react';
import { subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { transactionService } from '@/services/transactionService';
import type { 
  Transaction, 
  TransactionFormData, 
  TransactionStats, 
  FilterType, 
  SortType,
  PeriodType,
} from '@/types/transaction';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date-desc');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

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
        () => {
          fetchTransactions();
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
  }, []);

  // Update transaction
  const updateTransaction = useCallback(async (id: string, data: TransactionFormData) => {
    await transactionService.update(id, data);
  }, []);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: string) => {
    await transactionService.delete(id);
  }, []);

  // Get date range based on period
  const getDateRange = useCallback((): { start: Date | null; end: Date | null } => {
    const now = new Date();
    
    switch (period) {
      case '7days':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case 'custom':
        return { 
          start: customDateRange.from ? startOfDay(customDateRange.from) : null, 
          end: customDateRange.to ? endOfDay(customDateRange.to) : null,
        };
      default:
        return { start: null, end: null };
    }
  }, [period, customDateRange]);

  // Calculate stats (from all transactions, not filtered)
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

    // Apply period filter
    const dateRange = getDateRange();
    if (dateRange.start && dateRange.end) {
      result = result.filter((t) => {
        const transactionDate = parseISO(t.date);
        return isWithinInterval(transactionDate, { start: dateRange.start!, end: dateRange.end! });
      });
    } else if (dateRange.start && !dateRange.end) {
      result = result.filter((t) => {
        const transactionDate = parseISO(t.date);
        return transactionDate >= dateRange.start!;
      });
    }

    // Apply type filter
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
  }, [transactions, filter, sort, getDateRange]);

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
    period,
    customDateRange,
    setFilter,
    setSort,
    setPeriod,
    setCustomDateRange,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
