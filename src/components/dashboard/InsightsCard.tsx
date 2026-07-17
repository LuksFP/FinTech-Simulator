import { useMemo, memo } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { generateInsights, type InsightTone } from '@/lib/insights';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types/transaction';

interface InsightsCardProps {
  transactions: Transaction[];
}

const TONE_CONFIG: Record<InsightTone, { icon: typeof Info; className: string }> = {
  warning: { icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/15' },
  negative: { icon: TrendingUp, className: 'text-red-400 bg-red-500/15' },
  positive: { icon: TrendingDown, className: 'text-emerald-400 bg-emerald-500/15' },
  neutral: { icon: Info, className: 'text-blue-400 bg-blue-500/15' },
};

export const InsightsCard = memo(function InsightsCard({ transactions }: InsightsCardProps) {
  const insights = useMemo(() => generateInsights(transactions), [transactions]);

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-3 mb-6 sm:mb-8">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        <h3 className="text-sm font-semibold">Insights do mês</h3>
      </div>

      <div className="space-y-2">
        {insights.map((insight) => {
          const { icon: Icon, className } = TONE_CONFIG[insight.tone];
          return (
            <div
              key={insight.id}
              className="flex items-start gap-3 rounded-lg bg-muted/40 p-3"
            >
              <span className={cn('rounded-full p-1.5 shrink-0 mt-0.5', className)}>
                <Icon className="w-3.5 h-3.5" />
              </span>
              <p className="text-sm text-foreground/80 leading-snug">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
});
