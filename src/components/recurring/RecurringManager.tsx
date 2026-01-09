import { useState, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, Pencil, Trash2, Pause, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { RecurringForm } from './RecurringForm';
import { useRecurring } from '@/hooks/useRecurring';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RecurringTransaction, RecurringFormData } from '@/types/recurring';
import { frequencyLabels } from '@/types/recurring';

const RecurringItem = memo(function RecurringItem({
  item,
  onUpdate,
  onToggle,
  onDelete,
}: {
  item: RecurringTransaction;
  onUpdate: (id: string, data: RecurringFormData) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const isIncome = item.type === 'entrada';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg transition-colors',
        item.is_active ? 'bg-secondary/30 hover:bg-secondary/50' : 'bg-muted/30 opacity-60'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {item.category && (
          <div
            className="p-2 rounded-lg shrink-0"
            style={{ backgroundColor: `${item.category.color}20` }}
          >
            <CategoryIcon
              icon={item.category.icon}
              className="w-4 h-4"
              style={{ color: item.category.color }}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{item.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn('font-mono', isIncome ? 'text-income' : 'text-expense')}>
              {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
            </span>
            <span>•</span>
            <span>{frequencyLabels[item.frequency]}</span>
            <span>•</span>
            <span>Próxima: {format(new Date(item.next_due_date), 'dd/MM', { locale: ptBR })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={item.is_active}
          onCheckedChange={(checked) => onToggle(item.id, checked)}
          aria-label={item.is_active ? 'Pausar' : 'Ativar'}
        />
        <RecurringForm
          onSubmit={async () => {}}
          onUpdate={onUpdate}
          editRecurring={item}
          open={editOpen}
          onOpenChange={setEditOpen}
          trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="w-4 h-4" />
            </Button>
          }
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir transação recorrente?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{item.description}"? Transações já criadas não serão afetadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(item.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
});

export const RecurringManager = memo(function RecurringManager() {
  const [open, setOpen] = useState(false);
  const { recurring, createRecurring, updateRecurring, toggleActive, deleteRecurring } = useRecurring();
  const { toast } = useToast();

  const handleCreate = useCallback(async (data: RecurringFormData) => {
    try {
      await createRecurring(data);
      toast({ title: 'Recorrente criada!', description: 'Sua transação recorrente foi adicionada.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível criar a transação recorrente.', variant: 'destructive' });
    }
  }, [createRecurring, toast]);

  const handleUpdate = useCallback(async (id: string, data: RecurringFormData) => {
    try {
      await updateRecurring(id, data);
      toast({ title: 'Atualizada!', description: 'As alterações foram salvas.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' });
    }
  }, [updateRecurring, toast]);

  const handleToggle = useCallback(async (id: string, isActive: boolean) => {
    try {
      await toggleActive(id, isActive);
      toast({ title: isActive ? 'Ativada' : 'Pausada', description: `Transação recorrente ${isActive ? 'ativada' : 'pausada'}.` });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' });
    }
  }, [toggleActive, toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteRecurring(id);
      toast({ title: 'Excluída', description: 'A transação recorrente foi removida.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    }
  }, [deleteRecurring, toast]);

  const activeCount = recurring.filter(r => r.is_active).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Repeat className="w-4 h-4" />
          <span className="hidden sm:inline">Recorrentes</span>
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Transações Recorrentes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4">
            <RecurringForm onSubmit={handleCreate} />
          </div>

          <div className="flex-1 overflow-y-auto">
            {recurring.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Repeat className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma transação recorrente</p>
                <p className="text-sm">Crie transações que se repetem automaticamente</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {recurring.map((item) => (
                    <RecurringItem
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdate}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
