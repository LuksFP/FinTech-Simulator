import { useState, memo, useEffect } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import type { RecurringTransaction, RecurringFormData, Frequency } from '@/types/recurring';
import type { TransactionType } from '@/types/transaction';
import { frequencyLabels } from '@/types/recurring';

interface RecurringFormProps {
  onSubmit: (data: RecurringFormData) => Promise<void>;
  onUpdate?: (id: string, data: RecurringFormData) => Promise<void>;
  editRecurring?: RecurringTransaction;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const RecurringForm = memo(function RecurringForm({
  onSubmit,
  onUpdate,
  editRecurring,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: RecurringFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getCategoriesByType } = useCategories();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const isEditing = !!editRecurring;

  const [description, setDescription] = useState(editRecurring?.description || '');
  const [amount, setAmount] = useState(editRecurring?.amount?.toString() || '');
  const [type, setType] = useState<TransactionType>(editRecurring?.type || 'saida');
  const [categoryId, setCategoryId] = useState(editRecurring?.category_id || '');
  const [frequency, setFrequency] = useState<Frequency>(editRecurring?.frequency || 'monthly');
  const [nextDueDate, setNextDueDate] = useState(
    editRecurring?.next_due_date || format(new Date(), 'yyyy-MM-dd')
  );

  const categories = getCategoriesByType(type);

  useEffect(() => {
    if (open && editRecurring) {
      setDescription(editRecurring.description);
      setAmount(editRecurring.amount.toString());
      setType(editRecurring.type);
      setCategoryId(editRecurring.category_id || '');
      setFrequency(editRecurring.frequency);
      setNextDueDate(editRecurring.next_due_date);
    }
  }, [open, editRecurring]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setType('saida');
    setCategoryId('');
    setFrequency('monthly');
    setNextDueDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setIsSubmitting(true);
    try {
      const data: RecurringFormData = {
        description,
        amount: parseFloat(amount),
        type,
        category_id: categoryId || undefined,
        frequency,
        next_due_date: nextDueDate,
      };

      if (isEditing && onUpdate && editRecurring) {
        await onUpdate(editRecurring.id, data);
      } else {
        await onSubmit(data);
      }

      resetForm();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Recorrente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Salário, Aluguel, Netflix..."
              required
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextDueDate">Próxima data</Label>
              <Input
                id="nextDueDate"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !description.trim() || !amount}>
            {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Recorrente'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
});
