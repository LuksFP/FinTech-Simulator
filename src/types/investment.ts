export type AssetClass = 'acao' | 'fii' | 'etf' | 'cripto' | 'moeda' | 'outro';

export interface Investment {
  id: string;
  user_id: string;
  ticker: string;
  asset_class: AssetClass;
  /** Quantidade de cotas / unidades da posição */
  quantity: number;
  /** Preço médio de compra, em BRL */
  avg_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentFormData {
  ticker: string;
  asset_class: AssetClass;
  quantity: number;
  avg_price: number;
  notes?: string | null;
}

/** Cotação atual devolvida pela Edge Function `market-quote`. */
export interface Quote {
  /** Preço unitário atual em BRL */
  price: number;
  currency: string;
  /** Variação percentual do dia (null quando a fonte não informa) */
  change_pct: number | null;
  /** Fonte usada: brapi | yahoo | awesomeapi */
  source: string;
}

/** Posição enriquecida com a cotação atual e métricas derivadas. */
export interface PositionView extends Investment {
  currentPrice: number;
  /** true quando a cotação veio de uma fonte; false = usando o preço médio como fallback */
  hasQuote: boolean;
  dayChangePct: number | null;
  cost: number;
  marketValue: number;
  profit: number;
  profitPct: number;
}

export interface PortfolioClassSlice {
  asset_class: AssetClass;
  value: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPct: number;
  positions: PositionView[];
  byClass: PortfolioClassSlice[];
  /** tickers sem cotação disponível */
  missingQuotes: string[];
}
