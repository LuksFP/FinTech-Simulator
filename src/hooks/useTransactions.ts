import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { transactionService } from '@/services/transactionService';
import { calculateDateRange } from '@/lib/dateRange';
import { REALTIME_DEBOUNCE_MS } from '@/lib/constants';
import { useOnline } from '@/hooks/useOnline';
import {
  loadQueue,
  enqueueTransaction,
  removeFromQueue,
  isOfflineTempId,
  type QueuedTransaction,
} from '@/lib/offlineQueue';
import type {
  Transaction,
  TransactionFormData,
  TransactionStats,
  FilterType,
  SortType,
  PeriodType,
} from '@/types/transaction';

/** Converte um item da fila offline numa Transaction otimista para a UI. */
function queuedToTransaction(item: QueuedTransaction): Transaction {
  return {
    id: item.tempId,
    description: item.data.description,
    amount: item.data.amount,
    type: item.data.type,
    date: item.data.date,
    created_at: item.queuedAt,
    user_id: '',
    category_id: item.data.category_id ?? null,
    account_id: item.data.account_id ?? null,
    receipt_url: null,
    pending: true,
  };
}

export function useTransactions() {
  const [serverTransactions, setServerTransactions] = useState<Transaction[]>([]);
  const [pending, setPending] = useState<QueuedTransaction[]>(() => loadQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(''); // '' = todas
  const [accountFilter, setAccountFilter] = useState<string>('');   // '' = todas
  const [sort, setSort] = useState<SortType>('date-desc');
  const [period, setPeriod] = useState<PeriodType>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const isOnline = useOnline();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);

  // Lista efetiva = pendentes (offline, no topo) + transações do servidor.
  // Os pendentes ficam separados para sobreviverem aos refetches do realtime.
  const transactions = useMemo(
    () => [...pending.map(queuedToTransaction), ...serverTransactions],
    [pending, serverTransactions],
  );

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await transactionService.getAll();
      setServerTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup realtime subscription with debounce to avoid rapid refetches
  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchTransactions, REALTIME_DEBOUNCE_MS);
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  // Sincroniza a fila offline: cria cada pendente no servidor, na ordem.
  // Para no primeiro erro (ex.: caiu a rede de novo) e tenta de novo depois.
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    const queue = loadQueue();
    if (queue.length === 0) return;

    flushingRef.current = true;
    setIsSyncing(true);
    let synced = 0;
    try {
      for (const item of queue) {
        await transactionService.create(item.data);
        setPending(removeFromQueue(item.tempId));
        synced += 1;
      }
    } catch {
      // mantém o restante na fila para a próxima tentativa
    } finally {
      flushingRef.current = false;
      setIsSyncing(false);
      if (synced > 0) fetchTransactions();
    }
  }, [fetchTransactions]);

  // Dispara a sincronização ao ficar online (e no load, se já estiver online).
  useEffect(() => {
    if (isOnline) flushQueue();
  }, [isOnline, flushQueue]);

  // Create — offline: enfileira; online: cria no servidor (otimista).
  const createTransaction = useCallback(async (data: TransactionFormData) => {
    if (!isOnline) {
      const item = enqueueTransaction(data);
      setPending(loadQueue());
      return queuedToTransaction(item);
    }
    const created = await transactionService.create(data);
    setServerTransactions(prev => [created, ...prev]);
    return created;
  }, [isOnline]);

  // Create em lote — importação de extrato (requer conexão)
  const createTransactions = useCallback(async (data: TransactionFormData[]) => {
    const created = await transactionService.createMany(data);
    setServerTransactions(prev => [...created, ...prev]);
    return created;
  }, []);

  // Update — optimistic: substitui no state imediatamente
  const updateTransaction = useCallback(async (id: string, data: TransactionFormData) => {
    const updated = await transactionService.update(id, data);
    setServerTransactions(prev => prev.map(t => t.id === id ? updated : t));
    return updated;
  }, []);

  // Delete — item pendente sai só da fila; item do servidor é removido remoto.
  const deleteTransaction = useCallback(async (id: string) => {
    if (isOfflineTempId(id)) {
      setPending(removeFromQueue(id));
      return;
    }
    setServerTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await transactionService.delete(id);
    } catch (err) {
      // Reverte se falhar
      fetchTransactions();
      throw err;
    }
  }, [fetchTransactions]);

  const dateRange = useMemo(
    () => calculateDateRange(period, customDateRange),
    [period, customDateRange],
  );

  // Calculate stats (from all transactions, not filtered)
  const stats: TransactionStats = useMemo(() => {
    const { totalIncome, totalExpense } = transactions.reduce(
      (acc, t) => {
        if (t.type === 'entrada') acc.totalIncome += t.amount;
        else acc.totalExpense += t.amount;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0 },
    );
    return { balance: totalIncome - totalExpense, totalIncome, totalExpense, transactionCount: transactions.length };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

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

    // Apply category filter
    if (categoryFilter) {
      result = result.filter((t) => t.category_id === categoryFilter);
    }

    // Apply account filter
    if (accountFilter) {
      result = result.filter((t) => t.account_id === accountFilter);
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
  }, [transactions, filter, categoryFilter, accountFilter, sort, dateRange]);

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
    categoryFilter,
    accountFilter,
    sort,
    period,
    customDateRange,
    setFilter,
    setCategoryFilter,
    setAccountFilter,
    setSort,
    setPeriod,
    setCustomDateRange,
    createTransaction,
    createTransactions,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
    // Offline
    isOnline,
    isSyncing,
    pendingCount: pending.length,
  };
}
