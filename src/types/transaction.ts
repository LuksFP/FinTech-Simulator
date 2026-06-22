export type TransactionType = 'entrada' | 'saida';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  user_id?: string | null;
}

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  created_at: string;
  user_id: string;
  category_id: string | null;
  category?: Category;
  receipt_url?: string | null;
  account_id?: string | null;
}

export interface TransactionFormData {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  category_id?: string;
  receipt_url?: string | null;
  account_id?: string | null;
}

export interface TransactionStats {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  target_amount: number;
  month: number;
  year: number;
  created_at: string;
}

export type FilterType = 'all' | 'entrada' | 'saida';
export type SortType = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
export type PeriodType = 'all' | '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'custom';
