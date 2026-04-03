import { format } from 'date-fns';
import type { Transaction } from '@/types/transaction';

function getRows(transactions: Transaction[]) {
  return transactions.map((t) => ({
    Data: format(new Date(t.date), 'dd/MM/yyyy'),
    Descrição: t.description,
    Tipo: t.type === 'entrada' ? 'Entrada' : 'Saída',
    Categoria: t.category?.name || '-',
    'Valor (R$)': t.amount.toFixed(2).replace('.', ','),
  }));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCSV(transactions: Transaction[], filename = 'transacoes.csv'): void {
  const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)'];
  const rows = transactions.map((t) => [
    format(new Date(t.date), 'dd/MM/yyyy'),
    `"${t.description.replace(/"/g, '""')}"`,
    t.type === 'entrada' ? 'Entrada' : 'Saída',
    t.category?.name || '-',
    t.amount.toFixed(2).replace('.', ','),
  ]);

  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export async function exportTransactionsToExcel(transactions: Transaction[], filename = 'transacoes.xlsx'): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = getRows(transactions);
  const ws = XLSX.utils.json_to_sheet(rows);
  
  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, string>)[key] || '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transações');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

export async function exportTransactionsToPDF(transactions: Transaction[], filename = 'transacoes.pdf'): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text('MyFinance - Relatório de Transações', 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

  // Summary
  const totalIncome = transactions.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'saida').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Entradas: R$ ${totalIncome.toFixed(2)}   |   Saídas: R$ ${totalExpense.toFixed(2)}   |   Saldo: R$ ${balance.toFixed(2)}`, 14, 40);

  // Table
  const head = [['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)']];
  const body = transactions.map((t) => [
    format(new Date(t.date), 'dd/MM/yyyy'),
    t.description,
    t.type === 'entrada' ? 'Entrada' : 'Saída',
    t.category?.name || '-',
    `R$ ${t.amount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 48,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell: (data: { section: string; column: { index: number }; row: { raw: string[] }; cell: { styles: { textColor: number[] } } }) => {
      if (data.section === 'body' && data.column.index === 2) {
        const type = data.row.raw[2];
        data.cell.styles.textColor = type === 'Entrada' ? [16, 185, 129] : [239, 68, 68];
      }
    },
  });

  doc.save(filename);
}
