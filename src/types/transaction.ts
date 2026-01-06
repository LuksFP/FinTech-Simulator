export type TransactionType = 'entrada' | 'saida';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  created_at: string;
}

export interface TransactionFormData {
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
}

export interface TransactionStats {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export type FilterType = 'all' | 'entrada' | 'saida';
export type SortType = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
