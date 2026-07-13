import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { assertValid, creditCardSchema, cardPurchaseSchema, uuidSchema } from '@/lib/validation';
import { hasSQLInjectionPattern, hasXSSPattern } from '@/lib/sanitize';
import { invoiceMonthFor, splitInstallments } from '@/lib/cardInvoice';
import { transactionService } from './transactionService';
import type {
  CreditCard,
  CreditCardFormData,
  CardTransaction,
  CardPurchaseFormData,
  CardInvoicePayment,
} from '@/types/creditCard';

function guardString(value: string, field: string) {
  if (hasSQLInjectionPattern(value)) throw new Error(`${field} contém conteúdo inválido`);
  if (hasXSSPattern(value)) throw new Error(`${field} contém conteúdo inválido`);
}

async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  return user;
}

export const creditCardService = {
  // -------------------------------------------------------------------------
  // Cartões
  // -------------------------------------------------------------------------

  async getCards(): Promise<CreditCard[]> {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error('Erro ao carregar cartões');
    return (data || []).map((c) => ({ ...c, limit_amount: Number(c.limit_amount) }));
  },

  async createCard(card: CreditCardFormData): Promise<CreditCard> {
    const valid = assertValid(creditCardSchema, card);
    guardString(valid.name, 'Nome');
    const user = await requireUser();

    const { data, error } = await supabase
      .from('credit_cards')
      .insert({ ...valid, user_id: user.id })
      .select('*')
      .single();

    if (error) throw new Error('Erro ao criar cartão');
    return { ...data, limit_amount: Number(data.limit_amount) };
  },

  async updateCard(id: string, card: CreditCardFormData): Promise<CreditCard> {
    assertValid(uuidSchema, id);
    const valid = assertValid(creditCardSchema, card);
    guardString(valid.name, 'Nome');

    const { data, error } = await supabase
      .from('credit_cards')
      .update(valid)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error('Erro ao atualizar cartão');
    return { ...data, limit_amount: Number(data.limit_amount) };
  },

  async deleteCard(id: string): Promise<void> {
    assertValid(uuidSchema, id);
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) throw new Error('Erro ao excluir cartão');
  },

  // -------------------------------------------------------------------------
  // Compras (parcelas)
  // -------------------------------------------------------------------------

  async getCardTransactions(): Promise<CardTransaction[]> {
    const { data, error } = await supabase
      .from('card_transactions')
      .select(`*, category:categories(*)`)
      .order('invoice_month', { ascending: false })
      .order('purchase_date', { ascending: false });

    if (error) throw new Error('Erro ao carregar compras do cartão');
    return (data || []).map((t) => ({ ...t, amount: Number(t.amount) }));
  },

  /** Cria uma compra: N parcelas distribuídas pelas faturas seguintes. */
  async createPurchase(card: CreditCard, purchase: CardPurchaseFormData): Promise<CardTransaction[]> {
    const valid = assertValid(cardPurchaseSchema, purchase);
    guardString(valid.description, 'Descrição');
    const user = await requireUser();

    const amounts = splitInstallments(valid.amount, valid.installments);
    const groupId = crypto.randomUUID();

    const rows = amounts.map((amount, i) => ({
      user_id: user.id,
      card_id: card.id,
      description: valid.description,
      amount,
      category_id: valid.category_id ?? null,
      purchase_date: valid.purchase_date,
      installment_number: i + 1,
      installments_total: valid.installments,
      purchase_group_id: groupId,
      invoice_month: invoiceMonthFor(valid.purchase_date, card.closing_day, i + 1),
    }));

    const { data, error } = await supabase
      .from('card_transactions')
      .insert(rows)
      .select(`*, category:categories(*)`);

    if (error) throw new Error('Erro ao lançar compra no cartão');
    return (data || []).map((t) => ({ ...t, amount: Number(t.amount) }));
  },

  /** Exclui a compra inteira (todas as parcelas do grupo). */
  async deletePurchase(purchaseGroupId: string): Promise<void> {
    assertValid(uuidSchema, purchaseGroupId);
    const { error } = await supabase
      .from('card_transactions')
      .delete()
      .eq('purchase_group_id', purchaseGroupId);
    if (error) throw new Error('Erro ao excluir compra');
  },

  // -------------------------------------------------------------------------
  // Pagamentos de fatura
  // -------------------------------------------------------------------------

  async getPayments(): Promise<CardInvoicePayment[]> {
    const { data, error } = await supabase
      .from('card_invoice_payments')
      .select('*')
      .order('invoice_month', { ascending: false });

    if (error) throw new Error('Erro ao carregar pagamentos de fatura');
    return (data || []).map((p) => ({ ...p, amount: Number(p.amount) }));
  },

  /**
   * Registra o pagamento da fatura: cria uma transação de saída na conta
   * (é ela que baixa o saldo) e vincula ao registro de pagamento.
   */
  async payInvoice(params: {
    card: CreditCard;
    invoiceMonth: string;
    amount: number;
    accountId: string | null;
  }): Promise<CardInvoicePayment> {
    const { card, invoiceMonth, amount, accountId } = params;
    const user = await requireUser();

    const transaction = await transactionService.create({
      description: `Pagamento fatura ${card.name}`,
      amount,
      type: 'saida',
      date: format(new Date(), 'yyyy-MM-dd'),
      account_id: accountId,
    });

    const { data, error } = await supabase
      .from('card_invoice_payments')
      .insert({
        user_id: user.id,
        card_id: card.id,
        invoice_month: invoiceMonth,
        amount,
        account_id: accountId,
        transaction_id: transaction.id,
      })
      .select('*')
      .single();

    if (error) {
      // rollback best-effort da transação criada
      try {
        await transactionService.delete(transaction.id);
      } catch {
        // se falhar, a transação fica órfã mas visível/editável pelo usuário
      }
      throw new Error('Erro ao registrar pagamento da fatura');
    }

    return { ...data, amount: Number(data.amount) };
  },
};
