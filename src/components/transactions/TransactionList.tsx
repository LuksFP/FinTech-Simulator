import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Download } from 'lucide-react';
import { TransactionItem } from './TransactionItem';
import { TransactionFilters } from './TransactionFilters';
import { Button } from '@/components/ui/button';
import { exportTransactionsToCSV } from '@/lib/csvExport';
import type { Transaction, TransactionFormData, FilterType, SortType } from '@/types/transaction';

interface TransactionListProps {
  transactions: Transaction[];
  filter: FilterType;
  sort: SortType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: TransactionFormData) => Promise<void>;
  isLoading: boolean;
}

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="glass rounded-xl p-4 sm:p-6 border border-border/50">
      <div className="animate-pulse space-y-3 sm:space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 sm:h-16 bg-secondary/50 rounded-lg" />
        ))}
      </div>
    </div>
  );
});

const EmptyState = memo(function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <div className="py-8 sm:py-12 text-center">
      <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground text-sm sm:text-base">
        {filter === 'all'
          ? 'Nenhuma transação encontrada'
          : `Nenhuma ${filter === 'entrada' ? 'entrada' : 'saída'} encontrada`}
      </p>
    </div>
  );
});

export const TransactionList = memo(function TransactionList({
  transactions,
  filter,
  sort,
  onFilterChange,
  onSortChange,
  onDelete,
  onUpdate,
  isLoading,
}: TransactionListProps) {
  const handleExport = useCallback(() => {
    exportTransactionsToCSV(transactions);
  }, [transactions]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl p-4 sm:p-6 border border-border/50"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold">Transações</h3>
          {transactions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          )}
        </div>
        <TransactionFilters
          filter={filter}
          sort={sort}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
        />
      </div>

      {transactions.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {transactions.map((transaction, index) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                index={index}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
});
