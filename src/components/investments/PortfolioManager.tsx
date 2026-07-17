import { useState, useCallback, memo } from 'react';
import { Pencil, Trash2, Plus, X, Settings2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { ASSET_CLASS_LABELS } from '@/lib/portfolio';
import { cn } from '@/lib/utils';
import type {
  AssetClass,
  Investment,
  InvestmentFormData,
  PortfolioSummary,
} from '@/types/investment';

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  acao: 'bg-blue-500/20 text-blue-400',
  fii: 'bg-emerald-500/20 text-emerald-400',
  etf: 'bg-violet-500/20 text-violet-400',
  cripto: 'bg-amber-500/20 text-amber-400',
  moeda: 'bg-cyan-500/20 text-cyan-400',
  outro: 'bg-muted text-muted-foreground',
};

const CLASS_HINTS: Record<AssetClass, string> = {
  acao: 'PETR4, VALE3, ITUB4…',
  fii: 'HGLG11, MXRF11, KNRI11…',
  etf: 'BOVA11, IVVB11…',
  cripto: 'BTC, ETH, SOL…',
  moeda: 'USD, EUR…',
  outro: 'Tesouro, CDB…',
};

const DEFAULT_FORM: InvestmentFormData = {
  ticker: '',
  asset_class: 'acao',
  quantity: 0,
  avg_price: 0,
  notes: null,
};

interface PositionFormProps {
  initial?: Partial<InvestmentFormData>;
  onSubmit: (data: InvestmentFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const PositionForm = memo(function PositionForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Adicionar',
}: PositionFormProps) {
  const [form, setForm] = useState<InvestmentFormData>({ ...DEFAULT_FORM, ...initial });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ticker.trim() || form.quantity <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inv-ticker">Ticker</Label>
          <Input
            id="inv-ticker"
            placeholder={CLASS_HINTS[form.asset_class]}
            value={form.ticker}
            onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            autoCapitalize="characters"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-class">Tipo</Label>
          <Select
            value={form.asset_class}
            onValueChange={(v) => setForm((f) => ({ ...f, asset_class: v as AssetClass }))}
          >
            <SelectTrigger id="inv-class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {ASSET_CLASS_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inv-qty">Quantidade</Label>
          <Input
            id="inv-qty"
            type="number"
            step="any"
            min="0"
            placeholder="0"
            value={form.quantity || ''}
            onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-price">Preço médio (R$)</Label>
          <Input
            id="inv-price"
            type="number"
            step="any"
            min="0"
            placeholder="0,00"
            value={form.avg_price || ''}
            onChange={(e) => setForm((f) => ({ ...f, avg_price: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !form.ticker.trim() || form.quantity <= 0}
        >
          {submitting ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
});

interface PositionItemProps {
  investment: Investment;
  onUpdate: (id: string, data: InvestmentFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const PositionItem = memo(function PositionItem({
  investment,
  onUpdate,
  onDelete,
}: PositionItemProps) {
  const [editing, setEditing] = useState(false);

  const handleUpdate = async (data: InvestmentFormData) => {
    await onUpdate(investment.id, data);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
        <PositionForm
          initial={{
            ticker: investment.ticker,
            asset_class: investment.asset_class,
            quantity: investment.quantity,
            avg_price: investment.avg_price,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Salvar"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{investment.ticker}</p>
          <Badge
            variant="secondary"
            className={cn('text-xs px-1.5 py-0', ASSET_CLASS_COLORS[investment.asset_class])}
          >
            {ASSET_CLASS_LABELS[investment.asset_class]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {investment.quantity} × {formatCurrency(investment.avg_price)} (preço médio)
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Editar posição"
          onClick={() => setEditing(true)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              title="Remover posição"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover {investment.ticker}?</AlertDialogTitle>
              <AlertDialogDescription>
                A posição será removida da sua carteira. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(investment.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});

interface PortfolioManagerProps {
  investments: Investment[];
  portfolio: PortfolioSummary;
  onCreate: (data: InvestmentFormData) => Promise<unknown>;
  onUpdate: (id: string, data: InvestmentFormData) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}

export const PortfolioManager = memo(function PortfolioManager({
  investments,
  portfolio,
  onCreate,
  onUpdate,
  onDelete,
}: PortfolioManagerProps) {
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const { toast } = useToast();

  const handleCreate = useCallback(
    async (data: InvestmentFormData) => {
      try {
        await onCreate(data);
        toast({ title: 'Ativo adicionado!', description: `${data.ticker} entrou na carteira.` });
        setShowNewForm(false);
      } catch (err) {
        toast({
          title: 'Erro',
          description: err instanceof Error ? err.message : 'Não foi possível adicionar.',
          variant: 'destructive',
        });
      }
    },
    [onCreate, toast],
  );

  const handleUpdate = useCallback(
    async (id: string, data: InvestmentFormData) => {
      try {
        await onUpdate(id, data);
        toast({ title: 'Posição atualizada!', description: 'As alterações foram salvas.' });
      } catch (err) {
        toast({
          title: 'Erro',
          description: err instanceof Error ? err.message : 'Não foi possível atualizar.',
          variant: 'destructive',
        });
      }
    },
    [onUpdate, toast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await onDelete(id);
        toast({ title: 'Posição removida', description: 'O ativo saiu da carteira.' });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' });
      }
    },
    [onDelete, toast],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Gerenciar
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Minha Carteira
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Resumo */}
          <div className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor de mercado</p>
            <p className="text-2xl font-bold font-mono text-primary">
              {formatCurrency(portfolio.totalValue)}
            </p>
            {portfolio.totalCost > 0 && (
              <p
                className={cn(
                  'text-xs mt-1 font-medium',
                  portfolio.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {portfolio.totalProfit >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(portfolio.totalProfit))}{' '}
                ({formatPercent(portfolio.totalProfitPct)}) sobre o custo
              </p>
            )}
          </div>

          {/* Lista */}
          {investments.length > 0 && (
            <div className="space-y-2">
              {investments.map((inv) => (
                <PositionItem
                  key={inv.id}
                  investment={inv}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {investments.length === 0 && !showNewForm && (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">Carteira vazia</p>
              <p className="text-sm">Adicione ações, FIIs ou cripto para acompanhar em tempo real</p>
            </div>
          )}

          {/* Novo */}
          {showNewForm ? (
            <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm">Novo ativo</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowNewForm(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <PositionForm onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} />
            </div>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowNewForm(true)}>
              <Plus className="w-4 h-4" />
              Adicionar ativo
            </Button>
          )}

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Cotações via Yahoo Finance (ações/FIIs da B3, câmbio e cripto em BRL). Informe o preço
            médio de compra para calcular a rentabilidade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
