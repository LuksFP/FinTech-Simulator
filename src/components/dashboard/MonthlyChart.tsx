import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, startOfMonth, eachDayOfInterval, endOfMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrencyCompact } from '@/lib/formatters';
import { CHART_COLORS, TOOLTIP_STYLES } from '@/lib/constants';
import type { Transaction } from '@/types/transaction';

interface MonthlyChartProps {
  transactions: Transaction[];
}

const LEGEND_LABELS: Record<string, string> = {
  saldo: 'Saldo',
  entradas: 'Entradas',
  saidas: 'Saídas',
};

export const MonthlyChart = memo(function MonthlyChart({ transactions }: MonthlyChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate initial balance from transactions before this month
    let runningBalance = transactions.reduce((balance, t) => {
      const transactionDate = new Date(t.date);
      if (transactionDate < monthStart) {
        return balance + (t.type === 'entrada' ? t.amount : -t.amount);
      }
      return balance;
    }, 0);

    return days.map((day) => {
      const dayTransactions = transactions.filter((t) =>
        isSameDay(new Date(t.date), day)
      );

      // Update running balance for this day
      dayTransactions.forEach((t) => {
        runningBalance += t.type === 'entrada' ? t.amount : -t.amount;
      });

      const income = dayTransactions
        .filter((t) => t.type === 'entrada')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = dayTransactions
        .filter((t) => t.type === 'saida')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        date: format(day, 'dd', { locale: ptBR }),
        fullDate: format(day, "dd 'de' MMMM", { locale: ptBR }),
        saldo: runningBalance,
        entradas: income,
        saidas: expense,
      };
    });
  }, [transactions]);

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl p-4 sm:p-6 border border-border/50"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Evolução do Saldo</h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 capitalize">{currentMonth}</p>

      <div className="h-[250px] sm:h-[300px] -ml-2 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.grid}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke={CHART_COLORS.text}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={CHART_COLORS.text}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrencyCompact}
              width={60}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLES}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
              formatter={(value: number, name: string) => [
                formatCurrencyCompact(value),
                LEGEND_LABELS[name] || name,
              ]}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-foreground text-xs sm:text-sm">
                  {LEGEND_LABELS[value] || value}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.primary }}
            />
            <Line
              type="monotone"
              dataKey="entradas"
              stroke={CHART_COLORS.income}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 3, fill: CHART_COLORS.income }}
            />
            <Line
              type="monotone"
              dataKey="saidas"
              stroke={CHART_COLORS.expense}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 3, fill: CHART_COLORS.expense }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});
