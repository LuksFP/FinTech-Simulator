import {
  startOfMonth, endOfMonth, subMonths, addMonths,
  isWithinInterval, isSameMonth, isAfter, parseISO, format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction } from '@/types/transaction';

export interface MonthSummary {
  /** Entradas do mês de referência */
  income: number;
  /** Saídas do mês de referência */
  expense: number;
  /** Saldo do mês (income - expense) */
  monthBalance: number;
  /** Saldo acumulado desde o início até o FIM do mês de referência */
  cumulativeBalance: number;
  /** Variação % das entradas vs mês anterior (0 quando mês anterior zerado) */
  incomeChange: number;
  /** Variação % das saídas vs mês anterior (0 quando mês anterior zerado) */
  expenseChange: number;
  transactionCount: number;
}

/** Transações cuja data cai dentro do mês de `ref`. */
export function filterByMonth(transactions: Transaction[], ref: Date): Transaction[] {
  const interval = { start: startOfMonth(ref), end: endOfMonth(ref) };
  return transactions.filter((t) => isWithinInterval(parseISO(t.date), interval));
}

function totals(transactions: Transaction[]): { income: number; expense: number } {
  return transactions.reduce(
    (acc, t) => {
      if (t.type === 'entrada') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

function percentChange(current: number, previous: number): number {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

/** Resumo financeiro do mês de `ref`, com comparativo contra o mês anterior. */
export function getMonthSummary(transactions: Transaction[], ref: Date): MonthSummary {
  const monthTx = filterByMonth(transactions, ref);
  const { income, expense } = totals(monthTx);

  const prev = totals(filterByMonth(transactions, subMonths(ref, 1)));

  const end = endOfMonth(ref);
  const untilEnd = totals(transactions.filter((t) => !isAfter(parseISO(t.date), end)));

  return {
    income,
    expense,
    monthBalance: income - expense,
    cumulativeBalance: untilEnd.income - untilEnd.expense,
    incomeChange: percentChange(income, prev.income),
    expenseChange: percentChange(expense, prev.expense),
    transactionCount: monthTx.length,
  };
}

/** true quando `ref` está no mesmo mês/ano de `now`. */
export function isCurrentMonth(ref: Date, now = new Date()): boolean {
  return isSameMonth(ref, now);
}

/** Mês seguinte, limitado ao mês atual (não navega para o futuro). */
export function nextMonth(ref: Date, now = new Date()): Date {
  if (isCurrentMonth(ref, now)) return startOfMonth(ref);
  return startOfMonth(addMonths(ref, 1));
}

export function previousMonth(ref: Date): Date {
  return startOfMonth(subMonths(ref, 1));
}

/** Rótulo "julho de 2026" para o cabeçalho do navegador de meses. */
export function formatMonthLabel(ref: Date): string {
  return format(ref, "MMMM 'de' yyyy", { locale: ptBR });
}
