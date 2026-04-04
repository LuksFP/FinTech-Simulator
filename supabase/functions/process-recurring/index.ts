import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const;
type Frequency = typeof VALID_FREQUENCIES[number];

interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida';
  category_id: string | null;
  frequency: Frequency;
  next_due_date: string;
  is_active: boolean;
}

/**
 * Calculate next due date using UTC to avoid DST bugs.
 * Month-end clamping: Jan 31 + 1 month = Feb 28/29, not Mar 2.
 */
function calculateNextDueDate(currentDate: string, frequency: Frequency): string {
  const [y, m, d] = currentDate.split('-').map(Number);

  if (frequency === 'daily') {
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0];
  }
  if (frequency === 'weekly') {
    return new Date(Date.UTC(y, m - 1, d + 7)).toISOString().split('T')[0];
  }
  if (frequency === 'monthly') {
    const lastDayOfNextMonth = new Date(Date.UTC(y, m, 0)).getDate();
    const clampedDay = Math.min(d, lastDayOfNextMonth);
    return new Date(Date.UTC(y, m - 1 + 1, clampedDay)).toISOString().split('T')[0];
  }
  // yearly
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().split('T')[0];
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

/**
 * Timing-safe string comparison — prevents timing attacks on secrets.
 * Uses crypto.subtle to avoid short-circuit evaluation.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const ka = await crypto.subtle.importKey('raw', enc.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kb = await crypto.subtle.importKey('raw', enc.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const msg = enc.encode('timing-safe-compare');
  const [sa, sb] = await Promise.all([
    crypto.subtle.sign('HMAC', ka, msg),
    crypto.subtle.sign('HMAC', kb, msg),
  ]);
  const va = new Uint8Array(sa);
  const vb = new Uint8Array(sb);
  if (va.length !== vb.length) return false;
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

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
    // Require CRON_SECRET — timing-safe comparison prevents brute-force timing attacks
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (cronSecret) {
      const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const valid = await timingSafeEqual(provided, cronSecret);
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', today);

    if (fetchError) throw new Error(fetchError.message);

    const items = (recurringTransactions || []) as RecurringTransaction[];
    console.log(`Processing ${items.length} recurring transactions for ${today}`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const recurring of items) {
      try {
        // Runtime validation — guard against corrupt DB data
        if (!isValidUUID(recurring.id) || !isValidUUID(recurring.user_id)) {
          console.warn('Skipping record: invalid UUIDs');
          skipped++;
          continue;
        }
        if (!VALID_FREQUENCIES.includes(recurring.frequency)) {
          console.warn(`Skipping record: invalid frequency "${recurring.frequency}"`);
          skipped++;
          continue;
        }
        const amount = Number(recurring.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          console.warn('Skipping record: invalid amount');
          skipped++;
          continue;
        }
        if (!['entrada', 'saida'].includes(recurring.type)) {
          console.warn(`Skipping record: invalid type "${recurring.type}"`);
          skipped++;
          continue;
        }

        // Idempotency: skip if we already inserted this transaction for this date
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', recurring.user_id)
          .eq('date', recurring.next_due_date)
          .eq('description', recurring.description)
          .eq('amount', recurring.amount)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('recurring_transactions')
            .update({ next_due_date: calculateNextDueDate(recurring.next_due_date, recurring.frequency) })
            .eq('id', recurring.id);
          skipped++;
          continue;
        }

        // Insert transaction
        const { error: insertError } = await supabase.from('transactions').insert({
          user_id: recurring.user_id,
          description: recurring.description,
          amount,
          type: recurring.type,
          category_id: recurring.category_id,
          date: recurring.next_due_date,
        });

        if (insertError) {
          console.error(`Insert failed: ${insertError.message}`);
          failed++;
          continue;
        }

        // Advance next_due_date only after successful insert
        const nextDueDate = calculateNextDueDate(recurring.next_due_date, recurring.frequency);
        await supabase
          .from('recurring_transactions')
          .update({ next_due_date: nextDueDate })
          .eq('id', recurring.id);

        created++;
      } catch (err) {
        console.error(`Unexpected error processing recurring transaction: ${errMsg(err)}`);
        failed++;
      }
    }

    const result = { success: true, date: today, processed: items.length, created, skipped, failed };
    console.log(`Processing complete: created=${created} skipped=${skipped} failed=${failed}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`process-recurring fatal: ${errMsg(error)}`);
    return new Response(JSON.stringify({ success: false, error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
