import { describe, it, expect, vi } from 'vitest';

const NOW = new Date('2026-04-04T12:00:00Z');

// Minimal pure-JS replicas — no date-fns needed
const d = (y: number, m: number, day: number, h = 0, min = 0, sec = 0) =>
  new Date(y, m, day, h, min, sec, 0);

vi.mock('date-fns', () => ({
  subDays:      (date: Date, n: number) => new Date(date.getTime() - n * 86400000),
  startOfMonth: (date: Date) => d(date.getFullYear(), date.getMonth(), 1),
  endOfMonth:   (date: Date) => d(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
  subMonths:    (date: Date, n: number) => d(date.getFullYear(), date.getMonth() - n, date.getDate()),
  startOfDay:   (date: Date) => d(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
  endOfDay:     (date: Date) => d(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
}));

vi.mock('@/types/transaction', () => ({}));

import { calculateDateRange } from '../dateRange';

describe('calculateDateRange', () => {
  it('returns null/null for "all"', () => {
    const { start, end } = calculateDateRange('all', undefined, NOW);
    expect(start).toBeNull();
    expect(end).toBeNull();
  });

  it('"7days" — start is 7 days before end', () => {
    const { start, end } = calculateDateRange('7days', undefined, NOW);
    expect(start).not.toBeNull();
    expect(end).not.toBeNull();
    const diffMs = end!.getTime() - start!.getTime();
    expect(diffMs).toBeGreaterThan(6 * 86400000);
    expect(diffMs).toBeLessThan(8 * 86400000);
  });

  it('"30days" — start is 30 days before end', () => {
    const { start, end } = calculateDateRange('30days', undefined, NOW);
    const diffMs = end!.getTime() - start!.getTime();
    expect(diffMs).toBeGreaterThan(29 * 86400000);
    expect(diffMs).toBeLessThan(31 * 86400000);
  });

  it('"thisMonth" — start is day 1 of current month', () => {
    const { start } = calculateDateRange('thisMonth', undefined, NOW);
    expect(start?.getDate()).toBe(1);
    expect(start?.getMonth()).toBe(NOW.getMonth());
  });

  it('"lastMonth" — start is day 1 of previous month', () => {
    const { start } = calculateDateRange('lastMonth', undefined, NOW);
    expect(start?.getMonth()).toBe(NOW.getMonth() - 1);
    expect(start?.getDate()).toBe(1);
  });

  it('"custom" — uses provided from/to', () => {
    const from = new Date('2026-03-01T00:00:00');
    const to   = new Date('2026-03-31T00:00:00');
    const { start, end } = calculateDateRange('custom', { from, to }, NOW);
    expect(start?.getFullYear()).toBe(2026);
    expect(start?.getMonth()).toBe(2); // March
    expect(end?.getMonth()).toBe(2);
  });

  it('"custom" — null start when from is missing', () => {
    const { start } = calculateDateRange('custom', { to: new Date() }, NOW);
    expect(start).toBeNull();
  });

  it('"custom" — null end when to is missing', () => {
    const { end } = calculateDateRange('custom', { from: new Date() }, NOW);
    expect(end).toBeNull();
  });
});
