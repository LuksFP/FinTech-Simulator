import { memo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface CategoryStats {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
  count: number;
}

interface CategoryChartProps {
  data: CategoryStats[];
  title: string;
  type: 'income' | 'expense';
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(data.total)} ({formatPercent(data.percentage)})
        </p>
        <p className="text-xs text-muted-foreground">
          {data.count} transação(ões)
        </p>
      </div>
    );
  }
  return null;
};

export const CategoryChart = memo(function CategoryChart({ data, title, type }: CategoryChartProps) {
  const total = data.reduce((sum, cat) => sum + cat.total, 0);

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-4 sm:p-6 border border-border/50"
      >
        <h3 className="text-base sm:text-lg font-semibold mb-4">{title}</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma {type === 'expense' ? 'despesa' : 'receita'} registrada</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 sm:p-6 border border-border/50"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-4">{title}</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="total"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {data.slice(0, 8).map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="p-1.5 rounded shrink-0"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" style={{ color: cat.color }} />
                </div>
                <span className="text-sm truncate">{cat.name}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className={cn(
                  'text-sm font-mono font-medium',
                  type === 'income' ? 'text-income' : 'text-expense'
                )}>
                  {formatCurrency(cat.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(cat.percentage)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className={cn(
            'font-mono font-semibold text-lg',
            type === 'income' ? 'text-income' : 'text-expense'
          )}>
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
