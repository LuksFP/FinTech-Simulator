import { describe, it, expect } from 'vitest';
import {
  filterByMonth,
  getMonthSummary,
  isCurrentMonth,
  nextMonth,
  previousMonth,
  formatMonthLabel,
} from '../monthNav';
import type { Transaction } from '@/types/transaction';

const NOW = new Date(2026, 6, 17); // 17 de julho de 2026
const JULY = new Date(2026, 6, 1);
const JUNE = new Date(2026, 5, 1);
const MAY = new Date(2026, 4, 1);

let seq = 0;
function tx(overrides: Partial<Transaction> & { amount: number; date: string }): Transaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    description: `Transação ${seq}`,
    type: 'saida',
    created_at: overrides.date,
    user_id: 'u1',
    category_id: null,
    ...overrides,
  };
}

const SAMPLE: Transaction[] = [
  tx({ amount: 5000, date: '2026-05-05', type: 'entrada' }), // maio
  tx({ amount: 1000, date: '2026-05-10' }),                  // maio
  tx({ amount: 4000, date: '2026-06-05', type: 'entrada' }), // junho
  tx({ amount: 2000, date: '2026-06-15' }),                  // junho
  tx({ amount: 6000, date: '2026-07-01', type: 'entrada' }), // julho
  tx({ amount: 1500, date: '2026-07-10' }),                  // julho
];

describe('filterByMonth', () => {
  it('mantém só as transações do mês de referência', () => {
    const june = filterByMonth(SAMPLE, JUNE);
    expect(june).toHaveLength(2);
    expect(june.every((t) => t.date.startsWith('2026-06'))).toBe(true);
  });

  it('inclui o primeiro e o último dia do mês', () => {
    const list = [
      tx({ amount: 10, date: '2026-06-01' }),
      tx({ amount: 20, date: '2026-06-30' }),
      tx({ amount: 30, date: '2026-07-01' }),
    ];
    expect(filterByMonth(list, JUNE)).toHaveLength(2);
  });
});

describe('getMonthSummary', () => {
  it('soma entradas e saídas do mês', () => {
    const s = getMonthSummary(SAMPLE, JUNE);
    expect(s.income).toBe(4000);
    expect(s.expense).toBe(2000);
    expect(s.monthBalance).toBe(2000);
    expect(s.transactionCount).toBe(2);
  });

  it('saldo acumulado considera tudo até o fim do mês de referência', () => {
    const s = getMonthSummary(SAMPLE, JUNE);
    // maio: +5000 -1000; junho: +4000 -2000 → 6000
    expect(s.cumulativeBalance).toBe(6000);
    // julho acumula tudo
    expect(getMonthSummary(SAMPLE, JULY).cumulativeBalance).toBe(10500);
  });

  it('variação % compara com o mês anterior ao de referência', () => {
    const s = getMonthSummary(SAMPLE, JUNE);
    expect(s.incomeChange).toBeCloseTo(((4000 - 5000) / 5000) * 100); // -20%
    expect(s.expenseChange).toBeCloseTo(((2000 - 1000) / 1000) * 100); // +100%
  });

  it('variação é 0 quando o mês anterior não tem movimento', () => {
    const s = getMonthSummary(SAMPLE, MAY);
    expect(s.incomeChange).toBe(0);
    expect(s.expenseChange).toBe(0);
  });

  it('mês sem transações zera tudo mas mantém o acumulado', () => {
    const s = getMonthSummary(SAMPLE, new Date(2026, 7, 1)); // agosto
    expect(s.income).toBe(0);
    expect(s.expense).toBe(0);
    expect(s.cumulativeBalance).toBe(10500);
  });
});

describe('navegação', () => {
  it('previousMonth volta para o dia 1 do mês anterior', () => {
    const prev = previousMonth(JULY);
    expect(prev.getFullYear()).toBe(2026);
    expect(prev.getMonth()).toBe(5);
    expect(prev.getDate()).toBe(1);
  });

  it('previousMonth atravessa a virada de ano', () => {
    const prev = previousMonth(new Date(2026, 0, 1));
    expect(prev.getFullYear()).toBe(2025);
    expect(prev.getMonth()).toBe(11);
  });

  it('nextMonth avança um mês', () => {
    const next = nextMonth(MAY, NOW);
    expect(next.getMonth()).toBe(5);
  });

  it('nextMonth não passa do mês atual', () => {
    const next = nextMonth(JULY, NOW);
    expect(next.getMonth()).toBe(6);
    expect(next.getFullYear()).toBe(2026);
  });

  it('isCurrentMonth compara mês e ano', () => {
    expect(isCurrentMonth(new Date(2026, 6, 1), NOW)).toBe(true);
    expect(isCurrentMonth(new Date(2026, 5, 17), NOW)).toBe(false);
    expect(isCurrentMonth(new Date(2025, 6, 17), NOW)).toBe(false);
  });
});

describe('formatMonthLabel', () => {
  it('formata em pt-BR', () => {
    expect(formatMonthLabel(JULY)).toBe('julho de 2026');
    expect(formatMonthLabel(new Date(2025, 11, 1))).toBe('dezembro de 2025');
  });
});
