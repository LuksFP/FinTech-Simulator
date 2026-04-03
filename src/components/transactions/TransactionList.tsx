import { memo, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Download, FileSpreadsheet, FileText, ChevronDown, Search, X } from 'lucide-react';
import { TransactionItem } from './TransactionItem';
import { TransactionFilters } from './TransactionFilters';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportTransactionsToCSV, exportTransactionsToExcel, exportTransactionsToPDF } from '@/lib/csvExport';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import type { Transaction, TransactionFormData, FilterType, SortType, PeriodType } from '@/types/transaction';

interface TransactionListProps {
  transactions: Transaction[];
  filter: FilterType;
  sort: SortType;
  period: PeriodType;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onPeriodChange: (period: PeriodType) => void;
  onCustomDateChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: TransactionFormData) => Promise<void>;
  isLoading: boolean;
}

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="glass rounded-xl p-4 sm:p-6 border border-border/50">
      <div className="animate-pulse space-y-3 sm:space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 sm:h-16 bg-secondary/50 rounded-lg" />
        ))}
      </div>
    </div>
  );
});

const EmptyState = memo(function EmptyState({ filter }: { filter: FilterType }) {
  return (
    <div className="py-8 sm:py-12 text-center">
      <Receipt className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground text-sm sm:text-base">
        {filter === 'all'
          ? 'Nenhuma transação encontrada'
          : `Nenhuma ${filter === 'entrada' ? 'entrada' : 'saída'} encontrada`}
      </p>
    </div>
  );
});

export const TransactionList = memo(function TransactionList({
  transactions,
  filter,
  sort,
  period,
  customDateRange,
  onFilterChange,
  onSortChange,
  onPeriodChange,
  onCustomDateChange,
  onDelete,
  onUpdate,
  isLoading,
}: TransactionListProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t => t.description.toLowerCase().includes(q));
  }, [transactions, search]);

  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'pdf') => {
    setIsExporting(true);
    try {
      switch (format) {
        case 'csv':
          exportTransactionsToCSV(transactions);
          break;
        case 'xlsx':
          await exportTransactionsToExcel(transactions);
          break;
        case 'pdf':
          await exportTransactionsToPDF(transactions);
          break;
      }
      toast({ title: 'Exportado!', description: `Arquivo ${format.toUpperCase()} gerado com sucesso.` });
    } catch {
      toast({ title: 'Erro', description: 'Falha ao exportar.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }, [transactions, toast]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl p-4 sm:p-6 border border-border/50"
    >
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold">Transações</h3>
            {transactions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exportar</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <TransactionFilters
          filter={filter}
          sort={sort}
          period={period}
          customDateRange={customDateRange}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
          onPeriodChange={onPeriodChange}
          onCustomDateChange={onCustomDateChange}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-9 bg-secondary/50 border-border/50 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredTransactions.map((transaction, index) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                index={index}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
});
