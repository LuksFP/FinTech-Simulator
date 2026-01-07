import { useState, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { TransactionForm } from './TransactionForm';
import type { Transaction, TransactionFormData } from '@/types/transaction';

interface TransactionItemProps {
  transaction: Transaction;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: TransactionFormData) => Promise<void>;
}

export const TransactionItem = memo(function TransactionItem({ 
  transaction, 
  index, 
  onDelete, 
  onUpdate 
}: TransactionItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const isIncome = transaction.type === 'entrada';
  const category = transaction.category;

  const handleDelete = useCallback(() => {
    onDelete(transaction.id);
  }, [onDelete, transaction.id]);

  const formattedDate = format(new Date(transaction.date), "dd MMM yyyy", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className={cn(
        'group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg',
        'bg-secondary/30 hover:bg-secondary/50 transition-all duration-200',
        'border border-transparent hover:border-border/50'
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <div
          className="p-2 rounded-lg shrink-0"
          style={{
            backgroundColor: category?.color
              ? `${category.color}20`
              : isIncome
              ? 'hsl(160 84% 39% / 0.2)'
              : 'hsl(0 72% 51% / 0.2)',
          }}
        >
          {category ? (
            <CategoryIcon
              icon={category.icon}
              className="w-4 h-4 sm:w-5 sm:h-5"
              style={{ color: category.color }}
            />
          ) : isIncome ? (
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-income" />
          ) : (
            <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-expense" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm sm:text-base truncate">
            {transaction.description}
          </p>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
            <span>{formattedDate}</span>
            {category && (
              <>
                <span className="hidden xs:inline">•</span>
                <span 
                  className="hidden xs:inline truncate max-w-[100px]" 
                  style={{ color: category.color }}
                >
                  {category.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
        <p
          className={cn(
            'font-mono font-semibold text-base sm:text-lg',
            isIncome ? 'text-income' : 'text-expense'
          )}
        >
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <TransactionForm
            onSubmit={async () => {}}
            onUpdate={onUpdate}
            editTransaction={transaction}
            open={editOpen}
            onOpenChange={setEditOpen}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label="Editar transação"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="Excluir transação"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
});
