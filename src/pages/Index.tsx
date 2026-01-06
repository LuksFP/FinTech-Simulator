import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const {
    transactions,
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

  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Stats Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">
              Visão geral das suas finanças
            </p>
          </div>
          <TransactionForm onSubmit={createTransaction} />
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          />
          <StatCard
            title="Total de Saídas"
            value={stats.totalExpense}
            icon={TrendingDown}
            variant="expense"
            delay={0.2}
          />
        </div>

        {/* Chart and Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <BalanceChart data={chartData} />
          </div>
          <div className="lg:col-span-2">
            <TransactionList
              transactions={transactions}
              filter={filter}
              sort={sort}
              onFilterChange={setFilter}
              onSortChange={setSort}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
