import { getDate, getDaysInMonth, parseISO, subMonths, format } from 'date-fns';
import { formatCurrency } from './formatters';
import type { Transaction } from '@/types/transaction';

// ---------------------------------------------------------------------------
// Insights automáticos do dashboard.
//
// Comparações de categoria usam "mês atual até hoje" vs "mesmo período do mês
// anterior" (dias 1..N nos dois), senão o mês parcial sempre parece menor.
// ---------------------------------------------------------------------------

export type InsightTone = 'positive' | 'negative' | 'warning' | 'neutral';

export interface Insight {
  id: string;
  tone: InsightTone;
  text: string;
}

/** Gasto mínimo (R$) numa categoria para a variação ser relevante */
const MIN_CATEGORY_AMOUNT = 50;
/** Variação mínima (%) para virar insight */
const MIN_CHANGE_PCT = 20;
/** Dias decorridos mínimos para projetar o fim do mês sem ruído */
const MIN_DAYS_FOR_PROJECTION = 5;

const TONE_PRIORITY: Record<InsightTone, number> = {
  warning: 0,
  negative: 1,
  positive: 2,
  neutral: 3,
};

interface CategoryTotals {
  name: string;
  current: number;
  previous: number;
}

function sameMonth(date: Date, ref: Date): boolean {
  return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth();
}

export function generateInsights(transactions: Transaction[], today: Date = new Date()): Insight[] {
  const insights: Insight[] = [];
  const dayOfMonth = getDate(today);
  const prevMonthRef = subMonths(today, 1);

  let currentExpense = 0;
  let currentIncome = 0;
  let prevExpenseSamePeriod = 0;
  let prevExpenseFullMonth = 0;
  let topExpense: Transaction | null = null;

  const byCategory = new Map<string, CategoryTotals>();

  for (const t of transactions) {
    const date = parseISO(t.date);

    if (sameMonth(date, today) && getDate(date) <= dayOfMonth) {
      if (t.type === 'entrada') {
        currentIncome += t.amount;
      } else {
        currentExpense += t.amount;
        if (!topExpense || t.amount > topExpense.amount) topExpense = t;

        const key = t.category_id ?? 'uncategorized';
        const entry = byCategory.get(key) ?? {
          name: t.category?.name ?? 'Sem categoria',
          current: 0,
          previous: 0,
        };
        entry.current += t.amount;
        byCategory.set(key, entry);
      }
    }

    if (sameMonth(date, prevMonthRef) && t.type === 'saida') {
      prevExpenseFullMonth += t.amount;
      if (getDate(date) <= dayOfMonth) {
        prevExpenseSamePeriod += t.amount;

        const key = t.category_id ?? 'uncategorized';
        const entry = byCategory.get(key) ?? {
          name: t.category?.name ?? 'Sem categoria',
          current: 0,
          previous: 0,
        };
        entry.previous += t.amount;
        byCategory.set(key, entry);
      }
    }
  }

  // --- Variação por categoria (maior alta e maior queda) --------------------
  let biggestIncrease: (CategoryTotals & { pct: number }) | null = null;
  let biggestDecrease: (CategoryTotals & { pct: number }) | null = null;

  for (const entry of byCategory.values()) {
    if (Math.max(entry.current, entry.previous) < MIN_CATEGORY_AMOUNT || entry.previous === 0) continue;
    const pct = ((entry.current - entry.previous) / entry.previous) * 100;

    if (pct >= MIN_CHANGE_PCT && (!biggestIncrease || pct > biggestIncrease.pct)) {
      biggestIncrease = { ...entry, pct };
    }
    if (pct <= -MIN_CHANGE_PCT && (!biggestDecrease || pct < biggestDecrease.pct)) {
      biggestDecrease = { ...entry, pct };
    }
  }

  if (biggestIncrease) {
    insights.push({
      id: 'category-increase',
      tone: 'negative',
      text: `Você gastou ${Math.round(biggestIncrease.pct)}% a mais com ${biggestIncrease.name} que no mesmo período do mês passado (${formatCurrency(biggestIncrease.current)} vs ${formatCurrency(biggestIncrease.previous)}).`,
    });
  }

  if (biggestDecrease) {
    insights.push({
      id: 'category-decrease',
      tone: 'positive',
      text: `Boa! Seus gastos com ${biggestDecrease.name} caíram ${Math.round(Math.abs(biggestDecrease.pct))}% em relação ao mesmo período do mês passado (${formatCurrency(biggestDecrease.current)} vs ${formatCurrency(biggestDecrease.previous)}).`,
    });
  }

  // --- Projeção de gastos até o fim do mês ----------------------------------
  if (dayOfMonth >= MIN_DAYS_FOR_PROJECTION && currentExpense > 0) {
    const daysInMonth = getDaysInMonth(today);
    const projectedExpense = (currentExpense / dayOfMonth) * daysInMonth;

    if (prevExpenseFullMonth > 0) {
      const pct = ((projectedExpense - prevExpenseFullMonth) / prevExpenseFullMonth) * 100;
      const direction = pct >= 0 ? `+${Math.round(pct)}%` : `${Math.round(pct)}%`;
      insights.push({
        id: 'expense-projection',
        tone: pct >= MIN_CHANGE_PCT ? 'warning' : 'neutral',
        text: `No ritmo atual, seus gastos devem fechar o mês em ${formatCurrency(projectedExpense)} (${direction} vs mês passado).`,
      });
    }

    if (currentIncome > 0) {
      const projectedBalance = currentIncome - projectedExpense;
      insights.push({
        id: 'balance-projection',
        tone: projectedBalance < 0 ? 'warning' : 'positive',
        text:
          projectedBalance < 0
            ? `Atenção: mantendo o ritmo, o mês fecha no vermelho em ${formatCurrency(Math.abs(projectedBalance))}.`
            : `Mantendo o ritmo, devem sobrar ${formatCurrency(projectedBalance)} das receitas deste mês.`,
      });
    }
  }

  // --- Maior gasto do mês ----------------------------------------------------
  if (topExpense && currentExpense > 0 && topExpense.amount >= currentExpense * 0.15) {
    insights.push({
      id: 'top-expense',
      tone: 'neutral',
      text: `Seu maior gasto do mês foi "${topExpense.description}" (${formatCurrency(topExpense.amount)}, ${format(parseISO(topExpense.date), 'dd/MM')}).`,
    });
  }

  return insights
    .sort((a, b) => TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone])
    .slice(0, 3);
}
