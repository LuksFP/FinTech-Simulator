import { useMemo, memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { TOOLTIP_STYLES } from '@/lib/constants';
import type { Transaction } from '@/types/transaction';

interface CategoryPieChartProps {
  transactions: Transaction[];
}

const VIBRANT_COLORS = [
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
];

interface PieEntry {
  name: string;
  value: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry: PieEntry = payload[0].payload;
    return (
      <div
        className="rounded-lg p-3 shadow-lg text-sm"
        style={TOOLTIP_STYLES}
      >
        <p className="font-medium mb-1">{entry.name}</p>
        <p className="text-slate-300">{formatCurrency(entry.value)}</p>
      </div>
    );
  }
  return null;
};

const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 px-2">
      {payload.map((item: any, index: number) => (
        <li key={index} className="flex items-center gap-1.5 text-xs text-slate-300">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          {item.value}
        </li>
      ))}
    </ul>
  );
};

export const CategoryPieChart = memo(function CategoryPieChart({
  transactions,
}: CategoryPieChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };

    const currentMonthExpenses = transactions.filter(
      (t) =>
        t.type === 'saida' &&
        isWithinInterval(new Date(t.date), interval)
    );

    const grouped: Record<string, number> = {};
    for (const t of currentMonthExpenses) {
      const key = t.category?.name ?? 'Sem categoria';
      grouped[key] = (grouped[key] ?? 0) + t.amount;
    }

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h3 className="text-base font-semibold text-white mb-4">Gastos por Categoria</h3>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          Sem dados
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                outerRadius={90}
                innerRadius={48}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});
