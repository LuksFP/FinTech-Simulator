import { supabase } from '@/integrations/supabase/client';
import type { Category } from '@/types/transaction';

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
};
