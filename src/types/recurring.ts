import type { Category, TransactionType } from './transaction';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  category?: Category;
  frequency: Frequency;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringFormData {
  description: string;
  amount: number;
  type: TransactionType;
  category_id?: string;
  frequency: Frequency;
  next_due_date: string;
}

export const frequencyLabels: Record<Frequency, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};
