import { supabase } from '@/integrations/supabase/client';
import type { FinancialGoal } from '@/types/transaction';

export const goalService = {
  async getAll(): Promise<FinancialGoal[]> {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error);
      throw new Error('Erro ao carregar metas');
    }

    return (data || []).map(item => ({
      ...item,
      target_amount: Number(item.target_amount),
    }));
  },

  async getCurrentMonthGoal(): Promise<FinancialGoal | null> {
    const now = new Date();
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .maybeSingle();

    if (error) {
      console.error('Error fetching current goal:', error);
      throw new Error('Erro ao carregar meta atual');
    }

    return data ? { ...data, target_amount: Number(data.target_amount) } : null;
  },

  async upsert(targetAmount: number, month: number, year: number): Promise<FinancialGoal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Check if goal exists
    const { data: existing } = await supabase
      .from('financial_goals')
      .select('id')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('financial_goals')
        .update({ target_amount: targetAmount })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error('Erro ao atualizar meta');
      return { ...data, target_amount: Number(data.target_amount) };
    } else {
      // Insert
      const { data, error } = await supabase
        .from('financial_goals')
        .insert({
          user_id: user.id,
          target_amount: targetAmount,
          month,
          year,
        })
        .select()
        .single();

      if (error) throw new Error('Erro ao criar meta');
      return { ...data, target_amount: Number(data.target_amount) };
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('financial_goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting goal:', error);
      throw new Error('Erro ao excluir meta');
    }
  },
};
