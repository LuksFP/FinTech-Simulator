import { supabase } from '@/integrations/supabase/client';
import type { Transaction, TransactionFormData } from '@/types/transaction';

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Erro ao carregar transações');
    }

    return (data || []).map(item => ({
      ...item,
      amount: Number(item.amount),
    }));
  },

  async create(transaction: TransactionFormData): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        description: transaction.description.trim(),
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Erro ao criar transação');
    }

    return {
      ...data,
      amount: Number(data.amount),
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw new Error('Erro ao excluir transação');
    }
  },
};
