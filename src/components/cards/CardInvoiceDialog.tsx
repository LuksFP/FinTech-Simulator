import { useState, useMemo } from 'react';
import { format, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Receipt,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import {
  invoiceMonthFor,
  invoiceDueDate,
  invoiceStatus,
  splitInstallments,
  type InvoiceStatus,
} from '@/lib/cardInvoice';
import { cn } from '@/lib/utils';
import type {
  CreditCard,
  CardTransaction,
  CardPurchaseFormData,
  CardInvoicePayment,
} from '@/types/creditCard';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  aberta: 'bg-blue-500/20 text-blue-400',
  fechada: 'bg-amber-500/20 text-amber-400',
  paga: 'bg-green-500/20 text-green-400',
  futura: 'bg-white/10 text-muted-foreground',
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  aberta: 'Aberta',
  fechada: 'Fechada',
  paga: 'Paga',
  futura: 'Futura',
};

interface CardInvoiceDialogProps {
  card: CreditCard | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  transactions: CardTransaction[];
  payments: CardInvoicePayment[];
  addPurchase: (card: CreditCard, data: CardPurchaseFormData) => Promise<unknown>;
  deletePurchase: (purchaseGroupId: string) => Promise<void>;
  payInvoice: (params: {
    card: CreditCard;
    invoiceMonth: string;
    amount: number;
    accountId: string | null;
  }) => Promise<unknown>;
}

const EMPTY_PURCHASE = {
  description: '',
  amount: '',
  purchase_date: format(new Date(), 'yyyy-MM-dd'),
  installments: 1,
  category_id: '',
};

const NO_CATEGORY = '__none__';
const NO_ACCOUNT = '__none__';

export function CardInvoiceDialog({
  card,
  open,
  onOpenChange,
  transactions,
  payments,
  addPurchase,
  deletePurchase,
  payInvoice,
}: CardInvoiceDialogProps) {
  const { toast } = useToast();
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const currentInvoiceMonth = card
    ? invoiceMonthFor(format(new Date(), 'yyyy-MM-dd'), card.closing_day)
    : format(new Date(), 'yyyy-MM-01');

  const [invoiceMonth, setInvoiceMonth] = useState<string | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(EMPTY_PURCHASE);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAccountId, setPayAccountId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const month = invoiceMonth ?? currentInvoiceMonth;

  const expenseCategories = categories.filter((c) => c.type === 'saida');

  const monthTransactions = useMemo(
    () =>
      card
        ? transactions.filter((t) => t.card_id === card.id && t.invoice_month === month)
        : [],
    [transactions, card, month]
  );

  const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const payment = card
    ? payments.find((p) => p.card_id === card.id && p.invoice_month === month)
    : undefined;
  const status: InvoiceStatus = card
    ? invoiceStatus(month, card.closing_day, !!payment)
    : 'aberta';

  function navigate(delta: number) {
    setInvoiceMonth(format(addMonths(parseISO(month), delta), 'yyyy-MM-dd'));
    setShowPayForm(false);
    setShowPurchaseForm(false);
  }

  function handleClose(value: boolean) {
    onOpenChange(value);
    if (!value) {
      setInvoiceMonth(null);
      setShowPurchaseForm(false);
      setShowPayForm(false);
      setPurchaseForm(EMPTY_PURCHASE);
    }
  }

  async function handleAddPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    const amount = parseFloat(purchaseForm.amount.replace(',', '.'));
    if (!purchaseForm.description.trim() || !amount || amount <= 0) return;

    setSubmitting(true);
    try {
      await addPurchase(card, {
        card_id: card.id,
        description: purchaseForm.description,
        amount,
        purchase_date: purchaseForm.purchase_date,
        installments: purchaseForm.installments,
        category_id: purchaseForm.category_id || null,
      });
      toast({ title: 'Compra lançada!', description: `"${purchaseForm.description}" adicionada ao cartão.` });
      setPurchaseForm(EMPTY_PURCHASE);
      setShowPurchaseForm(false);
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível lançar a compra.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePurchase(t: CardTransaction) {
    try {
      await deletePurchase(t.purchase_group_id);
      toast({
        title: 'Compra excluída',
        description:
          t.installments_total > 1
            ? `Todas as ${t.installments_total} parcelas foram removidas.`
            : 'A compra foi removida.',
      });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir a compra.', variant: 'destructive' });
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    const amount = parseFloat(payAmount.replace(',', '.')) || total;
    if (amount <= 0) return;

    setSubmitting(true);
    try {
      await payInvoice({
        card,
        invoiceMonth: month,
        amount,
        accountId: payAccountId || null,
      });
      toast({ title: 'Fatura paga!', description: `Pagamento de ${formatCurrency(amount)} registrado.` });
      setShowPayForm(false);
      setPayAmount('');
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível registrar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!card) return null;

  const installmentPreview =
    purchaseForm.installments > 1 && parseFloat(purchaseForm.amount.replace(',', '.')) > 0
      ? splitInstallments(parseFloat(purchaseForm.amount.replace(',', '.')), purchaseForm.installments)
      : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
            Fatura — {card.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Month navigation + summary */}
          <div className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="font-medium capitalize">
                  {format(parseISO(month), 'MMMM yyyy', { locale: ptBR })}
                </p>
                <Badge variant="secondary" className={cn('text-xs px-1.5 py-0 mt-0.5', STATUS_STYLES[status])}>
                  {STATUS_LABELS[status]}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-2xl font-bold font-mono text-center">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Fecha dia {card.closing_day} · Vence em{' '}
              {format(parseISO(invoiceDueDate(month, card.closing_day, card.due_day)), 'dd/MM/yyyy')}
            </p>
            {payment && (
              <p className="text-xs text-green-400 text-center mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Pago {formatCurrency(payment.amount)} em {format(parseISO(payment.paid_at.slice(0, 10)), 'dd/MM/yyyy')}
              </p>
            )}
          </div>

          {/* Pay button / form */}
          {!payment && total > 0 && (status === 'fechada' || status === 'aberta') && (
            showPayForm ? (
              <form onSubmit={handlePay} className="rounded-xl border border-border/60 bg-secondary/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Registrar pagamento</p>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPayForm(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pay-amount">Valor</Label>
                    <Input
                      id="pay-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={payAmount || total.toFixed(2)}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pay-account">Conta</Label>
                    <Select value={payAccountId || NO_ACCOUNT} onValueChange={(v) => setPayAccountId(v === NO_ACCOUNT ? '' : v)}>
                      <SelectTrigger id="pay-account">
                        <SelectValue placeholder="Sem conta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ACCOUNT}>— sem conta —</SelectItem>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full" disabled={submitting}>
                  {submitting ? 'Registrando…' : 'Confirmar pagamento'}
                </Button>
              </form>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowPayForm(true)}>
                <Receipt className="w-4 h-4" />
                Registrar pagamento
              </Button>
            )
          )}

          {/* Transactions list */}
          {monthTransactions.length > 0 ? (
            <div className="space-y-2">
              {monthTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {t.description}
                      {t.installments_total > 1 && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {t.installment_number}/{t.installments_total}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{format(parseISO(t.purchase_date), 'dd/MM/yyyy')}</span>
                      {t.category && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category.color }} />
                          {t.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-mono font-medium text-red-400">
                      {formatCurrency(t.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title={t.installments_total > 1 ? 'Excluir compra (todas as parcelas)' : 'Excluir compra'}
                      onClick={() => handleDeletePurchase(t)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma compra nesta fatura</p>
            </div>
          )}

          {/* New purchase form */}
          {showPurchaseForm ? (
            <form onSubmit={handleAddPurchase} className="rounded-xl border border-border/60 bg-secondary/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">Nova compra</p>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPurchaseForm(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pur-desc">Descrição</Label>
                <Input
                  id="pur-desc"
                  placeholder="Ex: Notebook, mercado…"
                  value={purchaseForm.description}
                  onChange={(e) => setPurchaseForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pur-amount">Valor total</Label>
                  <Input
                    id="pur-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0,00"
                    value={purchaseForm.amount}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pur-date">Data da compra</Label>
                  <Input
                    id="pur-date"
                    type="date"
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm((f) => ({ ...f, purchase_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pur-installments">Parcelas</Label>
                  <Input
                    id="pur-installments"
                    type="number"
                    min="1"
                    max="48"
                    value={purchaseForm.installments}
                    onChange={(e) =>
                      setPurchaseForm((f) => ({
                        ...f,
                        installments: Math.max(1, Math.min(48, parseInt(e.target.value) || 1)),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pur-category">Categoria</Label>
                  <Select
                    value={purchaseForm.category_id || NO_CATEGORY}
                    onValueChange={(v) => setPurchaseForm((f) => ({ ...f, category_id: v === NO_CATEGORY ? '' : v }))}
                  >
                    <SelectTrigger id="pur-category">
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>— sem categoria —</SelectItem>
                      {expenseCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {installmentPreview && (
                <p className="text-xs text-muted-foreground">
                  {purchaseForm.installments}x de {formatCurrency(installmentPreview[1] ?? installmentPreview[0])}
                  {installmentPreview[0] !== installmentPreview[1] &&
                    ` (1ª de ${formatCurrency(installmentPreview[0])})`}
                </p>
              )}

              <Button type="submit" size="sm" className="w-full" disabled={submitting}>
                {submitting ? 'Lançando…' : 'Lançar compra'}
              </Button>
            </form>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowPurchaseForm(true)}>
              <Plus className="w-4 h-4" />
              Nova compra
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
