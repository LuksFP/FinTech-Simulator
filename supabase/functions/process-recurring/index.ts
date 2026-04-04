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
    // Target month = m (0-indexed: next month is m, since m-1+1=m)
    const lastDayOfNextMonth = new Date(Date.UTC(y, m, 0)).getDate();
    const clampedDay = Math.min(d, lastDayOfNextMonth);
    const next = new Date(Date.UTC(y, m - 1 + 1, clampedDay));
    return next.toISOString().split('T')[0];
  }
  // yearly
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().split('T')[0];
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
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
    // Require CRON_SECRET so the endpoint can't be triggered by anyone
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    if (fetchError) throw fetchError;

    const items = (recurringTransactions || []) as RecurringTransaction[];
    console.log(`Processing ${items.length} recurring transactions for ${today}`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const recurring of items) {
      try {
        // Runtime validation — guard against corrupt DB data
        if (!isValidUUID(recurring.id) || !isValidUUID(recurring.user_id)) {
          console.warn(`Invalid UUIDs for recurring ${recurring.id}, skipping`);
          skipped++;
          continue;
        }
        if (!VALID_FREQUENCIES.includes(recurring.frequency)) {
          console.warn(`Invalid frequency "${recurring.frequency}" for ${recurring.id}, skipping`);
          skipped++;
          continue;
        }
        const amount = Number(recurring.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          console.warn(`Invalid amount for recurring ${recurring.id}, skipping`);
          skipped++;
          continue;
        }
        if (!['entrada', 'saida'].includes(recurring.type)) {
          console.warn(`Invalid type "${recurring.type}" for ${recurring.id}, skipping`);
          skipped++;
          continue;
        }

        // Idempotency: skip if we already inserted this exact transaction today
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', recurring.user_id)
          .eq('date', recurring.next_due_date)
          .eq('description', recurring.description)
          .eq('amount', recurring.amount)
          .maybeSingle();

        if (existing) {
          console.log(`Duplicate for recurring ${recurring.id} on ${recurring.next_due_date}, advancing date`);
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
          console.error(`Insert failed for recurring ${recurring.id}:`, insertError);
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
        console.log(`Created transaction from recurring ${recurring.id}, next due: ${nextDueDate}`);
      } catch (err) {
        console.error(`Unexpected error for recurring ${recurring.id}:`, err);
        failed++;
      }
    }

    const result = { success: true, date: today, processed: items.length, created, skipped, failed };
    console.log('Processing complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('process-recurring fatal error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
