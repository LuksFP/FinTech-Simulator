import { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Target, Edit2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, getMonthName } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { FinancialGoal } from '@/types/transaction';

interface GoalCardProps {
  goal: FinancialGoal | null;
  currentSavings: number;
  onUpdateGoal: (amount: number) => Promise<void>;
  delay?: number;
}

export const GoalCard = memo(function GoalCard({ 
  goal, 
  currentSavings, 
  onUpdateGoal, 
  delay = 0 
}: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(goal?.target_amount?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);

  const targetAmount = goal?.target_amount || 0;
  const progress = targetAmount > 0 ? Math.min((currentSavings / targetAmount) * 100, 100) : 0;
  const isGoalReached = currentSavings >= targetAmount && targetAmount > 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const handleStartEditing = useCallback(() => {
    setAmount(goal?.target_amount?.toString() || '');
    setIsEditing(true);
  }, [goal?.target_amount]);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setAmount(goal?.target_amount?.toString() || '');
  }, [goal?.target_amount]);

  const handleSave = useCallback(async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;

    try {
      setIsLoading(true);
      await onUpdateGoal(value);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  }, [amount, onUpdateGoal]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  }, [handleSave, handleCancelEditing]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'glass rounded-xl p-4 sm:p-6 border transition-all duration-300',
        isGoalReached
          ? 'border-income/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
          : 'border-border/50'
      )}
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className={cn(
            'p-2 rounded-lg shrink-0',
            isGoalReached ? 'bg-income/20' : 'bg-primary/20'
          )}>
            <Target className={cn(
              'w-4 h-4 sm:w-5 sm:h-5',
              isGoalReached ? 'text-income' : 'text-primary'
            )} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">Meta de Economia</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {getMonthName(currentMonth)} {currentYear}
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStartEditing}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Editar meta"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Valor da meta"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-secondary/50 border-border/50 font-mono"
              autoFocus
            />
            <Button
              onClick={handleSave}
              disabled={isLoading}
              size="icon"
              className="bg-income hover:bg-income/90 shrink-0"
              aria-label="Salvar meta"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={handleCancelEditing}
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Cancelar edição"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {targetAmount > 0 ? (
            <>
              <div className="flex justify-between items-end gap-4">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Economizado</p>
                  <p className={cn(
                    'text-lg sm:text-2xl font-bold font-mono truncate',
                    currentSavings >= 0 ? 'text-income' : 'text-expense'
                  )}>
                    {formatCurrency(Math.max(currentSavings, 0))}
                  </p>
                </div>
                <div className="text-right min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Meta</p>
                  <p className="text-base sm:text-lg font-semibold font-mono truncate">
                    {formatCurrency(targetAmount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Progress
                  value={progress}
                  className={cn(
                    'h-2 sm:h-3',
                    isGoalReached ? '[&>div]:bg-income' : '[&>div]:bg-primary'
                  )}
                />
                <div className="flex justify-between text-xs sm:text-sm flex-wrap gap-1">
                  <span className="text-muted-foreground">
                    {progress.toFixed(1)}% concluído
                  </span>
                  {isGoalReached && (
                    <span className="text-income font-medium">
                      🎉 Meta atingida!
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-3 text-sm">
                Defina uma meta de economia para este mês
              </p>
              <Button
                onClick={handleStartEditing}
                variant="outline"
                className="gap-2"
              >
                <Target className="w-4 h-4" />
                Definir Meta
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});
