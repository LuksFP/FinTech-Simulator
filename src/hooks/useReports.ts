import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction } from '@/types/transaction';

interface CategoryStats {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
  count: number;
}

interface MonthlyComparison {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  balance: number;
}

export function useReports(transactions: Transaction[]) {
  // Get transactions by month
  const getTransactionsByMonth = useMemo(() => {
    return (year: number, month: number) => {
      const start = startOfMonth(new Date(year, month));
      const end = endOfMonth(new Date(year, month));
      
      return transactions.filter(t => {
        const date = parseISO(t.date);
        return isWithinInterval(date, { start, end });
      });
    };
  }, [transactions]);

  // Category breakdown for expenses
  const expensesByCategory = useMemo((): CategoryStats[] => {
    const expenses = transactions.filter(t => t.type === 'saida');
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryMap = new Map<string, CategoryStats>();
    
    expenses.forEach(t => {
      const catId = t.category_id || 'uncategorized';
      const existing = categoryMap.get(catId);
      
      if (existing) {
        existing.total += t.amount;
        existing.count += 1;
      } else {
        categoryMap.set(catId, {
          id: catId,
          name: t.category?.name || 'Sem categoria',
          color: t.category?.color || '#6b7280',
          icon: t.category?.icon || 'Package',
          total: t.amount,
          percentage: 0,
          count: 1,
        });
      }
    });
    
    const result = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: total > 0 ? (cat.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
    
    return result;
  }, [transactions]);

  // Category breakdown for income
  const incomeByCategory = useMemo((): CategoryStats[] => {
    const income = transactions.filter(t => t.type === 'entrada');
    const total = income.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryMap = new Map<string, CategoryStats>();
    
    income.forEach(t => {
      const catId = t.category_id || 'uncategorized';
      const existing = categoryMap.get(catId);
      
      if (existing) {
        existing.total += t.amount;
        existing.count += 1;
      } else {
        categoryMap.set(catId, {
          id: catId,
          name: t.category?.name || 'Sem categoria',
          color: t.category?.color || '#6b7280',
          icon: t.category?.icon || 'Package',
          total: t.amount,
          percentage: 0,
          count: 1,
        });
      }
    });
    
    const result = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: total > 0 ? (cat.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
    
    return result;
  }, [transactions]);

  // Monthly comparison (last 6 months)
  const monthlyComparison = useMemo((): MonthlyComparison[] => {
    const months: MonthlyComparison[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthTransactions = getTransactionsByMonth(date.getFullYear(), date.getMonth());
      
      const income = monthTransactions
        .filter(t => t.type === 'entrada')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = monthTransactions
        .filter(t => t.type === 'saida')
        .reduce((sum, t) => sum + t.amount, 0);
      
      months.push({
        month: format(date, 'yyyy-MM'),
        monthLabel: format(date, 'MMM', { locale: ptBR }),
        income,
        expense,
        balance: income - expense,
      });
    }
    
    return months;
  }, [getTransactionsByMonth]);

  // Current month stats
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const monthTransactions = getTransactionsByMonth(now.getFullYear(), now.getMonth());
    
    const income = monthTransactions
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = monthTransactions
      .filter(t => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: monthTransactions.length,
    };
  }, [getTransactionsByMonth]);

  // Previous month comparison
  const previousMonthComparison = useMemo(() => {
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    const prevTransactions = getTransactionsByMonth(prevMonth.getFullYear(), prevMonth.getMonth());
    
    const prevIncome = prevTransactions
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const prevExpense = prevTransactions
      .filter(t => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const incomeChange = prevIncome > 0 
      ? ((currentMonthStats.income - prevIncome) / prevIncome) * 100 
      : 0;
    
    const expenseChange = prevExpense > 0 
      ? ((currentMonthStats.expense - prevExpense) / prevExpense) * 100 
      : 0;
    
    return {
      incomeChange,
      expenseChange,
      prevIncome,
      prevExpense,
    };
  }, [getTransactionsByMonth, currentMonthStats]);

  return {
    expensesByCategory,
    incomeByCategory,
    monthlyComparison,
    currentMonthStats,
    previousMonthComparison,
  };
}
