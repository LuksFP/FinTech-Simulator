import { supabase } from '@/integrations/supabase/client';
import { assertValid, categorySchema, uuidSchema } from '@/lib/validation';
import { hasSQLInjectionPattern, hasXSSPattern } from '@/lib/sanitize';
import type { Category, CategoryFormData } from '@/types/transaction';

function guardName(name: string) {
  if (hasSQLInjectionPattern(name)) throw new Error('Nome contém conteúdo inválido');
  if (hasXSSPattern(name)) throw new Error('Nome contém conteúdo inválido');
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw new Error('Erro ao carregar categorias');
    return data || [];
  },

  async getByType(type: 'entrada' | 'saida'): Promise<Category[]> {
    if (type !== 'entrada' && type !== 'saida') throw new Error('Tipo inválido');

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('name');

    if (error) throw new Error('Erro ao carregar categorias');
    return data || [];
  },

  async create(category: CategoryFormData): Promise<Category> {
    const valid = assertValid(categorySchema, category);
    guardName(valid.name);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: valid.name,
        icon: valid.icon,
        color: valid.color,
        type: valid.type,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw new Error('Erro ao criar categoria');
    return data;
  },

  async update(id: string, category: CategoryFormData): Promise<Category> {
    assertValid(uuidSchema, id);
    const valid = assertValid(categorySchema, category);
    guardName(valid.name);

    const { data, error } = await supabase
      .from('categories')
      .update({ name: valid.name, icon: valid.icon, color: valid.color, type: valid.type })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Erro ao atualizar categoria');
    return data;
  },

  async delete(id: string): Promise<void> {
    assertValid(uuidSchema, id);

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir categoria');
  },
};
