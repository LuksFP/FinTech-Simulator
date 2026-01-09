import { supabase } from '@/integrations/supabase/client';
import type { RecurringTransaction, RecurringFormData, Frequency } from '@/types/recurring';

export const recurringService = {
  async getAll(): Promise<RecurringTransaction[]> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .order('next_due_date', { ascending: true });

    if (error) {
      console.error('Error fetching recurring transactions:', error);
      throw new Error('Erro ao carregar transações recorrentes');
    }

    return (data || []).map(item => ({
      ...item,
      amount: Number(item.amount),
      frequency: item.frequency as Frequency,
    }));
  },

  async create(data: RecurringFormData): Promise<RecurringTransaction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: result, error } = await supabase
      .from('recurring_transactions')
      .insert({
        description: data.description.trim(),
        amount: data.amount,
        type: data.type,
        category_id: data.category_id || null,
        frequency: data.frequency,
        next_due_date: data.next_due_date,
        user_id: user.id,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) {
      console.error('Error creating recurring transaction:', error);
      throw new Error('Erro ao criar transação recorrente');
    }

    return {
      ...result,
      amount: Number(result.amount),
      frequency: result.frequency as Frequency,
    };
  },

  async update(id: string, data: RecurringFormData): Promise<RecurringTransaction> {
    const { data: result, error } = await supabase
      .from('recurring_transactions')
      .update({
        description: data.description.trim(),
        amount: data.amount,
        type: data.type,
        category_id: data.category_id || null,
        frequency: data.frequency,
        next_due_date: data.next_due_date,
      })
      .eq('id', id)
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) {
      console.error('Error updating recurring transaction:', error);
      throw new Error('Erro ao atualizar transação recorrente');
    }

    return {
      ...result,
      amount: Number(result.amount),
      frequency: result.frequency as Frequency,
    };
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('Error toggling recurring transaction:', error);
      throw new Error('Erro ao atualizar status');
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recurring transaction:', error);
      throw new Error('Erro ao excluir transação recorrente');
    }
  },
};
