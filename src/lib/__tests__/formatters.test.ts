import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, formatPercent, getMonthName } from '../formatters';

describe('formatCurrency', () => {
  it('formats positive BRL values', () => {
    expect(formatCurrency(1234.56)).toMatch(/1\.234,56/);
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toMatch(/0,00/);
  });

  it('formats negative values', () => {
    expect(formatCurrency(-500)).toMatch(/-.*500/);
  });
});

describe('formatCurrencyCompact', () => {
  it('formats without cents', () => {
    const result = formatCurrencyCompact(1500.99);
    expect(result).not.toMatch(/,\d{2}$/);
  });
});

describe('formatPercent', () => {
  it('formats 50 as ~50%', () => {
    expect(formatPercent(50)).toMatch(/50/);
  });

  it('formats 100 as ~100%', () => {
    expect(formatPercent(100)).toMatch(/100/);
  });
});

describe('getMonthName', () => {
  it('returns January for 0', () => {
    expect(getMonthName(0)).toBe('Janeiro');
  });

  it('returns December for 11', () => {
    expect(getMonthName(11)).toBe('Dezembro');
  });

  it('returns empty string for out-of-range', () => {
    expect(getMonthName(12)).toBe('');
  });
});
