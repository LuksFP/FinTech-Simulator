// Edge Function: market-quote
// Cotação de ativos para a carteira de investimentos do MyFinance.
//   - Ações / FIIs / ETFs (B3): brapi.dev (se BRAPI_TOKEN estiver setado) com
//     fallback automático para o Yahoo Finance (sufixo .SA, sem token).
//   - Moeda: Yahoo (ex.: USDBRL=X) — já em BRL.
//   - Cripto: Yahoo (ex.: BTC-USD) convertido para BRL via USDBRL=X.
// Yahoo é a fonte única confiável a partir de datacenter (não exige token).
// Requisição: POST { symbols: [{ ticker, asset_class }] }
// Resposta:  { quotes: { TICKER: { price, currency, change_pct, source } }, errors: string[] }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SymbolReq {
  ticker: string;
  asset_class: string;
}

interface Quote {
  price: number;
  currency: string;
  change_pct: number | null;
  source: string;
}

const BRAPI_TOKEN = Deno.env.get('BRAPI_TOKEN') ?? '';

// Provedores recusam requisições sem User-Agent a partir de datacenter.
const UA = { 'User-Agent': 'Mozilla/5.0 (MyFinance market-quote)' };

const norm = (t: unknown): string => (typeof t === 'string' ? t.trim().toUpperCase() : '');

// --- brapi.dev (B3, opcional — só com token) -------------------------------
async function fetchBrapi(tickers: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  if (tickers.length === 0 || !BRAPI_TOKEN) return out;

  const url = `https://brapi.dev/api/quote/${encodeURIComponent(tickers.join(','))}?token=${BRAPI_TOKEN}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`brapi ${res.status}`);
  const json = await res.json();

  for (const r of json?.results ?? []) {
    const sym = norm(r?.symbol);
    const price = Number(r?.regularMarketPrice);
    if (sym && Number.isFinite(price) && price > 0) {
      const change = Number(r?.regularMarketChangePercent);
      out[sym] = {
        price,
        currency: 'BRL',
        change_pct: Number.isFinite(change) ? change : null,
        source: 'brapi',
      };
    }
  }
  return out;
}

// --- Yahoo Finance (fonte única sem token) ---------------------------------
async function fetchYahooChart(symbol: string): Promise<{ price: number; changePct: number | null } | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) return null;
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  const price = Number(meta?.regularMarketPrice);
  if (!meta || !Number.isFinite(price) || price <= 0) return null;

  const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
  const changePct = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : null;
  return { price, changePct };
}

/** Monta o símbolo do Yahoo conforme a classe do ativo. */
function yahooSymbol(ticker: string, assetClass: string): string {
  if (assetClass === 'moeda') return `${ticker}BRL=X`;
  if (assetClass === 'cripto') return `${ticker}-USD`; // convertido p/ BRL depois
  return `${ticker}.SA`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const symbols: SymbolReq[] = Array.isArray(body?.symbols) ? body.symbols : [];

    // Dedupe por ticker, guardando a classe.
    const assets = new Map<string, string>();
    for (const s of symbols) {
      const t = norm(s?.ticker);
      if (t && !assets.has(t)) assets.set(t, String(s?.asset_class ?? 'acao'));
    }

    const quotes: Record<string, Quote> = {};

    // Cotação USD/BRL só se houver cripto (para converter USD -> BRL).
    let usdBrl: number | null = null;
    if ([...assets.values()].includes('cripto')) {
      const fx = await fetchYahooChart('USDBRL=X').catch(() => null);
      usdBrl = fx?.price ?? null;
    }

    // brapi em lote para ações/FIIs/ETFs (se houver token).
    const stockTickers = [...assets]
      .filter(([, c]) => c !== 'cripto' && c !== 'moeda')
      .map(([t]) => t);
    if (BRAPI_TOKEN && stockTickers.length > 0) {
      try {
        Object.assign(quotes, await fetchBrapi(stockTickers));
      } catch {
        // segue para o Yahoo
      }
    }

    // Yahoo para o que ainda falta.
    for (const [ticker, assetClass] of assets) {
      if (quotes[ticker]) continue;
      try {
        const q = await fetchYahooChart(yahooSymbol(ticker, assetClass));
        if (!q) continue;

        let price = q.price;
        if (assetClass === 'cripto') {
          if (!usdBrl) continue; // sem taxa de câmbio não dá para converter
          price = price * usdBrl;
        }
        quotes[ticker] = {
          price,
          currency: 'BRL',
          change_pct: q.changePct,
          source: 'yahoo',
        };
      } catch {
        // ignora: fica em errors
      }
    }

    const errors: string[] = [];
    for (const s of symbols) {
      const t = norm(s?.ticker);
      if (t && !quotes[t] && !errors.includes(t)) errors.push(t);
    }

    return new Response(JSON.stringify({ quotes, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ quotes: {}, errors: [], error: e instanceof Error ? e.message : 'erro' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
