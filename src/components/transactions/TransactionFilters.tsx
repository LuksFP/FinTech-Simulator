import { motion } from 'framer-motion';
import { Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterType, SortType } from '@/types/transaction';

interface TransactionFiltersProps {
  filter: FilterType;
  sort: SortType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
}

export function TransactionFilters({
  filter,
  sort,
  onFilterChange,
  onSortChange,
}: TransactionFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-3"
    >
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterType)}>
          <SelectTrigger className="w-[140px] bg-secondary/50 border-border/50">
            <SelectValue placeholder="Filtrar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortType)}>
          <SelectTrigger className="w-[160px] bg-secondary/50 border-border/50">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Data (recente)</SelectItem>
            <SelectItem value="date-asc">Data (antiga)</SelectItem>
            <SelectItem value="amount-desc">Valor (maior)</SelectItem>
            <SelectItem value="amount-asc">Valor (menor)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}
