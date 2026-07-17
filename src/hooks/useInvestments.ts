import { useState, useEffect, useCallback, useMemo } from 'react';
import { investmentService } from '@/services/investmentService';
import { quoteService } from '@/services/quoteService';
import { buildPortfolio } from '@/lib/portfolio';
import type { Investment, InvestmentFormData, Quote } from '@/types/investment';

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInvestments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const items = await investmentService.getAll();
      setInvestments(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchQuotes = useCallback(async (items: Investment[]) => {
    if (items.length === 0) {
      setQuotes({});
      return;
    }
    try {
      setIsQuoting(true);
      const symbols = items.map((i) => ({ ticker: i.ticker, asset_class: i.asset_class }));
      const { quotes: fresh } = await quoteService.getQuotes(symbols);
      setQuotes(fresh);
      setLastUpdated(new Date());
    } catch {
      // Falha em cotação não deve quebrar a tela — cai no fallback de preço médio.
    } finally {
      setIsQuoting(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  // Refaz as cotações sempre que o conjunto de tickers muda.
  const tickerKey = investments.map((i) => `${i.ticker}:${i.asset_class}`).join('|');
  useEffect(() => {
    if (!isLoading) fetchQuotes(investments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey, isLoading]);

  const portfolio = useMemo(() => buildPortfolio(investments, quotes), [investments, quotes]);

  const createInvestment = useCallback(async (data: InvestmentFormData) => {
    const created = await investmentService.create(data);
    await fetchInvestments();
    return created;
  }, [fetchInvestments]);

  const updateInvestment = useCallback(async (id: string, data: InvestmentFormData) => {
    const updated = await investmentService.update(id, data);
    await fetchInvestments();
    return updated;
  }, [fetchInvestments]);

  const deleteInvestment = useCallback(async (id: string) => {
    await investmentService.delete(id);
    await fetchInvestments();
  }, [fetchInvestments]);

  const refreshQuotes = useCallback(() => fetchQuotes(investments), [fetchQuotes, investments]);

  return {
    investments,
    portfolio,
    isLoading,
    isQuoting,
    error,
    lastUpdated,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    refreshQuotes,
    refetch: fetchInvestments,
  };
}
