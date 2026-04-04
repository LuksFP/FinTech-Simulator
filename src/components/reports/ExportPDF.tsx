import { memo, useCallback } from 'react';
import { FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/types/transaction';

// Augment jsPDF with the autoTable plugin type
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface ExportPDFProps {
  transactions: Transaction[];
}

const formatBRL = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const ExportPDF = memo(function ExportPDF({ transactions }: ExportPDFProps) {
  const handleExport = useCallback(() => {
    const now = new Date();
    const interval = { start: startOfMonth(now), end: endOfMonth(now) };

    const monthTransactions = transactions.filter((t) =>
      isWithinInterval(new Date(t.date), interval)
    );

    const totalIncome = monthTransactions
      .filter((t) => t.type === 'entrada')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthTransactions
      .filter((t) => t.type === 'saida')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    const monthLabel = format(now, 'MMMM', { locale: ptBR });
    const yearLabel = format(now, 'yyyy');
    const monthNum = format(now, 'MM');

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 60);
    doc.text('MyFinance - Relatório de Transações', 14, 20);

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 120);
    const subtitleMonth =
      monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    doc.text(`${subtitleMonth} / ${yearLabel}`, 14, 30);

    // Summary
    doc.setFontSize(11);

    doc.setTextColor(16, 185, 129); // emerald for income
    doc.text(`Receitas:   ${formatBRL(totalIncome)}`, 14, 44);

    doc.setTextColor(239, 68, 68); // red for expense
    doc.text(`Despesas:  ${formatBRL(totalExpense)}`, 14, 52);

    const balanceColor: [number, number, number] =
      balance >= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setTextColor(...balanceColor);
    doc.text(`Saldo:        ${formatBRL(balance)}`, 14, 60);

    // Divider line
    doc.setDrawColor(200, 200, 220);
    doc.line(14, 65, 196, 65);

    // Table
    const tableRows = monthTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t) => [
        format(new Date(t.date), 'dd/MM/yyyy'),
        t.description,
        t.category?.name ?? 'Sem categoria',
        t.type === 'entrada' ? 'Entrada' : 'Saída',
        formatBRL(t.amount),
      ]);

    doc.autoTable({
      startY: 70,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: tableRows,
      headStyles: {
        fillColor: [30, 30, 60],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [40, 40, 60],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 252],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 65 },
        2: { cellWidth: 40 },
        3: { cellWidth: 22 },
        4: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const tipo = data.cell.raw as string;
          data.cell.styles.textColor =
            tipo === 'Entrada' ? [16, 130, 90] : [200, 50, 50];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 180);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${pageCount} — gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm")}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
    }

    doc.save(`myfinance-relatorio-${monthNum}-${yearLabel}.pdf`);
  }, [transactions]);

  return (
    <Button
      variant="outline"
      className="border-white/20 bg-white/5 hover:bg-white/10 text-white gap-2"
      onClick={handleExport}
    >
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
});
