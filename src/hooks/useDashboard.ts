/**
 * Composite hook that aggregates all dashboard data sources.
 * Reduces the number of hook calls in Index.tsx and makes the
 * dependency graph explicit.
 */
import { useState, useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useTransactions } from './useTransactions';
import { useGoals } from './useGoals';
import { useRecurring } from './useRecurring';
import { useAuth } from './useAuth';
import { useReports } from './useReports';
import { useNotifications } from './useNotifications';
import {
  getMonthSummary,
  isCurrentMonth,
  nextMonth,
  previousMonth,
} from '@/lib/monthNav';

export function useDashboard() {
  const transactions = useTransactions();
  const { currentGoal, upsertGoal } = useGoals();
  const { recurring } = useRecurring();
  const auth = useAuth();
  const reports = useReports(transactions.allTransactions);
  const notifications = useNotifications();

  // Mês exibido no dashboard (dia 1). Navegar para um mês passado
  // sincroniza o filtro da lista de transações com o range daquele mês.
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const isViewingCurrentMonth = isCurrentMonth(selectedMonth);

  const { setPeriod, setCustomDateRange } = transactions;
  const goToMonth = useCallback((month: Date) => {
    setSelectedMonth(month);
    if (isCurrentMonth(month)) {
      setPeriod('all');
      setCustomDateRange({ from: undefined, to: undefined });
    } else {
      setPeriod('custom');
      setCustomDateRange({ from: startOfMonth(month), to: endOfMonth(month) });
    }
  }, [setPeriod, setCustomDateRange]);

  const goToPreviousMonth = useCallback(
    () => goToMonth(previousMonth(selectedMonth)),
    [goToMonth, selectedMonth],
  );
  const goToNextMonth = useCallback(
    () => goToMonth(nextMonth(selectedMonth)),
    [goToMonth, selectedMonth],
  );
  const resetMonth = useCallback(
    () => goToMonth(startOfMonth(new Date())),
    [goToMonth],
  );

  const monthSummary = useMemo(
    () => getMonthSummary(transactions.allTransactions, selectedMonth),
    [transactions.allTransactions, selectedMonth],
  );

  const monthChartData = useMemo(() => [
    { name: 'Entradas', value: monthSummary.income, fill: 'hsl(160 84% 39%)' },
    { name: 'Saídas', value: monthSummary.expense, fill: 'hsl(0 72% 51%)' },
  ], [monthSummary]);

  return {
    // Transactions
    transactions: transactions.transactions,
    allTransactions: transactions.allTransactions,
    stats: transactions.stats,
    chartData: monthChartData,
    isLoading: transactions.isLoading,
    error: transactions.error,
    filter: transactions.filter,
    categoryFilter: transactions.categoryFilter,
    accountFilter: transactions.accountFilter,
    sort: transactions.sort,
    period: transactions.period,
    customDateRange: transactions.customDateRange,
    setFilter: transactions.setFilter,
    setCategoryFilter: transactions.setCategoryFilter,
    setAccountFilter: transactions.setAccountFilter,
    setSort: transactions.setSort,
    setPeriod: transactions.setPeriod,
    setCustomDateRange: transactions.setCustomDateRange,
    createTransaction: transactions.createTransaction,
    createTransactions: transactions.createTransactions,
    updateTransaction: transactions.updateTransaction,
    deleteTransaction: transactions.deleteTransaction,

    // Offline
    isOnline: transactions.isOnline,
    isSyncing: transactions.isSyncing,
    pendingCount: transactions.pendingCount,

    // Goals
    currentGoal,
    upsertGoal,

    // Recurring
    recurring,

    // Auth
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    authLoading: auth.isLoading,
    signOut: auth.signOut,

    // Reports
    previousMonthComparison: reports.previousMonthComparison,
    currentMonthStats: reports.currentMonthStats,

    // Notifications
    checkSpendingAlert: notifications.checkSpendingAlert,
    sendMonthlyReport: notifications.sendMonthlyReport,

    // Month navigation
    selectedMonth,
    isViewingCurrentMonth,
    monthSummary,
    goToPreviousMonth,
    goToNextMonth,
    resetMonth,
  };
}
