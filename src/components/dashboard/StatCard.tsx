import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: 'balance' | 'income' | 'expense';
  delay?: number;
}

const variantStyles = {
  balance: {
    container: 'glass glow-primary border-primary/20',
    icon: 'bg-primary/20 text-primary',
    value: 'text-gradient-primary',
  },
  income: {
    container: 'glass glow-income border-income/20',
    icon: 'bg-income/20 text-income',
    value: 'text-income',
  },
  expense: {
    container: 'glass glow-expense border-expense/20',
    icon: 'bg-expense/20 text-expense',
    value: 'text-expense',
  },
};

export function StatCard({ title, value, icon: Icon, variant, delay = 0 }: StatCardProps) {
  const styles = variantStyles[variant];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'relative overflow-hidden rounded-xl p-6 border',
        'card-elevated-hover',
        styles.container
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-2xl md:text-3xl font-bold font-mono', styles.value)}>
            {formatCurrency(value)}
          </p>
        </div>
        <div className={cn('p-3 rounded-lg', styles.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Decorative gradient orb */}
      <div 
        className={cn(
          'absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl',
          variant === 'balance' && 'bg-primary',
          variant === 'income' && 'bg-income',
          variant === 'expense' && 'bg-expense'
        )}
      />
    </motion.div>
  );
}
