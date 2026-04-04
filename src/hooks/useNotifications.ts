import { useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { SPENDING_ALERT_THRESHOLD } from '@/lib/constants';

async function getNotificationSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('notification_email, spending_limit')
    .eq('user_id', user.id)
    .single();

  if (!data?.notification_email || !data?.spending_limit) return null;
  return { email: data.notification_email, limit: Number(data.spending_limit) };
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
      const percent = totalExpense / settings.limit;

      if (percent >= SPENDING_ALERT_THRESHOLD) {
        await sendEmail({
          to: settings.email,
          type: 'spending_alert',
          data: {
            totalExpense,
            spendingLimit: settings.limit,
          },
        });
      }
    } catch {
      // Silent fail — notificação não deve interromper o fluxo principal
    }
  }, []);

  const sendMonthlyReport = useCallback(async (totalIncome: number, totalExpense: number) => {
    try {
      const settings = await getNotificationSettings();
      if (!settings) return;

      const month = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

      await sendEmail({
        to: settings.email,
        type: 'monthly_report',
        data: {
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          month,
        },
      });
    } catch {
      // Silent fail
    }
  }, []);

  return { checkSpendingAlert, sendMonthlyReport };
}
