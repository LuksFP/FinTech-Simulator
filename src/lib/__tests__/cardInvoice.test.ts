import { describe, it, expect } from 'vitest';
import {
  invoiceMonthFor,
  splitInstallments,
  invoiceClosingDate,
  invoiceDueDate,
  invoiceStatus,
} from '../cardInvoice';

describe('invoiceMonthFor', () => {
  it('compra antes/no dia do fechamento cai na fatura do mês', () => {
    expect(invoiceMonthFor('2026-03-10', 15)).toBe('2026-03-01');
    expect(invoiceMonthFor('2026-03-15', 15)).toBe('2026-03-01');
  });

  it('compra depois do fechamento cai na fatura do mês seguinte', () => {
    expect(invoiceMonthFor('2026-03-16', 15)).toBe('2026-04-01');
    expect(invoiceMonthFor('2026-12-20', 15)).toBe('2027-01-01');
  });

  it('parcela N cai N-1 meses depois', () => {
    expect(invoiceMonthFor('2026-03-10', 15, 1)).toBe('2026-03-01');
    expect(invoiceMonthFor('2026-03-10', 15, 3)).toBe('2026-05-01');
    expect(invoiceMonthFor('2026-03-16', 15, 2)).toBe('2026-05-01');
  });
});

describe('splitInstallments', () => {
  it('divide igualmente quando não há sobra', () => {
    expect(splitInstallments(300, 3)).toEqual([100, 100, 100]);
  });

  it('primeira parcela absorve a sobra do arredondamento', () => {
    expect(splitInstallments(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(splitInstallments(0.05, 2)).toEqual([0.03, 0.02]);
  });

  it('soma sempre bate com o total', () => {
    for (const [total, n] of [[199.99, 7], [1234.56, 12], [10, 3]] as const) {
      const parts = splitInstallments(total, n);
      const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
      expect(sum).toBe(total);
      expect(parts).toHaveLength(n);
    }
  });

  it('parcela única retorna o total', () => {
    expect(splitInstallments(59.9, 1)).toEqual([59.9]);
  });
});

describe('invoiceClosingDate / invoiceDueDate', () => {
  it('fechamento no dia configurado do mês da fatura', () => {
    expect(invoiceClosingDate('2026-03-01', 15)).toBe('2026-03-15');
  });

  it('vencimento no mesmo mês quando dueDay > closingDay', () => {
    expect(invoiceDueDate('2026-03-01', 15, 22)).toBe('2026-03-22');
  });

  it('vencimento no mês seguinte quando dueDay <= closingDay (padrão Nubank)', () => {
    expect(invoiceDueDate('2026-03-01', 28, 7)).toBe('2026-04-07');
    expect(invoiceDueDate('2026-12-01', 28, 7)).toBe('2027-01-07');
  });
});

describe('invoiceStatus', () => {
  const closingDay = 15;

  it('paga tem precedência', () => {
    expect(invoiceStatus('2026-03-01', closingDay, true, new Date('2026-02-01'))).toBe('paga');
  });

  it('fechada depois do dia de fechamento', () => {
    expect(invoiceStatus('2026-03-01', closingDay, false, new Date('2026-03-16'))).toBe('fechada');
  });

  it('aberta entre o fechamento anterior e o próprio', () => {
    expect(invoiceStatus('2026-03-01', closingDay, false, new Date('2026-02-20'))).toBe('aberta');
    expect(invoiceStatus('2026-03-01', closingDay, false, new Date('2026-03-10'))).toBe('aberta');
  });

  it('futura antes da janela da fatura', () => {
    expect(invoiceStatus('2026-05-01', closingDay, false, new Date('2026-03-10'))).toBe('futura');
  });
});
