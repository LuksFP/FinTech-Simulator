import { supabase } from '@/integrations/supabase/client';
import { assertValid, investmentSchema, uuidSchema } from '@/lib/validation';
import { normalizeTicker } from '@/lib/portfolio';
import type { Investment, InvestmentFormData } from '@/types/investment';

function mapRow(row: {
  quantity: number | string;
  avg_price: number | string;
  [k: string]: unknown;
}): Investment {
  return {
    ...(row as unknown as Investment),
    quantity: Number(row.quantity),
    avg_price: Number(row.avg_price),
  };
}

export const investmentService = {
  async getAll(): Promise<Investment[]> {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error('Erro ao carregar investimentos');
    return (data || []).map(mapRow);
  },

  async create(input: InvestmentFormData): Promise<Investment> {
    const valid = assertValid(investmentSchema, input);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('investments')
      .insert({
        user_id: user.id,
        ticker: normalizeTicker(valid.ticker),
        asset_class: valid.asset_class,
        quantity: valid.quantity,
        avg_price: valid.avg_price,
        notes: valid.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Você já tem esse ativo na carteira. Edite a posição existente.');
      throw new Error('Erro ao adicionar investimento');
    }
    return mapRow(data);
  },

  async update(id: string, input: InvestmentFormData): Promise<Investment> {
    assertValid(uuidSchema, id);
    const valid = assertValid(investmentSchema, input);

    const { data, error } = await supabase
      .from('investments')
      .update({
        ticker: normalizeTicker(valid.ticker),
        asset_class: valid.asset_class,
        quantity: valid.quantity,
        avg_price: valid.avg_price,
        notes: valid.notes ?? null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Você já tem esse ativo na carteira.');
      throw new Error('Erro ao atualizar investimento');
    }
    return mapRow(data);
  },

  async delete(id: string): Promise<void> {
    assertValid(uuidSchema, id);
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir investimento');
  },
};
