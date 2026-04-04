/**
 * Composite hook that aggregates all dashboard data sources.
 * Reduces the number of hook calls in Index.tsx and makes the
 * dependency graph explicit.
 */
import { useTransactions } from './useTransactions';
import { useGoals } from './useGoals';
import { useRecurring } from './useRecurring';
import { useAuth } from './useAuth';
import { useReports } from './useReports';
import { useNotifications } from './useNotifications';

export function useDashboard() {
  const transactions = useTransactions();
  const { currentGoal, upsertGoal } = useGoals();
  const { recurring } = useRecurring();
  const auth = useAuth();
  const reports = useReports(transactions.allTransactions);
  const notifications = useNotifications();

  return {
    // Transactions
    transactions: transactions.transactions,
    allTransactions: transactions.allTransactions,
    stats: transactions.stats,
    chartData: transactions.chartData,
    isLoading: transactions.isLoading,
    error: transactions.error,
    filter: transactions.filter,
    sort: transactions.sort,
    period: transactions.period,
    customDateRange: transactions.customDateRange,
    setFilter: transactions.setFilter,
    setSort: transactions.setSort,
    setPeriod: transactions.setPeriod,
    setCustomDateRange: transactions.setCustomDateRange,
    createTransaction: transactions.createTransaction,
    updateTransaction: transactions.updateTransaction,
    deleteTransaction: transactions.deleteTransaction,

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
  };
}
