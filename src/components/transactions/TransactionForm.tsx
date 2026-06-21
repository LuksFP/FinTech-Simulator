import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight, ArrowDownRight, Loader2, Pencil, Sparkles, Paperclip, X } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { uploadReceipt } from '@/lib/receiptStorage';
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
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { useAutoCategory } from '@/hooks/useAutoCategory';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import type { Transaction, TransactionFormData, TransactionType } from '@/types/transaction';

const transactionSchema = z.object({
  description: z.string().trim().min(1, 'Descrição é obrigatória').max(100, 'Máximo 100 caracteres'),
  amount: z.number().positive('Valor deve ser positivo').max(999999999.99, 'Valor muito alto'),
  type: z.enum(['entrada', 'saida']),
  date: z.string().min(1, 'Data é obrigatória'),
  category_id: z.string().optional(),
  receipt_url: z.string().nullable().optional(),
});

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onUpdate?: (id: string, data: TransactionFormData) => Promise<void>;
  editTransaction?: Transaction | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TransactionForm({ 
  onSubmit, 
  onUpdate,
  editTransaction,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger
}: TransactionFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<TransactionType>('entrada');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { categories: allCategories, getCategoriesByType } = useCategories();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const isEditing = !!editTransaction;
  const categories = getCategoriesByType(type);

  const suggestion = useAutoCategory(description, type, allCategories, categoryId);

  // Populate form when editing
  useEffect(() => {
    if (editTransaction && open) {
      setType(editTransaction.type);
      setDescription(editTransaction.description);
      setAmount(editTransaction.amount.toString());
      setDate(editTransaction.date.split('T')[0]);
      setCategoryId(editTransaction.category_id || '');
      setReceiptPath(editTransaction.receipt_url || null);
      setReceiptFile(null);
    }
  }, [editTransaction, open]);

  const resetForm = () => {
    setType('entrada');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategoryId('');
    setReceiptFile(null);
    setReceiptPath(null);
    setErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategoryId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      description,
      amount: parseFloat(amount) || 0,
      type,
      date,
      category_id: categoryId || undefined,
      receipt_url: receiptPath,
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

      // Upload the receipt first (if a new file was picked) and persist its path.
      let receipt_url = receiptPath;
      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile);
      }
      const payload = { ...result.data, receipt_url } as TransactionFormData;

      if (isEditing && onUpdate) {
        await onUpdate(editTransaction.id, payload);
        toast({
          title: 'Transação atualizada!',
          description: `${type === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${parseFloat(amount).toFixed(2)} atualizada.`,
        });
      } else {
        await onSubmit(payload);
        toast({
          title: 'Transação criada!',
          description: `${type === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${parseFloat(amount).toFixed(2)} registrada.`,
        });
      }
      
      resetForm();
      setOpen(false);
    } catch (error) {
      const fallback = isEditing ? 'Não foi possível atualizar a transação.' : 'Não foi possível criar a transação.';
      toast({
        title: 'Erro',
        description: error instanceof Error && error.message ? error.message : fallback,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold gap-2 glow-primary">
      <Plus className="w-5 h-5" />
      Nova Transação
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="glass border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('entrada')}
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
              onClick={() => handleTypeChange('saida')}
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

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1 rounded"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CategoryIcon
                          icon={cat.icon}
                          className="w-4 h-4"
                          style={{ color: cat.color }}
                        />
                      </div>
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <AnimatePresence>
              {suggestion && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/8 border border-primary/20 text-sm">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Sugestão:</span>
                    <div
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${suggestion.color}18` }}
                    >
                      <CategoryIcon
                        icon={suggestion.icon}
                        className="w-3.5 h-3.5"
                        style={{ color: suggestion.color }}
                      />
                      <span className="font-medium" style={{ color: suggestion.color }}>
                        {suggestion.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCategoryId(suggestion.id)}
                      className="ml-auto text-xs font-semibold text-primary hover:underline"
                    >
                      Usar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

          {/* Receipt */}
          <div className="space-y-2">
            <Label>Comprovante (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setReceiptFile(f);
              }}
            />
            {receiptFile || receiptPath ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-3 py-2 text-sm">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {receiptFile ? receiptFile.name : 'Comprovante anexado'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFile(null);
                    setReceiptPath(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  aria-label="Remover comprovante"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2 border-dashed"
              >
                <Paperclip className="w-4 h-4" />
                Anexar imagem ou PDF
              </Button>
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
              ) : isEditing ? (
                'Salvar Alterações'
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