import { useState, useCallback, memo } from 'react';
import { Landmark, Pencil, Trash2, Star, Plus, X, Check } from 'lucide-react';
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
import { useAccounts, type BankAccount, type BankAccountFormData, type AccountType } from '@/hooks/useAccounts';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Corrente',
  savings: 'Poupança',
  credit: 'Crédito',
  investment: 'Investimento',
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  checking: 'bg-blue-500/20 text-blue-400',
  savings: 'bg-green-500/20 text-green-400',
  credit: 'bg-red-500/20 text-red-400',
  investment: 'bg-purple-500/20 text-purple-400',
};

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
];

const DEFAULT_FORM: BankAccountFormData = {
  name: '',
  type: 'checking',
  balance: 0,
  color: PRESET_COLORS[0],
  icon: 'wallet',
  is_default: false,
};

interface AccountFormProps {
  initial?: Partial<BankAccountFormData>;
  onSubmit: (data: BankAccountFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const AccountForm = memo(function AccountForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Criar conta',
}: AccountFormProps) {
  const [form, setForm] = useState<BankAccountFormData>({
    ...DEFAULT_FORM,
    ...initial,
  });
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="acc-name">Nome da conta</Label>
        <Input
          id="acc-name"
          placeholder="Ex: Nubank, Bradesco..."
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label htmlFor="acc-type">Tipo</Label>
        <Select
          value={form.type}
          onValueChange={(v) => setForm((f) => ({ ...f, type: v as AccountType }))}
        >
          <SelectTrigger id="acc-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checking">Corrente</SelectItem>
            <SelectItem value="savings">Poupança</SelectItem>
            <SelectItem value="credit">Crédito</SelectItem>
            <SelectItem value="investment">Investimento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Initial balance */}
      <div className="space-y-1.5">
        <Label htmlFor="acc-balance">Saldo inicial</Label>
        <Input
          id="acc-balance"
          type="number"
          step="0.01"
          placeholder="0,00"
          value={form.balance}
          onChange={(e) =>
            setForm((f) => ({ ...f, balance: parseFloat(e.target.value) || 0 }))
          }
        />
      </div>

      {/* Color picker */}
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
              {form.color === color && (
                <Check className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Default checkbox */}
      <div className="flex items-center gap-2">
        <input
          id="acc-default"
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={form.is_default}
          onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
        />
        <Label htmlFor="acc-default" className="cursor-pointer">
          Conta padrão
        </Label>
      </div>

      {/* Actions */}
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

interface AccountItemProps {
  account: BankAccount;
  onUpdate: (id: string, data: Partial<BankAccountFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
}

const AccountItem = memo(function AccountItem({
  account,
  onUpdate,
  onDelete,
  onSetDefault,
}: AccountItemProps) {
  const [editing, setEditing] = useState(false);

  const handleUpdate = async (data: BankAccountFormData) => {
    await onUpdate(account.id, data);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
        <AccountForm
          initial={{
            name: account.name,
            type: account.type,
            balance: account.balance,
            color: account.color,
            icon: account.icon,
            is_default: account.is_default,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Salvar alterações"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors p-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Color indicator */}
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: account.color }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{account.name}</p>
            {account.is_default && (
              <Star className="w-3 h-3 text-yellow-400 shrink-0 fill-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              variant="secondary"
              className={cn('text-xs px-1.5 py-0', ACCOUNT_TYPE_COLORS[account.type])}
            >
              {ACCOUNT_TYPE_LABELS[account.type]}
            </Badge>
            <span
              className={cn(
                'text-xs font-mono font-medium',
                account.balance < 0 ? 'text-red-400' : 'text-green-400'
              )}
            >
              {formatCurrency(account.balance)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!account.is_default && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-yellow-400"
            title="Definir como padrão"
            onClick={() => onSetDefault(account.id)}
          >
            <Star className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Editar conta"
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
              title="Excluir conta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{account.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(account.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});

export const AccountManager = memo(function AccountManager() {
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const { accounts, createAccount, updateAccount, deleteAccount, setDefault } = useAccounts();
  const { toast } = useToast();

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleCreate = useCallback(
    async (data: BankAccountFormData) => {
      try {
        await createAccount(data);
        toast({ title: 'Conta criada!', description: `"${data.name}" foi adicionada.` });
        setShowNewForm(false);
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível criar a conta.', variant: 'destructive' });
      }
    },
    [createAccount, toast]
  );

  const handleUpdate = useCallback(
    async (id: string, data: Partial<BankAccountFormData>) => {
      try {
        await updateAccount(id, data);
        toast({ title: 'Conta atualizada!', description: 'As alterações foram salvas.' });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível atualizar a conta.', variant: 'destructive' });
      }
    },
    [updateAccount, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteAccount(id);
        toast({ title: 'Conta excluída', description: 'A conta foi removida.' });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível excluir a conta.', variant: 'destructive' });
      }
    },
    [deleteAccount, toast]
  );

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        await setDefault(id);
        toast({ title: 'Conta padrão atualizada!', description: 'A conta foi definida como padrão.' });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível definir como padrão.', variant: 'destructive' });
      }
    },
    [setDefault, toast]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 hover:bg-white/10 text-white gap-2"
        >
          <Landmark className="h-4 w-4" />
          Contas
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            Gerenciar Contas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Total net worth */}
          <div className="rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 p-4">
            <p className="text-xs text-muted-foreground mb-1">Patrimônio total</p>
            <p
              className={cn(
                'text-2xl font-bold font-mono',
                totalBalance < 0 ? 'text-red-400' : 'text-primary'
              )}
            >
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}
            </p>
          </div>

          {/* Account list */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              {accounts.map((account) => (
                <AccountItem
                  key={account.id}
                  account={account}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          )}

          {accounts.length === 0 && !showNewForm && (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium">Nenhuma conta cadastrada</p>
              <p className="text-sm">Adicione suas contas bancárias abaixo</p>
            </div>
          )}

          {/* New account form */}
          {showNewForm ? (
            <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm">Nova conta</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowNewForm(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <AccountForm
                onSubmit={handleCreate}
                onCancel={() => setShowNewForm(false)}
                submitLabel="Criar conta"
              />
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="w-4 h-4" />
              Nova conta
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
