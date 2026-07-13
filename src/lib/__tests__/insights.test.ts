import { describe, it, expect } from 'vitest';
import { generateInsights } from '../insights';
import type { Transaction, Category } from '@/types/transaction';

const TODAY = new Date(2026, 6, 15); // 15 de julho de 2026

let seq = 0;
function tx(overrides: Partial<Transaction> & { amount: number; date: string }): Transaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    description: overrides.description ?? `Transação ${seq}`,
    type: 'saida',
    created_at: overrides.date,
    user_id: 'u1',
    category_id: null,
    ...overrides,
  } as Transaction;
}

const food: Category = { id: 'cat-food', name: 'Alimentação', icon: 'utensils', color: '#f00', type: 'saida' };

describe('generateInsights', () => {
  it('retorna vazio sem transações', () => {
    expect(generateInsights([], TODAY)).toEqual([]);
  });

  it('detecta aumento por categoria vs mesmo período do mês anterior', () => {
    const transactions = [
      // julho (mês atual, até dia 15): 300 em alimentação
      tx({ amount: 300, date: '2026-07-10', category_id: 'cat-food', category: food }),
      // junho (dias 1-15): 100 em alimentação → +200%
      tx({ amount: 100, date: '2026-06-10', category_id: 'cat-food', category: food }),
    ];

    const insights = generateInsights(transactions, TODAY);
    const increase = insights.find((i) => i.id === 'category-increase');
    expect(increase).toBeDefined();
    expect(increase!.tone).toBe('negative');
    expect(increase!.text).toContain('Alimentação');
    expect(increase!.text).toContain('200%');
  });

  it('ignora a parte do mês anterior fora da janela comparável', () => {
    const transactions = [
      tx({ amount: 300, date: '2026-07-10', category_id: 'cat-food', category: food }),
      // junho dia 20 > dia 15 → fora da comparação de categoria
      tx({ amount: 100, date: '2026-06-20', category_id: 'cat-food', category: food }),
    ];

    const insights = generateInsights(transactions, TODAY);
    expect(insights.find((i) => i.id === 'category-increase')).toBeUndefined();
  });

  it('detecta queda por categoria como insight positivo', () => {
    const transactions = [
      tx({ amount: 100, date: '2026-07-05', category_id: 'cat-food', category: food }),
      tx({ amount: 400, date: '2026-06-05', category_id: 'cat-food', category: food }),
    ];

    const insights = generateInsights(transactions, TODAY);
    const decrease = insights.find((i) => i.id === 'category-decrease');
    expect(decrease).toBeDefined();
    expect(decrease!.tone).toBe('positive');
    expect(decrease!.text).toContain('75%');
  });

  it('projeta gastos do fim do mês com base no ritmo', () => {
    const transactions = [
      // 15 dias × R$ 10/dia = 150 até dia 15 → projeção 310 no mês de 31 dias
      tx({ amount: 150, date: '2026-07-08' }),
      // mês passado inteiro: 300 → projeção ~+3%, tom neutro
      tx({ amount: 300, date: '2026-06-25' }),
    ];

    const insights = generateInsights(transactions, TODAY);
    const projection = insights.find((i) => i.id === 'expense-projection');
    expect(projection).toBeDefined();
    expect(projection!.tone).toBe('neutral');
  });

  it('alerta quando a projeção estoura o mês anterior', () => {
    const transactions = [
      tx({ amount: 500, date: '2026-07-08' }),
      tx({ amount: 300, date: '2026-06-25' }),
    ];

    const insights = generateInsights(transactions, TODAY);
    const projection = insights.find((i) => i.id === 'expense-projection');
    expect(projection!.tone).toBe('warning');
  });

  it('projeta fim do mês no vermelho como warning', () => {
    const transactions = [
      tx({ amount: 1000, date: '2026-07-02', type: 'entrada' }),
      tx({ amount: 800, date: '2026-07-08' }), // projeção ~1653 > 1000
    ];

    const insights = generateInsights(transactions, TODAY);
    const balance = insights.find((i) => i.id === 'balance-projection');
    expect(balance).toBeDefined();
    expect(balance!.tone).toBe('warning');
    expect(balance!.text).toContain('vermelho');
  });

  it('não projeta no início do mês (ruído)', () => {
    const earlyToday = new Date(2026, 6, 3);
    const transactions = [
      tx({ amount: 200, date: '2026-07-02' }),
      tx({ amount: 300, date: '2026-06-25' }),
    ];

    const insights = generateInsights(transactions, earlyToday);
    expect(insights.find((i) => i.id === 'expense-projection')).toBeUndefined();
  });

  it('destaca o maior gasto do mês quando relevante', () => {
    const transactions = [
      tx({ amount: 900, date: '2026-07-03', description: 'Notebook' }),
      tx({ amount: 100, date: '2026-07-05' }),
    ];

    const insights = generateInsights(transactions, TODAY);
    const top = insights.find((i) => i.id === 'top-expense');
    expect(top).toBeDefined();
    expect(top!.text).toContain('Notebook');
  });

  it('retorna no máximo 3 insights, warnings primeiro', () => {
    const transactions = [
      tx({ amount: 2000, date: '2026-07-02', type: 'entrada' }),
      tx({ amount: 300, date: '2026-07-10', category_id: 'cat-food', category: food, description: 'Mercadão' }),
      tx({ amount: 2200, date: '2026-07-08', description: 'Aluguel' }),
      tx({ amount: 100, date: '2026-06-10', category_id: 'cat-food', category: food }),
      tx({ amount: 500, date: '2026-06-25' }),
    ];

    const insights = generateInsights(transactions, TODAY);
    expect(insights.length).toBeLessThanOrEqual(3);
    expect(insights[0].tone).toBe('warning');
  });
});
