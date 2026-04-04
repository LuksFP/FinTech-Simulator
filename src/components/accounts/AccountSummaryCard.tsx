import { memo } from 'react';
import { Landmark, TrendingUp, CreditCard, PiggyBank, Wallet } from 'lucide-react';
import { useAccounts, type AccountType } from '@/hooks/useAccounts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Corrente',
  savings: 'Poupança',
  credit: 'Crédito',
  investment: 'Investimento',
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
};

export const AccountSummaryCard = memo(function AccountSummaryCard() {
  const { accounts, isLoading } = useAccounts();

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Minhas Contas</span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center animate-pulse">
            <div className="h-4 w-32 bg-slate-700 rounded" />
            <div className="h-4 w-20 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Minhas Contas</span>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhuma conta cadastrada
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Landmark className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Minhas Contas</span>
      </div>

      {/* Account rows */}
      <div className="space-y-2.5">
        {accounts.map((account) => {
          const Icon = ACCOUNT_TYPE_ICONS[account.type] ?? Wallet;
          return (
            <div
              key={account.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Color + icon */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${account.color}25` }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: account.color }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {account.name}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'text-sm font-mono font-semibold shrink-0',
                  account.balance < 0 ? 'text-red-400' : 'text-foreground'
                )}
              >
                {formatCurrency(account.balance)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Divider + total */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Total</span>
        <span
          className={cn(
            'text-base font-bold font-mono',
            totalBalance < 0 ? 'text-red-400' : 'text-primary'
          )}
        >
          {formatCurrency(totalBalance)}
        </span>
      </div>
    </div>
  );
});
