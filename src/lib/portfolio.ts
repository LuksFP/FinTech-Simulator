import type {
  Investment,
  PortfolioSummary,
  PositionView,
  Quote,
  AssetClass,
} from '@/types/investment';

const ASSET_CLASS_ORDER: AssetClass[] = ['acao', 'fii', 'etf', 'cripto', 'moeda', 'outro'];

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  acao: 'Ações',
  fii: 'FIIs',
  etf: 'ETFs',
  cripto: 'Cripto',
  moeda: 'Moeda',
  outro: 'Outros',
};

/** Normaliza um ticker para o formato usado como chave nas cotações. */
export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Combina as posições cadastradas com as cotações atuais e calcula as métricas
 * derivadas (valor de mercado, custo, lucro, rentabilidade) — função pura.
 *
 * Quando não há cotação para um ticker, usa o preço médio como fallback: a
 * posição entra no total pelo custo (lucro zero) e é marcada em `missingQuotes`.
 */
export function buildPortfolio(
  investments: Investment[],
  quotes: Record<string, Quote>,
): PortfolioSummary {
  const positions: PositionView[] = investments.map((inv) => {
    const key = normalizeTicker(inv.ticker);
    const quote = quotes[key];
    const hasQuote = !!quote && Number.isFinite(quote.price) && quote.price > 0;
    const currentPrice = hasQuote ? quote!.price : inv.avg_price;

    const cost = round2(inv.quantity * inv.avg_price);
    const marketValue = round2(inv.quantity * currentPrice);
    const profit = round2(marketValue - cost);
    const profitPct = cost > 0 ? round2((profit / cost) * 100) : 0;

    return {
      ...inv,
      currentPrice,
      hasQuote,
      dayChangePct: hasQuote ? quote!.change_pct : null,
      cost,
      marketValue,
      profit,
      profitPct,
    };
  });

  const totalValue = round2(positions.reduce((s, p) => s + p.marketValue, 0));
  const totalCost = round2(positions.reduce((s, p) => s + p.cost, 0));
  const totalProfit = round2(totalValue - totalCost);
  const totalProfitPct = totalCost > 0 ? round2((totalProfit / totalCost) * 100) : 0;

  const classMap = new Map<AssetClass, number>();
  for (const p of positions) {
    classMap.set(p.asset_class, (classMap.get(p.asset_class) ?? 0) + p.marketValue);
  }
  const byClass = ASSET_CLASS_ORDER.filter((c) => (classMap.get(c) ?? 0) > 0).map((c) => ({
    asset_class: c,
    value: round2(classMap.get(c)!),
  }));

  const missingQuotes = positions.filter((p) => !p.hasQuote).map((p) => normalizeTicker(p.ticker));

  // Maior valor de mercado primeiro
  positions.sort((a, b) => b.marketValue - a.marketValue);

  return {
    totalValue,
    totalCost,
    totalProfit,
    totalProfitPct,
    positions,
    byClass,
    missingQuotes,
  };
}
