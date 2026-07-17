import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { TOOLTIP_STYLES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { generateForecastData } from '@/lib/recurringCalculations';
import type { RecurringTransaction } from '@/types/recurring';

interface BalanceForecastProps {
  currentBalance: number;
  recurring: RecurringTransaction[];
}

export function BalanceForecast({ currentBalance, recurring }: BalanceForecastProps) {
  const data = useMemo(
    () => generateForecastData(currentBalance, recurring),
    [currentBalance, recurring],
  );

  const finalBalance = data[data.length - 1]?.saldo ?? 0;
  const isPositive = finalBalance >= currentBalance;
  const activeCount = useMemo(
    () => recurring.filter((r) => r.is_active).length,
    [recurring],
  );
  return (
    <div className="bg-muted/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            Previsão de Saldo (6 meses)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Baseado nos seus lançamentos recorrentes</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Em 6 meses</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(finalBalance)}
          </p>
        </div>
      </div>

      {activeCount === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Adicione lançamentos recorrentes para ver a previsão
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? 'hsl(var(--income))' : 'hsl(var(--expense))'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? 'hsl(var(--income))' : 'hsl(var(--expense))'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLES}
              labelStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }}
              formatter={(value: number) => [formatCurrency(value), 'Saldo previsto']}
            />
            <Area
              type="monotone"
              dataKey="saldo"
              stroke={isPositive ? 'hsl(var(--income))' : 'hsl(var(--expense))'}
              strokeWidth={2}
              fill="url(#forecastGradient)"
              dot={{ fill: isPositive ? 'hsl(var(--income))' : 'hsl(var(--expense))', r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
