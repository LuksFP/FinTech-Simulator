import { format } from 'date-fns';
import type { Transaction } from '@/types/transaction';

export function exportTransactionsToCSV(transactions: Transaction[], filename = 'transacoes.csv'): void {
  const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'];
  
  const rows = transactions.map((t) => [
    format(new Date(t.date), 'dd/MM/yyyy'),
    `"${t.description.replace(/"/g, '""')}"`,
    t.type === 'entrada' ? 'Entrada' : 'Saída',
    t.category?.name || '-',
    t.amount.toFixed(2).replace('.', ','),
  ]);

  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}
