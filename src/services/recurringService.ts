import { supabase } from '@/integrations/supabase/client';
import { assertValid, recurringSchema, uuidSchema } from '@/lib/validation';
import { hasSQLInjectionPattern, hasXSSPattern } from '@/lib/sanitize';
import type { RecurringTransaction, RecurringFormData, Frequency } from '@/types/recurring';

const VALID_FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

function guardDescription(desc: string) {
  if (hasSQLInjectionPattern(desc)) throw new Error('Descrição contém conteúdo inválido');
  if (hasXSSPattern(desc)) throw new Error('Descrição contém conteúdo inválido');
}

function toRecurring(item: Record<string, unknown>): RecurringTransaction {
  const freq = item.frequency as string;
  if (!VALID_FREQUENCIES.includes(freq as Frequency)) {
    throw new Error(`Frequência desconhecida: ${freq}`);
  }
  return { ...item, amount: Number(item.amount), frequency: freq as Frequency } as RecurringTransaction;
}

export const recurringService = {
  async getAll(): Promise<RecurringTransaction[]> {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select(`*, category:categories(*)`)
      .order('next_due_date', { ascending: true });

    if (error) throw new Error('Erro ao carregar transações recorrentes');

    return (data || []).map((item) => toRecurring(item as Record<string, unknown>));
  },

  async create(data: RecurringFormData): Promise<RecurringTransaction> {
    const valid = assertValid(recurringSchema, data);
    guardDescription(valid.description);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: result, error } = await supabase
      .from('recurring_transactions')
      .insert({
        description: valid.description,
        amount: valid.amount,
        type: valid.type,
        category_id: valid.category_id ?? null,
        frequency: valid.frequency,
        next_due_date: valid.next_due_date,
        user_id: user.id,
      })
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw new Error('Erro ao criar transação recorrente');

    return toRecurring(result as Record<string, unknown>);
  },

  async update(id: string, data: RecurringFormData): Promise<RecurringTransaction> {
    assertValid(uuidSchema, id);
    const valid = assertValid(recurringSchema, data);
    guardDescription(valid.description);

    const { data: result, error } = await supabase
      .from('recurring_transactions')
      .update({
        description: valid.description,
        amount: valid.amount,
        type: valid.type,
        category_id: valid.category_id ?? null,
        frequency: valid.frequency,
        next_due_date: valid.next_due_date,
      })
      .eq('id', id)
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw new Error('Erro ao atualizar transação recorrente');

    return toRecurring(result as Record<string, unknown>);
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    assertValid(uuidSchema, id);
    if (typeof isActive !== 'boolean') throw new Error('Status inválido');

    const { error } = await supabase
      .from('recurring_transactions')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw new Error('Erro ao atualizar status');
  },

  async delete(id: string): Promise<void> {
    assertValid(uuidSchema, id);

    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir transação recorrente');
  },
};
