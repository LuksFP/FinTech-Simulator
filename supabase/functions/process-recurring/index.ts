import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida';
  category_id: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_due_date: string;
  is_active: boolean;
}

function calculateNextDueDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting recurring transactions processing...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing recurring transactions for date: ${today}`);
    
    // Get all active recurring transactions due today or earlier
    const { data: recurringTransactions, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', today);
    
    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError);
      throw fetchError;
    }
    
    console.log(`Found ${recurringTransactions?.length || 0} recurring transactions to process`);
    
    let created = 0;
    let failed = 0;
    
    for (const recurring of (recurringTransactions || []) as RecurringTransaction[]) {
      try {
        // Create the transaction
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: recurring.user_id,
            description: recurring.description,
            amount: recurring.amount,
            type: recurring.type,
            category_id: recurring.category_id,
            date: recurring.next_due_date,
          });
        
        if (insertError) {
          console.error(`Error creating transaction for recurring ${recurring.id}:`, insertError);
          failed++;
          continue;
        }
        
        // Update the next due date
        const nextDueDate = calculateNextDueDate(recurring.next_due_date, recurring.frequency);
        
        const { error: updateError } = await supabase
          .from('recurring_transactions')
          .update({ next_due_date: nextDueDate })
          .eq('id', recurring.id);
        
        if (updateError) {
          console.error(`Error updating next due date for ${recurring.id}:`, updateError);
        }
        
        created++;
        console.log(`Created transaction from recurring ${recurring.id}, next due: ${nextDueDate}`);
      } catch (err) {
        console.error(`Failed to process recurring ${recurring.id}:`, err);
        failed++;
      }
    }
    
    const result = {
      success: true,
      date: today,
      processed: recurringTransactions?.length || 0,
      created,
      failed,
    };
    
    console.log('Processing complete:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in process-recurring function:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
