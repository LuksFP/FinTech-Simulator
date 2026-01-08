import { supabase } from '@/integrations/supabase/client';
import type { Category, CategoryFormData } from '@/types/transaction';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Erro ao carregar categorias');
    }

    return data || [];
  },

  async getByType(type: 'entrada' | 'saida'): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Erro ao carregar categorias');
    }

    return data || [];
  },

  async create(category: CategoryFormData): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name.trim(),
        icon: category.icon,
        color: category.color,
        type: category.type,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      throw new Error('Erro ao criar categoria');
    }

    return data;
  },

  async update(id: string, category: CategoryFormData): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: category.name.trim(),
        icon: category.icon,
        color: category.color,
        type: category.type,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw new Error('Erro ao atualizar categoria');
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error('Erro ao excluir categoria');
    }
  },
};
