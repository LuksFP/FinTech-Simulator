import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// Validation helpers (no external deps in Deno edge runtime)
// ---------------------------------------------------------------------------
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function isFinitePositive(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function sanitizeString(s: unknown, maxLen = 200): string {
  if (typeof s !== 'string') throw new Error('String inválida');
  const trimmed = s.trim();
  if (trimmed.length > maxLen) throw new Error(`String muito longa (máx ${maxLen})`);
  if (/<[^>]+>/.test(trimmed)) throw new Error('HTML não é permitido');
  return trimmed;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------
function buildSpendingAlertEmail(data: { totalExpense: number; spendingLimit: number }): string {
  const pct = Math.round((data.totalExpense / data.spendingLimit) * 100);
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return `
    <h2>Alerta de Gastos</h2>
    <p>Seus gastos este mês atingiram <strong>${pct}%</strong> do seu limite.</p>
    <ul>
      <li>Gastos: <strong>${fmt(data.totalExpense)}</strong></li>
      <li>Limite: <strong>${fmt(data.spendingLimit)}</strong></li>
    </ul>
    <p>Acompanhe suas finanças no <a href="https://fin-tech-simulator.vercel.app">MyFinance</a>.</p>
  `;
}

function buildMonthlyReportEmail(data: {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  month: string;
}): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return `
    <h2>Resumo Mensal — ${data.month}</h2>
    <table>
      <tr><td>Receitas:</td><td><strong>${fmt(data.totalIncome)}</strong></td></tr>
      <tr><td>Despesas:</td><td><strong>${fmt(data.totalExpense)}</strong></td></tr>
      <tr><td>Saldo:</td><td><strong>${fmt(data.balance)}</strong></td></tr>
    </table>
    <p>Acompanhe suas finanças no <a href="https://fin-tech-simulator.vercel.app">MyFinance</a>.</p>
  `;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Verify Bearer token — only authenticated users can trigger emails
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Body inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, type, data } = body as { to?: unknown; type?: unknown; data?: unknown };

    if (typeof to !== 'string' || !isValidEmail(to)) {
      return new Response(JSON.stringify({ error: 'Email destinatário inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['spending_alert', 'monthly_report'].includes(type as string)) {
      return new Response(JSON.stringify({ error: 'Tipo de notificação inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build email content based on type
    let subject: string;
    let html: string;

    if (type === 'spending_alert') {
      const d = data as { totalExpense?: unknown; spendingLimit?: unknown };
      if (!isFinitePositive(d.totalExpense) || !isFinitePositive(d.spendingLimit)) {
        return new Response(JSON.stringify({ error: 'Dados de alerta inválidos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      subject = 'Alerta de Gastos — MyFinance';
      html = buildSpendingAlertEmail({
        totalExpense: d.totalExpense as number,
        spendingLimit: d.spendingLimit as number,
      });
    } else {
      const d = data as { totalIncome?: unknown; totalExpense?: unknown; balance?: unknown; month?: unknown };
      if (
        !isFinitePositive(d.totalIncome) ||
        !isFinitePositive(d.totalExpense) ||
        typeof d.balance !== 'number' ||
        !Number.isFinite(d.balance)
      ) {
        return new Response(JSON.stringify({ error: 'Dados do relatório inválidos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      subject = 'Resumo Mensal — MyFinance';
      html = buildMonthlyReportEmail({
        totalIncome: d.totalIncome as number,
        totalExpense: d.totalExpense as number,
        balance: d.balance as number,
        month: sanitizeString(d.month, 50),
      });
    }

    // 4. Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Serviço de email não configurado' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MyFinance <notificacoes@myfinance.app>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      console.error(`Resend returned ${emailResponse.status}`);
      return new Response(JSON.stringify({ error: 'Falha ao enviar email' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`send-notification error: ${errMsg(err)}`);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
