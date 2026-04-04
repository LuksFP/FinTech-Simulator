import { addMonths, startOfMonth } from 'date-fns';
import type { RecurringTransaction } from '@/types/recurring';

/**
 * Calculates the estimated net monthly impact of all active recurring transactions.
 * Income is positive, expense is negative.
 */
export function calculateMonthlyImpact(recurring: RecurringTransaction[]): number {
  return recurring
    .filter((r) => r.is_active)
    .reduce((sum, r) => {
      const amount = r.type === 'entrada' ? r.amount : -r.amount;
      switch (r.frequency) {
        case 'monthly': return sum + amount;
        case 'weekly':  return sum + amount * 4.33;
        case 'daily':   return sum + amount * 30;
        case 'yearly':  return sum + amount / 12;
        default:        return sum;
      }
    }, 0);
}

/**
 * Generates forecast data points for a given number of months.
 */
export function generateForecastData(
  currentBalance: number,
  recurring: RecurringTransaction[],
  months = 6,
): { name: string; saldo: number }[] {
  const impact = calculateMonthlyImpact(recurring);
  const start = startOfMonth(new Date());
  return Array.from({ length: months + 1 }, (_, i) => ({
    name: i === 0 ? 'Hoje' : addMonths(start, i).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    saldo: Math.round((currentBalance + impact * i) * 100) / 100,
  }));
}
