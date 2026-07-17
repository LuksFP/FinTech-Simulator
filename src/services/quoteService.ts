import { supabase } from '@/integrations/supabase/client';
import type { Quote } from '@/types/investment';

export interface QuoteRequestSymbol {
  ticker: string;
  asset_class: string;
}

export interface QuoteResponse {
  quotes: Record<string, Quote>;
  errors: string[];
}

export const quoteService = {
  /**
   * Busca cotações atuais via Edge Function `market-quote`
   * (brapi.dev com fallback Yahoo Finance para B3; AwesomeAPI para cripto/moeda).
   * As chaves de `quotes` vêm normalizadas em MAIÚSCULAS.
   */
  async getQuotes(symbols: QuoteRequestSymbol[]): Promise<QuoteResponse> {
    if (symbols.length === 0) return { quotes: {}, errors: [] };

    const { data, error } = await supabase.functions.invoke('market-quote', {
      body: { symbols },
    });

    if (error) throw new Error('Erro ao buscar cotações');

    return {
      quotes: (data?.quotes as Record<string, Quote>) ?? {},
      errors: (data?.errors as string[]) ?? [],
    };
  },
};
