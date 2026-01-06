import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
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
import { useToast } from '@/hooks/use-toast';
import type { TransactionFormData, TransactionType } from '@/types/transaction';

const transactionSchema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(100, 'Máximo 100 caracteres'),
  amount: z.number().positive('Valor deve ser positivo').max(999999999.99, 'Valor muito alto'),
  type: z.enum(['entrada', 'saida']),
  date: z.string().min(1, 'Data é obrigatória'),
});

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<TransactionType>('entrada');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const resetForm = () => {
    setType('entrada');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      description,
      amount: parseFloat(amount) || 0,
      type,
      date,
    };

    const result = transactionSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(result.data as TransactionFormData);
      toast({
        title: 'Transação criada!',
        description: `${type === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${parseFloat(amount).toFixed(2)} registrada.`,
      });
      resetForm();
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a transação.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold gap-2 glow-primary">
          <Plus className="w-5 h-5" />
          Nova Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('entrada')}
              className={cn(
                'flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                type === 'entrada'
                  ? 'border-income bg-income/10 text-income'
                  : 'border-border/50 text-muted-foreground hover:border-income/50'
              )}
            >
              <ArrowUpRight className="w-5 h-5" />
              <span className="font-medium">Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => setType('saida')}
              className={cn(
                'flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                type === 'saida'
                  ? 'border-expense bg-expense/10 text-expense'
                  : 'border-border/50 text-muted-foreground hover:border-expense/50'
              )}
            >
              <ArrowDownRight className="w-5 h-5" />
              <span className="font-medium">Saída</span>
            </button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Salário, Aluguel, Mercado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary/50 border-border/50 font-mono"
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex-1 font-semibold',
                type === 'entrada'
                  ? 'bg-gradient-income text-income-foreground'
                  : 'bg-gradient-expense text-expense-foreground'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Criar Transação'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
