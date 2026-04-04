import { supabase } from '@/integrations/supabase/client';
import { assertValid, transactionSchema, uuidSchema } from '@/lib/validation';
import { hasSQLInjectionPattern, hasXSSPattern } from '@/lib/sanitize';
import type { Transaction, TransactionFormData } from '@/types/transaction';

function guardString(value: string, field: string) {
  if (hasSQLInjectionPattern(value)) throw new Error(`${field} contém conteúdo inválido`);
  if (hasXSSPattern(value)) throw new Error(`${field} contém conteúdo inválido`);
}

export const transactionService = {
  async getAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, category:categories(*)`)
      .order('date', { ascending: false });

    if (error) throw new Error('Erro ao carregar transações');

    return (data || []).map((item) => ({ ...item, amount: Number(item.amount) }));
  },

  async create(transaction: TransactionFormData): Promise<Transaction> {
    const valid = assertValid(transactionSchema, transaction);
    guardString(valid.description, 'Descrição');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        description: valid.description,
        amount: valid.amount,
        type: valid.type,
        date: valid.date,
        category_id: valid.category_id ?? null,
        user_id: user.id,
      })
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw new Error('Erro ao criar transação');

    return { ...data, amount: Number(data.amount) };
  },

  async update(id: string, transaction: TransactionFormData): Promise<Transaction> {
    assertValid(uuidSchema, id);
    const valid = assertValid(transactionSchema, transaction);
    guardString(valid.description, 'Descrição');

    const { data, error } = await supabase
      .from('transactions')
      .update({
        description: valid.description,
        amount: valid.amount,
        type: valid.type,
        date: valid.date,
        category_id: valid.category_id ?? null,
      })
      .eq('id', id)
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw new Error('Erro ao atualizar transação');

    return { ...data, amount: Number(data.amount) };
  },

  async delete(id: string): Promise<void> {
    assertValid(uuidSchema, id);

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir transação');
  },
};
