import { useState, useEffect, useCallback } from 'react';
import { creditCardService } from '@/services/creditCardService';
import type {
  CreditCard,
  CreditCardFormData,
  CardTransaction,
  CardPurchaseFormData,
  CardInvoicePayment,
} from '@/types/creditCard';

export function useCreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [payments, setPayments] = useState<CardInvoicePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [cardsData, txData, paymentsData] = await Promise.all([
        creditCardService.getCards(),
        creditCardService.getCardTransactions(),
        creditCardService.getPayments(),
      ]);
      setCards(cardsData);
      setCardTransactions(txData);
      setPayments(paymentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createCard = useCallback(async (data: CreditCardFormData) => {
    const created = await creditCardService.createCard(data);
    setCards(prev => [...prev, created]);
    return created;
  }, []);

  const updateCard = useCallback(async (id: string, data: CreditCardFormData) => {
    const updated = await creditCardService.updateCard(id, data);
    setCards(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    await creditCardService.deleteCard(id);
    setCards(prev => prev.filter(c => c.id !== id));
    setCardTransactions(prev => prev.filter(t => t.card_id !== id));
    setPayments(prev => prev.filter(p => p.card_id !== id));
  }, []);

  const addPurchase = useCallback(async (card: CreditCard, data: CardPurchaseFormData) => {
    const created = await creditCardService.createPurchase(card, data);
    setCardTransactions(prev => [...created, ...prev]);
    return created;
  }, []);

  const deletePurchase = useCallback(async (purchaseGroupId: string) => {
    await creditCardService.deletePurchase(purchaseGroupId);
    setCardTransactions(prev => prev.filter(t => t.purchase_group_id !== purchaseGroupId));
  }, []);

  const payInvoice = useCallback(
    async (params: { card: CreditCard; invoiceMonth: string; amount: number; accountId: string | null }) => {
      const payment = await creditCardService.payInvoice(params);
      setPayments(prev => [payment, ...prev]);
      return payment;
    },
    []
  );

  return {
    cards,
    cardTransactions,
    payments,
    isLoading,
    error,
    createCard,
    updateCard,
    deleteCard,
    addPurchase,
    deletePurchase,
    payInvoice,
    refetch: fetchAll,
  };
}
