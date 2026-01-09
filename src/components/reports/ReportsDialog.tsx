import { memo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryChart } from './CategoryChart';
import { MonthlyComparisonChart } from './MonthlyComparisonChart';
import { useReports } from '@/hooks/useReports';
import type { Transaction } from '@/types/transaction';

interface ReportsDialogProps {
  transactions: Transaction[];
}

export const ReportsDialog = memo(function ReportsDialog({ transactions }: ReportsDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    expensesByCategory,
    incomeByCategory,
    monthlyComparison,
    currentMonthStats,
    previousMonthComparison,
  } = useReports(transactions);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden sm:inline">Relatórios</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Relatórios Mensais
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="comparison">Comparativo</TabsTrigger>
              <TabsTrigger value="expenses">Despesas</TabsTrigger>
              <TabsTrigger value="income">Receitas</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              <MonthlyComparisonChart
                data={monthlyComparison}
                currentMonthStats={currentMonthStats}
                previousMonthComparison={previousMonthComparison}
              />
            </TabsContent>

            <TabsContent value="expenses">
              <CategoryChart
                data={expensesByCategory}
                title="Despesas por Categoria"
                type="expense"
              />
            </TabsContent>

            <TabsContent value="income">
              <CategoryChart
                data={incomeByCategory}
                title="Receitas por Categoria"
                type="income"
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
});
