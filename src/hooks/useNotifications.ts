import { useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { SPENDING_ALERT_THRESHOLD } from '@/lib/constants';
import { emailSchema } from '@/lib/validation';
import { apiRateLimiter } from '@/lib/rateLimiter';

async function getNotificationSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('notification_email, spending_limit')
    .eq('user_id', user.id)
    .single();

  if (!data?.notification_email || !data?.spending_limit) return null;

  // Validate email format before using it to send
  const emailResult = emailSchema.safeParse(data.notification_email);
  if (!emailResult.success) return null;

  const limit = Number(data.spending_limit);
  if (!Number.isFinite(limit) || limit <= 0) return null;

  return { email: emailResult.data, limit };
}

async function getMonthlyExpenses(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'saida')
    .gte('date', start)
    .lte('date', end);

  return (data || []).reduce((sum, t) => sum + Number(t.amount), 0);
}

async function sendEmail(payload: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Rate limit: at most 60 notifications per minute
  const { allowed } = apiRateLimiter.check('notification:send');
  if (!allowed) return;

  await supabase.functions.invoke('send-notification', {
    body: payload,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}

export function useNotifications() {
  const checkSpendingAlert = useCallback(async () => {
    try {
      const settings = await getNotificationSettings();
      if (!settings) return;

      const totalExpense = await getMonthlyExpenses();
      if (!Number.isFinite(totalExpense) || totalExpense <= 0) return;

      if (totalExpense / settings.limit >= SPENDING_ALERT_THRESHOLD) {
        await sendEmail({
          to: settings.email,
          type: 'spending_alert',
          data: { totalExpense, spendingLimit: settings.limit },
        });
      }
    } catch {
      // Silent fail — notification must not interrupt the main flow
    }
  }, []);

  const sendMonthlyReport = useCallback(async (totalIncome: number, totalExpense: number) => {
    try {
      if (!Number.isFinite(totalIncome) || !Number.isFinite(totalExpense)) return;

      const settings = await getNotificationSettings();
      if (!settings) return;

      const month = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

      await sendEmail({
        to: settings.email,
        type: 'monthly_report',
        data: { totalIncome, totalExpense, balance: totalIncome - totalExpense, month },
      });
    } catch {
      // Silent fail
    }
  }, []);

  return { checkSpendingAlert, sendMonthlyReport };
}
