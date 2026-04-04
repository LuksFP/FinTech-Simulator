import { useEffect, useState, useCallback, memo } from 'react';
import { Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { useBudgets } from '@/hooks/useBudgets';
import type { Transaction, Category } from '@/types/transaction';

interface BudgetProgressProps {
  transactions: Transaction[];
}

interface BudgetRow {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  spent: number;
  percentage: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getBarColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-400';
  return 'bg-emerald-500';
}

export const BudgetProgress = memo(function BudgetProgress({
  transactions,
}: BudgetProgressProps) {
  const { budgets, isLoading } = useBudgets();
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = useCallback(async () => {
    if (budgets.length === 0) return;

    const categoryIds = budgets.map((b) => b.category_id);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .in('id', categoryIds);

    setCategories((data as Category[]) ?? []);
  }, [budgets]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const rows: BudgetRow[] = budgets
    .map((budget) => {
      const category = categories.find((c) => c.id === budget.category_id);
      if (!category) return null;

      const spent = transactions
        .filter((t) => {
          if (t.type !== 'saida') return false;
          if (t.category_id !== budget.category_id) return false;
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = budget.monthly_limit > 0
        ? Math.min((spent / budget.monthly_limit) * 100, 100)
        : 0;

      return {
        categoryId: budget.category_id,
        categoryName: category.name,
        categoryColor: category.color,
        monthlyLimit: budget.monthly_limit,
        spent,
        percentage,
      } satisfies BudgetRow;
    })
    .filter((r): r is BudgetRow => r !== null)
    .sort((a, b) => b.percentage - a.percentage);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-muted-foreground text-center py-4">
          Carregando orçamentos...
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Orçamentos do Mês</h3>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.categoryId} className="space-y-1.5">
            {/* Header row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: row.categoryColor }}
                />
                <span className="font-medium truncate max-w-[140px]">
                  {row.categoryName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                <span>
                  {formatCurrency(row.spent)}{' '}
                  <span className="text-muted-foreground/60">
                    / {formatCurrency(row.monthlyLimit)}
                  </span>
                </span>
                <span
                  className={
                    row.percentage >= 90
                      ? 'text-red-400 font-semibold'
                      : row.percentage >= 70
                      ? 'text-yellow-400 font-semibold'
                      : 'text-emerald-400'
                  }
                >
                  {row.percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Progress bar — override the indicator colour via a wrapper */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${getBarColor(row.percentage)}`}
                style={{ width: `${row.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
