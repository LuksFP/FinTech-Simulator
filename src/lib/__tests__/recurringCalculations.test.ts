import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock date-fns before importing the module under test
vi.mock('date-fns', () => ({
  addMonths: (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth() + n, 1),
  startOfMonth: (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1),
}));

// Mock the type import (no runtime effect)
vi.mock('@/types/recurring', () => ({}));

import { calculateMonthlyImpact, generateForecastData } from '../recurringCalculations';

type Freq = 'monthly' | 'weekly' | 'daily' | 'yearly';
type TxType = 'entrada' | 'saida';

interface MockRecurring {
  is_active: boolean;
  type: TxType;
  amount: number;
  frequency: Freq;
  id: string;
  user_id: string;
  description: string;
  category_id: null;
  next_due_date: string;
  created_at: string;
  updated_at: string;
}

function make(overrides: Partial<MockRecurring> = {}): MockRecurring {
  return {
    id: '1', user_id: 'u1', description: 'Test',
    amount: 100, type: 'saida', category_id: null,
    frequency: 'monthly', next_due_date: '2026-04-10',
    is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01',
    ...overrides,
  };
}

describe('calculateMonthlyImpact', () => {
  it('returns 0 for empty list', () => {
    expect(calculateMonthlyImpact([])).toBe(0);
  });

  it('ignores inactive items', () => {
    expect(calculateMonthlyImpact([make({ is_active: false, amount: 500 })])).toBe(0);
  });

  it('subtracts monthly expense', () => {
    expect(calculateMonthlyImpact([make({ type: 'saida', amount: 200 })])).toBe(-200);
  });

  it('adds monthly income', () => {
    expect(calculateMonthlyImpact([make({ type: 'entrada', amount: 3000 })])).toBe(3000);
  });

  it('converts weekly to monthly (× 4.33)', () => {
    expect(calculateMonthlyImpact([make({ type: 'saida', amount: 100, frequency: 'weekly' })])).toBeCloseTo(-433, 0);
  });

  it('converts daily to monthly (× 30)', () => {
    expect(calculateMonthlyImpact([make({ type: 'entrada', amount: 10, frequency: 'daily' })])).toBeCloseTo(300, 0);
  });

  it('converts yearly to monthly (÷ 12)', () => {
    expect(calculateMonthlyImpact([make({ type: 'saida', amount: 1200, frequency: 'yearly' })])).toBeCloseTo(-100, 0);
  });

  it('combines income and expenses', () => {
    const salary = make({ type: 'entrada', amount: 5000 });
    const rent   = make({ type: 'saida',   amount: 1500 });
    expect(calculateMonthlyImpact([salary, rent])).toBe(3500);
  });
});

describe('generateForecastData', () => {
  it('returns months+1 data points', () => {
    expect(generateForecastData(1000, [], 6)).toHaveLength(7);
  });

  it('labels the first point as Hoje', () => {
    expect(generateForecastData(1000, [], 3)[0].name).toBe('Hoje');
  });

  it('keeps balance flat with no recurrings', () => {
    const data = generateForecastData(2000, [], 3);
    data.forEach((d) => expect(d.saldo).toBe(2000));
  });

  it('projects balance correctly with monthly income', () => {
    const r = make({ type: 'entrada', amount: 1000, frequency: 'monthly' });
    const data = generateForecastData(0, [r as any], 3);
    expect(data[0].saldo).toBe(0);
    expect(data[1].saldo).toBe(1000);
    expect(data[2].saldo).toBe(2000);
    expect(data[3].saldo).toBe(3000);
  });
});
