import { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

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
    orb: 'bg-primary',
  },
  income: {
    container: 'glass glow-income border-income/20',
    icon: 'bg-income/20 text-income',
    value: 'text-income',
    orb: 'bg-income',
  },
  expense: {
    container: 'glass glow-expense border-expense/20',
    icon: 'bg-expense/20 text-expense',
    value: 'text-expense',
    orb: 'bg-expense',
  },
} as const;

export const StatCard = memo(function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant, 
  delay = 0 
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4 sm:p-6 border',
        'card-elevated-hover',
        styles.container
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className={cn(
            'text-xl sm:text-2xl lg:text-3xl font-bold font-mono truncate',
            styles.value
          )}>
            {formatCurrency(value)}
          </p>
        </div>
        <div className={cn('p-2 sm:p-3 rounded-lg shrink-0', styles.icon)}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* Decorative gradient orb */}
      <div 
        className={cn(
          'absolute -bottom-8 -right-8 w-20 sm:w-24 h-20 sm:h-24 rounded-full opacity-20 blur-2xl',
          styles.orb
        )}
        aria-hidden="true"
      />
    </motion.div>
  );
});
