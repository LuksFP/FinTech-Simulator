import { useState, memo } from 'react';
import {
  Landmark,
  CreditCard,
  Tags,
  Target,
  ArrowLeftRight,
  Upload,
  Repeat,
  BarChart3,
  FileDown,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { BudgetManager } from '@/components/budget/BudgetManager';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { RecurringManager } from '@/components/recurring/RecurringManager';
import { AccountManager } from '@/components/accounts/AccountManager';
import { CreditCardManager } from '@/components/cards/CreditCardManager';
import { TransferDialog } from '@/components/accounts/TransferDialog';
import { ImportCSV } from '@/components/transactions/ImportCSV';
import { ReportsDialog } from '@/components/reports/ReportsDialog';
import { ExportPDF } from '@/components/reports/ExportPDF';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import type { Transaction, TransactionFormData } from '@/types/transaction';

/** Keys for every dialog driven by this toolbar (except the always-standalone ones). */
type DialogKey =
  | 'accounts'
  | 'cards'
  | 'categories'
  | 'budget'
  | 'transfer'
  | 'import'
  | 'recurring'
  | 'reports';

interface DashboardActionsProps {
  transactions: Transaction[];
  createTransaction: (data: TransactionFormData) => Promise<void>;
  createTransactions: (data: TransactionFormData[]) => Promise<unknown>;
  onSpendingCheck: () => void;
  /** Nº de recorrentes ativas — exibido como badge no menu Ferramentas. */
  recurringCount?: number;
}

const menuTriggerClass =
  'border-border bg-muted/40 hover:bg-muted text-foreground gap-2';

/** Pílula de contagem reaproveitada nos gatilhos e itens de menu. */
function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto min-w-[1.25rem] rounded-full bg-primary/20 px-1.5 py-0.5 text-center text-xs font-medium text-primary">
      {count}
    </span>
  );
}

/**
 * Item de menu com título + descrição curta — auto-explicativo pra quem
 * está vendo o app pela primeira vez.
 */
function MenuItem({
  icon: Icon,
  title,
  description,
  badge,
  onSelect,
  onClick,
}: {
  icon: typeof Landmark;
  title: string;
  description: string;
  badge?: number;
  onSelect?: () => void;
  /** Injetado via cloneElement por wrappers como ExportPDF. */
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} onClick={onClick} className="items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {badge !== undefined && badge > 0 && <CountBadge count={badge} />}
        </div>
        <p className="text-xs text-muted-foreground leading-snug">{description}</p>
      </div>
    </DropdownMenuItem>
  );
}

export const DashboardActions = memo(function DashboardActions({
  transactions,
  createTransaction,
  createTransactions,
  onSpendingCheck,
  recurringCount = 0,
}: DashboardActionsProps) {
  const [active, setActive] = useState<DialogKey | null>(null);

  // Helper: open state + handler for a given dialog key.
  const dialog = (key: DialogKey) => ({
    open: active === key,
    onOpenChange: (open: boolean) => setActive(open ? key : null),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Notificações — ação isolada, ícone de sino */}
      <NotificationSettings />

      {/* Minhas contas: onde o dinheiro vive — contas, cartões, categorias, orçamentos */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={menuTriggerClass}>
            <Landmark className="h-4 w-4" />
            <span className="hidden sm:inline">Contas</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Organize suas finanças</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <MenuItem
            icon={Landmark}
            title="Contas bancárias"
            description="Adicione e gerencie suas contas e saldos"
            onSelect={() => setActive('accounts')}
          />
          <MenuItem
            icon={CreditCard}
            title="Cartões de crédito"
            description="Cadastre cartões, limites e faturas"
            onSelect={() => setActive('cards')}
          />
          <MenuItem
            icon={Tags}
            title="Categorias"
            description="Classifique seus gastos do seu jeito"
            onSelect={() => setActive('categories')}
          />
          <MenuItem
            icon={Target}
            title="Orçamentos"
            description="Defina limites de gasto por categoria"
            onSelect={() => setActive('budget')}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Movimentar: ações sobre o dinheiro — transferir, importar, recorrentes */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={menuTriggerClass}>
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Movimentar</span>
            {recurringCount > 0 && (
              <span className="min-w-[1.25rem] rounded-full bg-primary/20 px-1.5 py-0.5 text-center text-xs font-medium text-primary">
                {recurringCount}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Movimente seu dinheiro</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <MenuItem
            icon={ArrowLeftRight}
            title="Transferir entre contas"
            description="Mova dinheiro de uma conta para outra"
            onSelect={() => setActive('transfer')}
          />
          <MenuItem
            icon={Upload}
            title="Importar extrato"
            description="Traga transações do seu banco (CSV)"
            onSelect={() => setActive('import')}
          />
          <MenuItem
            icon={Repeat}
            title="Recorrentes"
            description="Contas fixas que se repetem todo mês"
            badge={recurringCount}
            onSelect={() => setActive('recurring')}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Relatórios: entender pra onde o dinheiro vai */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={menuTriggerClass}>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Entenda seus gastos</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <MenuItem
            icon={BarChart3}
            title="Ver relatórios"
            description="Gráficos e análises por período"
            onSelect={() => setActive('reports')}
          />
          <ExportPDF
            transactions={transactions}
            trigger={
              <MenuItem
                icon={FileDown}
                title="Exportar PDF"
                description="Baixe um resumo das suas finanças"
              />
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Ação primária */}
      <TransactionForm
        onSubmit={async (data) => {
          await createTransaction(data);
          if (data.type === 'saida') onSpendingCheck();
        }}
      />

      {/* Dialogs controlados (renderizados via portal, ficam fora dos menus) */}
      <AccountManager {...dialog('accounts')} />
      <CreditCardManager {...dialog('cards')} />
      <CategoryManager {...dialog('categories')} />
      <BudgetManager {...dialog('budget')} />
      <TransferDialog {...dialog('transfer')} />
      <ImportCSV
        createTransactions={createTransactions}
        existingTransactions={transactions}
        {...dialog('import')}
      />
      <RecurringManager {...dialog('recurring')} />
      <ReportsDialog transactions={transactions} {...dialog('reports')} />
    </div>
  );
});
