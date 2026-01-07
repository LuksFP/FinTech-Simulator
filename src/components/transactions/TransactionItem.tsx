import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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

export function TransactionItem({ transaction, index, onDelete, onUpdate }: TransactionItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const isIncome = transaction.type === 'entrada';
  const category = transaction.category;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy", { locale: ptBR });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'group flex items-center justify-between p-4 rounded-lg',
        'bg-secondary/30 hover:bg-secondary/50 transition-all duration-200',
        'border border-transparent hover:border-border/50'
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className="p-2 rounded-lg"
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
              className="w-5 h-5"
              style={{ color: category.color }}
            />
          ) : isIncome ? (
            <ArrowUpRight className="w-5 h-5 text-income" />
          ) : (
            <ArrowDownRight className="w-5 h-5 text-expense" />
          )}
        </div>

        <div>
          <p className="font-medium text-foreground">{transaction.description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDate(transaction.date)}</span>
            {category && (
              <>
                <span>•</span>
                <span style={{ color: category.color }}>{category.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <p
          className={cn(
            'font-mono font-semibold text-lg',
            isIncome ? 'text-income' : 'text-expense'
          )}
        >
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>

        <div className="flex items-center gap-1">
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
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(transaction.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}