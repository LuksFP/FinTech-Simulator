import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { calculateMonthlyImpact, generateForecastData } from '@/lib/recurringCalculations';
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
  const monthlyDelta = useMemo(() => calculateMonthlyImpact(recurring), [recurring]);

  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            Previsão de Saldo (6 meses)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Baseado nos seus lançamentos recorrentes</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Em 6 meses</p>
          <p className={`text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(finalBalance)}
          </p>
        </div>
      </div>

      {activeCount === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
          Adicione lançamentos recorrentes para ver a previsão
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0', fontSize: 12 }}
              formatter={(value: number) => [formatCurrency(value), 'Saldo previsto']}
            />
            <Area
              type="monotone"
              dataKey="saldo"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              fill="url(#forecastGradient)"
              dot={{ fill: isPositive ? '#10b981' : '#ef4444', r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
