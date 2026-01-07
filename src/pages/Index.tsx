import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { GoalCard } from '@/components/dashboard/GoalCard';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
    setFilter,
    setSort,
    createTransaction,
    deleteTransaction,
  } = useTransactions();

  const { currentGoal, upsertGoal } = useGoals();
  const { user, isLoading: authLoading, isAuthenticated, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleDelete = async (id: string) => {
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
  };

  const handleUpdateGoal = async (amount: number) => {
    const now = new Date();
    await upsertGoal(amount, now.getMonth() + 1, now.getFullYear());
    toast({
      title: 'Meta atualizada!',
      description: 'Sua meta de economia foi atualizada.',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userEmail={user?.email} onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">Visão geral das suas finanças</p>
          </div>
          <TransactionForm onSubmit={createTransaction} />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard title="Saldo Atual" value={stats.balance} icon={Wallet} variant="balance" delay={0} />
          <StatCard title="Total de Entradas" value={stats.totalIncome} icon={TrendingUp} variant="income" delay={0.1} />
          <StatCard title="Total de Saídas" value={stats.totalExpense} icon={TrendingDown} variant="expense" delay={0.2} />
        </div>

        <div className="mb-8">
          <GoalCard goal={currentGoal} currentSavings={stats.balance} onUpdateGoal={handleUpdateGoal} delay={0.3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <BalanceChart data={chartData} />
          <MonthlyChart transactions={allTransactions} />
        </div>

        <TransactionList
          transactions={transactions}
          filter={filter}
          sort={sort}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

export default Index;
