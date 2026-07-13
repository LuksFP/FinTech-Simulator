import { useState, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Trash2, Pencil, Paperclip, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { getReceiptUrl } from '@/lib/receiptStorage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { TransactionForm } from './TransactionForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  const { toast } = useToast();

  const handleDelete = useCallback(() => {
    onDelete(transaction.id);
  }, [onDelete, transaction.id]);

  const handleViewReceipt = useCallback(async () => {
    if (!transaction.receipt_url) return;
    try {
      const url = await getReceiptUrl(transaction.receipt_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir o comprovante.',
        variant: 'destructive',
      });
    }
  }, [transaction.receipt_url, toast]);

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
          <p className="font-medium text-foreground text-sm sm:text-base truncate flex items-center gap-2">
            <span className="truncate">{transaction.description}</span>
            {transaction.pending && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-400 px-1.5 py-0.5 text-[10px] font-medium">
                <Clock className="w-2.5 h-2.5" />
                pendente
              </span>
            )}
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
          {transaction.receipt_url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              aria-label="Ver comprovante"
              onClick={handleViewReceipt}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          )}
          {!transaction.pending && (
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
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Excluir transação"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{transaction.description}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
});
