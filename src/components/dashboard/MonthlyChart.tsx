import { useMemo } from 'react';
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
import type { Transaction } from '@/types/transaction';

interface MonthlyChartProps {
  transactions: Transaction[];
}

export function MonthlyChart({ transactions }: MonthlyChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let runningBalance = 0;

    // Calculate initial balance from transactions before this month
    transactions.forEach((t) => {
      const transactionDate = new Date(t.date);
      if (transactionDate < monthStart) {
        runningBalance += t.type === 'entrada' ? t.amount : -t.amount;
      }
    });

    return days.map((day) => {
      // Add transactions for this day
      transactions.forEach((t) => {
        const transactionDate = new Date(t.date);
        if (isSameDay(transactionDate, day)) {
          runningBalance += t.type === 'entrada' ? t.amount : -t.amount;
        }
      });

      const dayTransactions = transactions.filter((t) =>
        isSameDay(new Date(t.date), day)
      );

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl p-6 border border-border/50"
    >
      <h3 className="text-lg font-semibold mb-2">Evolução do Saldo</h3>
      <p className="text-sm text-muted-foreground mb-4 capitalize">{currentMonth}</p>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(222 30% 18%)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="hsl(215 20% 65%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(215 20% 65%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222 47% 10%)',
                border: '1px solid hsl(222 30% 18%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 98%)',
              }}
              labelFormatter={(_, payload) => {
                if (payload?.[0]?.payload?.fullDate) {
                  return payload[0].payload.fullDate;
                }
                return '';
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  saldo: 'Saldo',
                  entradas: 'Entradas',
                  saidas: 'Saídas',
                };
                return [formatCurrency(value), labels[name] || name];
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  saldo: 'Saldo',
                  entradas: 'Entradas',
                  saidas: 'Saídas',
                };
                return <span className="text-foreground text-sm">{labels[value] || value}</span>;
              }}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke="hsl(186 72% 50%)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: 'hsl(186 72% 50%)' }}
            />
            <Line
              type="monotone"
              dataKey="entradas"
              stroke="hsl(160 84% 39%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(160 84% 39%)' }}
            />
            <Line
              type="monotone"
              dataKey="saidas"
              stroke="hsl(0 72% 51%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(0 72% 51%)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
