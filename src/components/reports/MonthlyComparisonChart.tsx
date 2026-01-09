import { memo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MonthlyComparison {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  balance: number;
}

interface MonthlyComparisonChartProps {
  data: MonthlyComparison[];
  currentMonthStats: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
  previousMonthComparison: {
    incomeChange: number;
    expenseChange: number;
    prevIncome: number;
    prevExpense: number;
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium capitalize mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const MonthlyComparisonChart = memo(function MonthlyComparisonChart({
  data,
  currentMonthStats,
  previousMonthComparison,
}: MonthlyComparisonChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 sm:p-6 border border-border/50"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-4">Comparativo Mensal</h3>

      {/* Current Month Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-income/10 border border-income/20">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="font-mono font-semibold text-income">{formatCurrency(currentMonthStats.income)}</p>
          {previousMonthComparison.incomeChange !== 0 && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              previousMonthComparison.incomeChange > 0 ? 'text-income' : 'text-expense'
            )}>
              {previousMonthComparison.incomeChange > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{formatPercent(Math.abs(previousMonthComparison.incomeChange))}</span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-expense/10 border border-expense/20">
          <p className="text-xs text-muted-foreground">Saídas</p>
          <p className="font-mono font-semibold text-expense">{formatCurrency(currentMonthStats.expense)}</p>
          {previousMonthComparison.expenseChange !== 0 && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              previousMonthComparison.expenseChange < 0 ? 'text-income' : 'text-expense'
            )}>
              {previousMonthComparison.expenseChange < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span>{formatPercent(Math.abs(previousMonthComparison.expenseChange))}</span>
            </div>
          )}
        </div>

        <div className={cn(
          'p-3 rounded-lg border',
          currentMonthStats.balance >= 0 
            ? 'bg-income/10 border-income/20' 
            : 'bg-expense/10 border-expense/20'
        )}>
          <p className="text-xs text-muted-foreground">Saldo do Mês</p>
          <p className={cn(
            'font-mono font-semibold',
            currentMonthStats.balance >= 0 ? 'text-income' : 'text-expense'
          )}>
            {formatCurrency(currentMonthStats.balance)}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
          <p className="text-xs text-muted-foreground">Transações</p>
          <p className="font-mono font-semibold">{currentMonthStats.transactionCount}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="monthLabel" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
            <Bar 
              dataKey="income" 
              name="Entradas" 
              fill="hsl(160 84% 39%)" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="expense" 
              name="Saídas" 
              fill="hsl(0 72% 51%)" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});
