import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { TOOLTIP_STYLES } from '@/lib/constants';

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

interface BalanceChartProps {
  data: ChartData[];
}

export const BalanceChart = memo(function BalanceChart({ data }: BalanceChartProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass rounded-xl p-4 sm:p-6 border border-border/50 h-[280px] sm:h-[320px] flex items-center justify-center"
      >
        <p className="text-muted-foreground text-center text-sm sm:text-base px-4">
          Adicione transações para visualizar o gráfico
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass rounded-xl p-4 sm:p-6 border border-border/50"
    >
      <h3 className="text-base sm:text-lg font-semibold mb-4">Entradas vs Saídas</h3>
      
      <div className="h-[220px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="75%"
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  className="drop-shadow-lg"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={TOOLTIP_STYLES}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-foreground text-xs sm:text-sm">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});
