import { supabase } from '@/integrations/supabase/client';

export interface TransferFormData {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
  date: string;
}

export const transferService = {
  async create(data: TransferFormData): Promise<void> {
    if (data.from_account_id === data.to_account_id) {
      throw new Error('Escolha contas diferentes para a transferência.');
    }
    if (!(data.amount > 0)) {
      throw new Error('O valor deve ser maior que zero.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase.from('transfers').insert({
      user_id: user.id,
      from_account_id: data.from_account_id,
      to_account_id: data.to_account_id,
      amount: data.amount,
      description: data.description?.trim() || null,
      date: data.date,
    });

    if (error) throw new Error('Erro ao registrar transferência');
  },
};
