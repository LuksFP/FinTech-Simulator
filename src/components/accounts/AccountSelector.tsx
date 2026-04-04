import { memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BankAccount } from '@/hooks/useAccounts';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Corrente',
  savings: 'Poupança',
  credit: 'Crédito',
  investment: 'Investimento',
};

const ALL_ACCOUNTS_VALUE = '__all__';

interface AccountSelectorProps {
  accounts: BankAccount[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export const AccountSelector = memo(function AccountSelector({
  accounts,
  selectedId,
  onChange,
}: AccountSelectorProps) {
  const handleChange = (value: string) => {
    onChange(value === ALL_ACCOUNTS_VALUE ? null : value);
  };

  return (
    <Select
      value={selectedId ?? ALL_ACCOUNTS_VALUE}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-full sm:w-[220px]">
        <SelectValue placeholder="Todas as contas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ACCOUNTS_VALUE}>
          Todas as contas
        </SelectItem>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: account.color }}
              />
              <span className="truncate">{account.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
