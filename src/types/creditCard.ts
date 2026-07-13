import type { Category } from './transaction';

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color: string;
  created_at: string;
}

export interface CreditCardFormData {
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color: string;
}

/** Uma parcela de compra no cartão (compra à vista = parcela 1/1). */
export interface CardTransaction {
  id: string;
  user_id: string;
  card_id: string;
  description: string;
  amount: number;
  category_id: string | null;
  category?: Category | null;
  purchase_date: string;
  installment_number: number;
  installments_total: number;
  purchase_group_id: string;
  invoice_month: string; // 1º dia do mês da fatura
  created_at: string;
}

export interface CardPurchaseFormData {
  card_id: string;
  description: string;
  amount: number; // valor TOTAL da compra
  purchase_date: string;
  installments: number;
  category_id?: string | null;
}

export interface CardInvoicePayment {
  id: string;
  user_id: string;
  card_id: string;
  invoice_month: string;
  amount: number;
  account_id: string | null;
  transaction_id: string | null;
  paid_at: string;
}
