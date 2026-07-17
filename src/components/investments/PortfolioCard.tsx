import { memo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Briefcase, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInvestments } from '@/hooks/useInvestments';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { ASSET_CLASS_LABELS } from '@/lib/portfolio';
import { cn } from '@/lib/utils';
import { PortfolioManager } from './PortfolioManager';
import type { AssetClass, PositionView } from '@/types/investment';

const CLASS_BAR_COLORS: Record<AssetClass, string> = {
  acao: 'bg-blue-500',
  fii: 'bg-emerald-500',
  etf: 'bg-violet-500',
  cripto: 'bg-amber-500',
  moeda: 'bg-cyan-500',
  outro: 'bg-slate-400',
};

function PositionRow({ position }: { position: PositionView }) {
  const profitUp = position.profit >= 0;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{position.ticker}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {ASSET_CLASS_LABELS[position.asset_class]}
          </Badge>
          {!position.hasQuote && (
            <span title="Sem cotação — usando preço médio">
              <WifiOff className="w-3 h-3 text-muted-foreground/60" />
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {position.quantity} × {formatCurrency(position.currentPrice)}
          {position.dayChangePct !== null && (
            <span
              className={cn(
                'ml-1.5',
                position.dayChangePct >= 0 ? 'text-income' : 'text-expense',
              )}
            >
              {position.dayChangePct >= 0 ? '+' : ''}
              {position.dayChangePct.toFixed(2)}% hoje
            </span>
          )}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-mono font-semibold">{formatCurrency(position.marketValue)}</p>
        <p className={cn('text-xs font-medium', profitUp ? 'text-income' : 'text-expense')}>
          {profitUp ? '▲' : '▼'} {formatPercent(Math.abs(position.profitPct))}
        </p>
      </div>
    </div>
  );
}

/**
 * Card de investimentos do Dashboard: valor de mercado da carteira, alocação
 * por classe e posições com cotação ao vivo. O CRUD fica no PortfolioManager.
 */
export const PortfolioCard = memo(function PortfolioCard() {
  const {
    investments,
    portfolio,
    isLoading,
    isQuoting,
    lastUpdated,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    refreshQuotes,
  } = useInvestments();

  const profitUp = portfolio.totalProfit >= 0;

  if (isLoading) {
    return (
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Investimentos</span>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between items-center animate-pulse">
            <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
            <div className="h-4 w-20 bg-muted-foreground/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="glass card-elevated rounded-xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Briefcase className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">Investimentos</span>
          {lastUpdated && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              · cotações {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {investments.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Atualizar cotações"
              onClick={refreshQuotes}
              disabled={isQuoting}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isQuoting && 'animate-spin')} />
            </Button>
          )}
          <PortfolioManager
            investments={investments}
            portfolio={portfolio}
            onCreate={createInvestment}
            onUpdate={updateInvestment}
            onDelete={deleteInvestment}
          />
        </div>
      </div>

      {investments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Acompanhe sua carteira em tempo real</p>
          <p className="text-xs mt-1">
            Ações, FIIs, cripto e moedas com cotação ao vivo — clique em “Gerenciar” para começar.
          </p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Valor de mercado</p>
              <p className="text-2xl font-bold font-mono">{formatCurrency(portfolio.totalValue)}</p>
            </div>
            {portfolio.totalCost > 0 && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium pb-0.5',
                  profitUp ? 'text-income' : 'text-expense',
                )}
              >
                {profitUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatCurrency(Math.abs(portfolio.totalProfit))} ({formatPercent(Math.abs(portfolio.totalProfitPct))})
              </div>
            )}
          </div>

          {/* Alocação por classe */}
          {portfolio.totalValue > 0 && portfolio.byClass.length > 1 && (
            <div className="mb-3">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full">
                {portfolio.byClass.map((slice) => (
                  <div
                    key={slice.asset_class}
                    className={CLASS_BAR_COLORS[slice.asset_class]}
                    style={{ width: `${(slice.value / portfolio.totalValue) * 100}%` }}
                    title={`${ASSET_CLASS_LABELS[slice.asset_class]}: ${formatCurrency(slice.value)}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {portfolio.byClass.map((slice) => (
                  <span
                    key={slice.asset_class}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                  >
                    <span className={cn('w-2 h-2 rounded-full', CLASS_BAR_COLORS[slice.asset_class])} />
                    {ASSET_CLASS_LABELS[slice.asset_class]}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Posições */}
          <div>
            {portfolio.positions.map((position) => (
              <PositionRow key={position.id} position={position} />
            ))}
          </div>
        </>
      )}
    </div>
  );
});
