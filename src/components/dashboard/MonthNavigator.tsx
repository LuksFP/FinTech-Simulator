import { memo } from 'react';
import { ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMonthLabel, isCurrentMonth } from '@/lib/monthNav';
import { cn } from '@/lib/utils';

interface MonthNavigatorProps {
  month: Date;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void;
}

export const MonthNavigator = memo(function MonthNavigator({
  month,
  onPrevious,
  onNext,
  onReset,
}: MonthNavigatorProps) {
  const atCurrent = isCurrentMonth(month);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onPrevious}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <span
        className={cn(
          'min-w-[9.5rem] text-center text-sm font-medium capitalize select-none',
          atCurrent ? 'text-foreground' : 'text-primary',
        )}
        aria-live="polite"
      >
        {formatMonthLabel(month)}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onNext}
        disabled={atCurrent}
        aria-label="Próximo mês"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {!atCurrent && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onReset}
        >
          <Undo2 className="w-3.5 h-3.5" />
          Mês atual
        </Button>
      )}
    </div>
  );
});
