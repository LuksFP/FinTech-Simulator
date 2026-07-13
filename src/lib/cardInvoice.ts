import { addMonths, format, getDate, parseISO, setDate, startOfMonth } from 'date-fns';

// ---------------------------------------------------------------------------
// Regras de fatura de cartão de crédito.
//
// Convenção: `invoice_month` é sempre o 1º dia do mês em que a fatura FECHA.
// A fatura do mês M contém as compras feitas entre (fechamento de M-1) e
// (fechamento de M), inclusive.
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'paga' | 'fechada' | 'aberta' | 'futura';

/**
 * Mês da fatura (yyyy-MM-dd, dia 1) para uma compra.
 * Compra depois do dia de fechamento cai na fatura do mês seguinte;
 * a parcela N cai N-1 meses depois da primeira.
 */
export function invoiceMonthFor(purchaseDate: string, closingDay: number, installmentNumber = 1): string {
  const purchase = parseISO(purchaseDate);
  let base = startOfMonth(purchase);
  if (getDate(purchase) > closingDay) base = addMonths(base, 1);
  return format(addMonths(base, installmentNumber - 1), 'yyyy-MM-dd');
}

/**
 * Divide o valor total em N parcelas somando exatamente o total.
 * A primeira parcela absorve a sobra do arredondamento.
 */
export function splitInstallments(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base) / 100);
}

/** Data de fechamento da fatura do mês (yyyy-MM-dd). */
export function invoiceClosingDate(invoiceMonth: string, closingDay: number): string {
  return format(setDate(parseISO(invoiceMonth), closingDay), 'yyyy-MM-dd');
}

/**
 * Vencimento da fatura: dia `dueDay` no próprio mês se cair depois do
 * fechamento, senão no mês seguinte (padrão dos cartões BR).
 */
export function invoiceDueDate(invoiceMonth: string, closingDay: number, dueDay: number): string {
  const month = parseISO(invoiceMonth);
  const dueMonth = dueDay > closingDay ? month : addMonths(month, 1);
  return format(setDate(dueMonth, dueDay), 'yyyy-MM-dd');
}

/** Status da fatura na data de referência. */
export function invoiceStatus(
  invoiceMonth: string,
  closingDay: number,
  isPaid: boolean,
  today: Date = new Date()
): InvoiceStatus {
  if (isPaid) return 'paga';

  const closing = setDate(parseISO(invoiceMonth), closingDay);
  const previousClosing = addMonths(closing, -1);

  if (today > closing) return 'fechada';
  if (today > previousClosing) return 'aberta';
  return 'futura';
}
