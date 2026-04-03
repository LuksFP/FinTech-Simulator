import { useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { GoalCard } from '@/components/dashboard/GoalCard';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { RecurringManager } from '@/components/recurring/RecurringManager';
import { ReportsDialog } from '@/components/reports/ReportsDialog';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/hooks/useAuth';
import { useReports } from '@/hooks/useReports';
import { useToast } from '@/hooks/use-toast';
import type { TransactionFormData } from '@/types/transaction';

const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
});

const ErrorBanner = memo(function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
      {message}
    </div>
  );
});

const Index = () => {
  const {
    transactions,
    allTransactions,
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
  } = useTransactions();

  const { currentGoal, upsertGoal } = useGoals();
  const { user, isLoading: authLoading, isAuthenticated, signOut } = useAuth();
  const { previousMonthComparison, currentMonthStats } = useReports(allTransactions);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteTransaction(id);
      toast({
        title: 'Transação excluída',
        description: 'A transação foi removida com sucesso.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a transação.',
        variant: 'destructive',
      });
    }
  }, [deleteTransaction, toast]);

  const handleUpdate = useCallback(async (id: string, data: TransactionFormData) => {
    await updateTransaction(id, data);
  }, [updateTransaction]);

  const handleUpdateGoal = useCallback(async (amount: number) => {
    const now = new Date();
    await upsertGoal(amount, now.getMonth() + 1, now.getFullYear());
    toast({
      title: 'Meta atualizada!',
      description: 'Sua meta de economia foi atualizada.',
    });
  }, [upsertGoal, toast]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/auth');
  }, [signOut, navigate]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userEmail={user?.email} onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReportsDialog transactions={allTransactions} />
            <RecurringManager />
            <CategoryManager />
            <TransactionForm onSubmit={createTransaction} />
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Spending alert */}
        {currentMonthStats.income > 0 && currentMonthStats.expense > currentMonthStats.income * 0.9 && (
          <div className="mb-4 p-3 sm:p-4 rounded-lg bg-expense/10 border border-expense/30 text-expense text-sm flex items-center gap-2">
            <TrendingDown className="w-4 h-4 shrink-0" />
            {currentMonthStats.expense >= currentMonthStats.income
              ? 'Atenção: suas despesas este mês já superaram as receitas.'
              : 'Atenção: suas despesas este mês estão acima de 90% das receitas.'}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            title="Saldo Atual"
            value={stats.balance}
            icon={Wallet}
            variant="balance"
            delay={0}
          />
          <StatCard
            title="Total de Entradas"
            value={stats.totalIncome}
            icon={TrendingUp}
            variant="income"
            delay={0.1}
            change={previousMonthComparison.incomeChange}
          />
          <StatCard
            title="Total de Saídas"
            value={stats.totalExpense}
            icon={TrendingDown}
            variant="expense"
            delay={0.2}
            change={previousMonthComparison.expenseChange}
          />
        </div>

        {/* Goal Card */}
        <div className="mb-6 sm:mb-8">
          <GoalCard 
            goal={currentGoal} 
            currentSavings={stats.balance} 
            onUpdateGoal={handleUpdateGoal} 
            delay={0.3} 
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <BalanceChart data={chartData} />
          <MonthlyChart transactions={allTransactions} />
        </div>

        {/* Transaction List */}
        <TransactionList
          transactions={transactions}
          filter={filter}
          sort={sort}
          period={period}
          customDateRange={customDateRange}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onPeriodChange={setPeriod}
          onCustomDateChange={setCustomDateRange}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

export default Index;
