import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, ArrowUpDown, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { FilterType, SortType, PeriodType } from '@/types/transaction';
import type { DateRange } from 'react-day-picker';

interface TransactionFiltersProps {
  filter: FilterType;
  sort: SortType;
  period: PeriodType;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onPeriodChange: (period: PeriodType) => void;
  onCustomDateChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

const periodLabels: Record<PeriodType, string> = {
  all: 'Todo período',
  '7days': 'Últimos 7 dias',
  '30days': 'Últimos 30 dias',
  thisMonth: 'Este mês',
  lastMonth: 'Mês anterior',
  custom: 'Personalizado',
};

export const TransactionFilters = memo(function TransactionFilters({
  filter,
  sort,
  period,
  customDateRange,
  onFilterChange,
  onSortChange,
  onPeriodChange,
  onCustomDateChange,
}: TransactionFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePeriodChange = (value: PeriodType) => {
    onPeriodChange(value);
    if (value === 'custom') {
      setCalendarOpen(true);
    }
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    onCustomDateChange({
      from: range?.from,
      to: range?.to,
    });
    if (range?.from && range?.to) {
      setCalendarOpen(false);
    }
  };

  const getDateRangeLabel = () => {
    if (period === 'custom' && customDateRange.from) {
      if (customDateRange.to) {
        return `${format(customDateRange.from, 'dd/MM', { locale: ptBR })} - ${format(customDateRange.to, 'dd/MM', { locale: ptBR })}`;
      }
      return format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR });
    }
    return periodLabels[period];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-2 sm:gap-3"
    >
      {/* Period Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <div>
              <Select 
                value={period} 
                onValueChange={(v) => handlePeriodChange(v as PeriodType)}
              >
                <SelectTrigger className="w-[130px] sm:w-[150px] bg-secondary/50 border-border/50 text-xs sm:text-sm">
                  <SelectValue>{getDateRangeLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="thisMonth">Este mês</SelectItem>
                  <SelectItem value="lastMonth">Mês anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverTrigger>
          {period === 'custom' && (
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={customDateRange.from}
                selected={{
                  from: customDateRange.from,
                  to: customDateRange.to,
                }}
                onSelect={handleDateSelect}
                numberOfMonths={1}
                locale={ptBR}
              />
            </PopoverContent>
          )}
        </Popover>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
        <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
          <SelectTrigger className="w-[100px] sm:w-[120px] bg-secondary/50 border-border/50 text-xs sm:text-sm">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortType)}>
          <SelectTrigger className="w-[110px] sm:w-[140px] bg-secondary/50 border-border/50 text-xs sm:text-sm">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Data ↓</SelectItem>
            <SelectItem value="date-asc">Data ↑</SelectItem>
            <SelectItem value="amount-desc">Valor ↓</SelectItem>
            <SelectItem value="amount-asc">Valor ↑</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
});
