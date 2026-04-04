import { useState, useEffect, useCallback, memo } from 'react';
import { Target, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBudgets } from '@/hooks/useBudgets';
import type { Category } from '@/types/transaction';

interface CategoryBudgetRowProps {
  category: Category;
  currentLimit: number | null;
  onSave: (categoryId: string, limit: number) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
}

const CategoryBudgetRow = memo(function CategoryBudgetRow({
  category,
  currentLimit,
  onSave,
  onDelete,
}: CategoryBudgetRowProps) {
  const [value, setValue] = useState<string>(
    currentLimit !== null ? String(currentLimit) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync external changes (e.g. after save/delete refreshes the list)
  useEffect(() => {
    setValue(currentLimit !== null ? String(currentLimit) : '');
  }, [currentLimit]);

  const handleSave = async () => {
    const parsed = parseFloat(value.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;
    setIsSaving(true);
    try {
      await onSave(category.id, parsed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(category.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
      {/* Color indicator + name */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color }}
      />
      <span className="flex-1 text-sm font-medium truncate">{category.name}</span>

      {/* Limit input */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">R$</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28 h-8 text-sm"
        />
      </div>

      {/* Save button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
        onClick={handleSave}
        disabled={isSaving || !value || parseFloat(value.replace(',', '.')) <= 0}
        title="Salvar limite"
      >
        <Save className="w-4 h-4" />
      </Button>

      {/* Delete button — only shown when a budget exists */}
      {currentLimit !== null && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive/80"
          onClick={handleDelete}
          disabled={isDeleting}
          title="Remover limite"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

export const BudgetManager = memo(function BudgetManager() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { toast } = useToast();
  const { budgets, fetchBudgets, upsertBudget, deleteBudget } = useBudgets();

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'saida')
        .or(`user_id.eq.${user.id},user_id.is.null`);

      if (error) throw error;
      setCategories((data as Category[]) ?? []);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as categorias.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadCategories();
      fetchBudgets();
    }
  }, [open, loadCategories, fetchBudgets]);

  const handleSave = useCallback(
    async (categoryId: string, limit: number) => {
      try {
        await upsertBudget(categoryId, limit);
        toast({
          title: 'Orçamento salvo!',
          description: 'O limite mensal foi atualizado.',
        });
      } catch {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar o orçamento.',
          variant: 'destructive',
        });
      }
    },
    [upsertBudget, toast]
  );

  const handleDelete = useCallback(
    async (categoryId: string) => {
      try {
        await deleteBudget(categoryId);
        toast({
          title: 'Orçamento removido',
          description: 'O limite desta categoria foi removido.',
        });
      } catch {
        toast({
          title: 'Erro',
          description: 'Não foi possível remover o orçamento.',
          variant: 'destructive',
        });
      }
    },
    [deleteBudget, toast]
  );

  const getBudgetLimit = (categoryId: string): number | null => {
    const budget = budgets.find((b) => b.category_id === categoryId);
    return budget ? budget.monthly_limit : null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 hover:bg-white/10 text-white gap-2"
        >
          <Target className="h-4 w-4" />
          Orçamentos
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Orçamentos por Categoria
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Defina um limite mensal (R$) para cada categoria de saída.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
          {loadingCategories ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Carregando categorias...
            </p>
          ) : categories.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma categoria de saída encontrada.
            </p>
          ) : (
            categories.map((cat) => (
              <CategoryBudgetRow
                key={cat.id}
                category={cat}
                currentLimit={getBudgetLimit(cat.id)}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
