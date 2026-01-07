import { motion, AnimatePresence } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { TransactionItem } from './TransactionItem';
import { TransactionFilters } from './TransactionFilters';
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

export function TransactionList({
  transactions,
  filter,
  sort,
  onFilterChange,
  onSortChange,
  onDelete,
  onUpdate,
  isLoading,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="glass rounded-xl p-6 border border-border/50">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-secondary/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl p-6 border border-border/50"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold">Transações</h3>
        <TransactionFilters
          filter={filter}
          sort={sort}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
        />
      </div>

      {transactions.length === 0 ? (
        <div className="py-12 text-center">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {filter === 'all'
              ? 'Nenhuma transação encontrada'
              : `Nenhuma ${filter === 'entrada' ? 'entrada' : 'saída'} encontrada`}
          </p>
        </div>
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
}
