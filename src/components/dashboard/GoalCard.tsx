import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Edit2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export function GoalCard({ goal, currentSavings, onUpdateGoal, delay = 0 }: GoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(goal?.target_amount?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const targetAmount = goal?.target_amount || 0;
  const progress = targetAmount > 0 ? Math.min((currentSavings / targetAmount) * 100, 100) : 0;
  const isGoalReached = currentSavings >= targetAmount && targetAmount > 0;

  const handleSave = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;

    try {
      setIsLoading(true);
      await onUpdateGoal(value);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'glass rounded-xl p-6 border transition-all duration-300',
        isGoalReached
          ? 'border-income/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
          : 'border-border/50'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            isGoalReached ? 'bg-income/20' : 'bg-primary/20'
          )}>
            <Target className={cn(
              'w-5 h-5',
              isGoalReached ? 'text-income' : 'text-primary'
            )} />
          </div>
          <div>
            <h3 className="font-semibold">Meta de Economia</h3>
            <p className="text-sm text-muted-foreground">
              {monthNames[currentMonth]} {currentYear}
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setAmount(goal?.target_amount?.toString() || '');
              setIsEditing(true);
            }}
            className="text-muted-foreground hover:text-foreground"
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
              className="bg-secondary/50 border-border/50 font-mono"
            />
            <Button
              onClick={handleSave}
              disabled={isLoading}
              size="icon"
              className="bg-income hover:bg-income/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              variant="ghost"
              size="icon"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {targetAmount > 0 ? (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm text-muted-foreground">Economizado</p>
                  <p className={cn(
                    'text-2xl font-bold font-mono',
                    currentSavings >= 0 ? 'text-income' : 'text-expense'
                  )}>
                    {formatCurrency(Math.max(currentSavings, 0))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Meta</p>
                  <p className="text-lg font-semibold font-mono">
                    {formatCurrency(targetAmount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Progress
                  value={progress}
                  className={cn(
                    'h-3',
                    isGoalReached ? '[&>div]:bg-income' : '[&>div]:bg-primary'
                  )}
                />
                <div className="flex justify-between text-sm">
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
              <p className="text-muted-foreground mb-2">
                Defina uma meta de economia para este mês
              </p>
              <Button
                onClick={() => setIsEditing(true)}
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
}
