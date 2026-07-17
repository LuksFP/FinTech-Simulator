import { useState, useCallback, memo } from 'react';
import { CreditCard as CreditCardIcon, Pencil, Trash2, Plus, X, Check, Receipt } from 'lucide-react';
import { useControlledDialog } from '@/hooks/useControlledDialog';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { invoiceMonthFor, invoiceStatus } from '@/lib/cardInvoice';
import { cn } from '@/lib/utils';
import { CardInvoiceDialog } from './CardInvoiceDialog';
import type { CreditCard, CreditCardFormData } from '@/types/creditCard';

const PRESET_COLORS = [
  '#8b5cf6', // violet (Nubank vibes)
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#ec4899', // pink
];

const DEFAULT_FORM: CreditCardFormData = {
  name: '',
  limit_amount: 0,
  closing_day: 28,
  due_day: 7,
  color: PRESET_COLORS[0],
};

interface CardFormProps {
  initial?: Partial<CreditCardFormData>;
  onSubmit: (data: CreditCardFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const CardForm = memo(function CardForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Criar cartão',
}: CardFormProps) {
  const [form, setForm] = useState<CreditCardFormData>({ ...DEFAULT_FORM, ...initial });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const clampDay = (value: string) => Math.max(1, Math.min(28, parseInt(value) || 1));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="card-name">Nome do cartão</Label>
        <Input
          id="card-name"
          placeholder="Ex: Nubank, Inter Gold…"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="card-limit">Limite</Label>
          <Input
            id="card-limit"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={form.limit_amount || ''}
            onChange={(e) => setForm((f) => ({ ...f, limit_amount: parseFloat(e.target.value) || 0 }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-closing">Fecha dia</Label>
          <Input
            id="card-closing"
            type="number"
            min="1"
            max="28"
            value={form.closing_day}
            onChange={(e) => setForm((f) => ({ ...f, closing_day: clampDay(e.target.value) }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="card-due">Vence dia</Label>
          <Input
            id="card-due"
            type="number"
            min="1"
            max="28"
            value={form.due_day}
            onChange={(e) => setForm((f) => ({ ...f, due_day: clampDay(e.target.value) }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color }))}
              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center"
              style={{
                backgroundColor: color,
                borderColor: form.color === color ? 'white' : 'transparent',
              }}
              aria-label={`Cor ${color}`}
            >
              {form.color === color && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={submitting || !form.name.trim()}>
          {submitting ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
});

interface CreditCardManagerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreditCardManager = memo(function CreditCardManager({ open: controlledOpen, onOpenChange }: CreditCardManagerProps = {}) {
  const { open, setOpen, isControlled } = useControlledDialog(controlledOpen, onOpenChange);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invoiceCard, setInvoiceCard] = useState<CreditCard | null>(null);
  const {
    cards,
    cardTransactions,
    payments,
    createCard,
    updateCard,
    deleteCard,
    addPurchase,
    deletePurchase,
    payInvoice,
  } = useCreditCards();
  const { toast } = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');

  /** Fatura aberta (mês corrente) e limite usado (faturas não pagas) por cartão. */
  const cardSummary = useCallback(
    (card: CreditCard) => {
      const currentMonth = invoiceMonthFor(today, card.closing_day);
      const paidMonths = new Set(
        payments.filter((p) => p.card_id === card.id).map((p) => p.invoice_month)
      );
      let openInvoice = 0;
      let usedLimit = 0;
      for (const t of cardTransactions) {
        if (t.card_id !== card.id) continue;
        if (t.invoice_month === currentMonth) openInvoice += t.amount;
        if (!paidMonths.has(t.invoice_month)) usedLimit += t.amount;
      }
      const currentStatus = invoiceStatus(
        currentMonth,
        card.closing_day,
        paidMonths.has(currentMonth)
      );
      return { openInvoice, usedLimit, currentStatus };
    },
    [cardTransactions, payments, today]
  );

  const handleCreate = useCallback(
    async (data: CreditCardFormData) => {
      try {
        await createCard(data);
        toast({ title: 'Cartão criado!', description: `"${data.name}" foi adicionado.` });
        setShowNewForm(false);
      } catch (err) {
        toast({
          title: 'Erro',
          description: err instanceof Error ? err.message : 'Não foi possível criar o cartão.',
          variant: 'destructive',
        });
      }
    },
    [createCard, toast]
  );

  const handleUpdate = useCallback(
    async (id: string, data: CreditCardFormData) => {
      try {
        await updateCard(id, data);
        toast({ title: 'Cartão atualizado!', description: 'As alterações foram salvas.' });
        setEditingId(null);
      } catch (err) {
        toast({
          title: 'Erro',
          description: err instanceof Error ? err.message : 'Não foi possível atualizar o cartão.',
          variant: 'destructive',
        });
      }
    },
    [updateCard, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteCard(id);
        toast({ title: 'Cartão excluído', description: 'O cartão e suas compras foram removidos.' });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível excluir o cartão.', variant: 'destructive' });
      }
    },
    [deleteCard, toast]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {!isControlled && (
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-border bg-muted/40 hover:bg-muted text-foreground gap-2"
            >
              <CreditCardIcon className="h-4 w-4" />
              Cartões
            </Button>
          </DialogTrigger>
        )}

        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5" />
              Cartões de Crédito
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {cards.length > 0 && (
              <div className="space-y-2">
                {cards.map((card) => {
                  const { openInvoice, usedLimit } = cardSummary(card);
                  const usagePct = card.limit_amount > 0 ? Math.min(100, (usedLimit / card.limit_amount) * 100) : 0;

                  if (editingId === card.id) {
                    return (
                      <div key={card.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                        <CardForm
                          initial={{
                            name: card.name,
                            limit_amount: card.limit_amount,
                            closing_day: card.closing_day,
                            due_day: card.due_day,
                            color: card.color,
                          }}
                          onSubmit={(data) => handleUpdate(card.id, data)}
                          onCancel={() => setEditingId(null)}
                          submitLabel="Salvar alterações"
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={card.id}
                      className="rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: card.color }} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{card.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Fecha dia {card.closing_day} · vence dia {card.due_day}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ver fatura"
                            onClick={() => setInvoiceCard(card)}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Editar cartão"
                            onClick={() => setEditingId(card.id)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Excluir cartão"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir "{card.name}"? Todas as compras e faturas
                                  deste cartão serão removidas. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(card.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Fatura atual:{' '}
                          <span className="font-mono font-medium text-red-400">{formatCurrency(openInvoice)}</span>
                        </span>
                        {card.limit_amount > 0 && (
                          <span className="text-muted-foreground">
                            Limite: <span className="font-mono">{formatCurrency(usedLimit)}</span> /{' '}
                            {formatCurrency(card.limit_amount)}
                          </span>
                        )}
                      </div>
                      {card.limit_amount > 0 && (
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              usagePct >= 90 ? 'bg-red-500' : usagePct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            )}
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {cards.length === 0 && !showNewForm && (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCardIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-medium">Nenhum cartão cadastrado</p>
                <p className="text-sm">Adicione seus cartões de crédito abaixo</p>
              </div>
            )}

            {showNewForm ? (
              <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-sm">Novo cartão</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNewForm(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <CardForm onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} />
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowNewForm(true)}>
                <Plus className="w-4 h-4" />
                Novo cartão
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CardInvoiceDialog
        card={invoiceCard}
        open={invoiceCard !== null}
        onOpenChange={(v) => !v && setInvoiceCard(null)}
        transactions={cardTransactions}
        payments={payments}
        addPurchase={addPurchase}
        deletePurchase={deletePurchase}
        payInvoice={payInvoice}
      />
    </>
  );
});
