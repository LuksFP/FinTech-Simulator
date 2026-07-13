import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadQueue,
  enqueueTransaction,
  removeFromQueue,
  isOfflineTempId,
} from '../offlineQueue';
import type { TransactionFormData } from '@/types/transaction';

// localStorage em memória (o ambiente de teste é "node", sem DOM)
function installLocalStorageMock() {
  let store: Record<string, string> = {};
  const mock = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
  vi.stubGlobal('localStorage', mock);
  return () => {
    store = {};
  };
}

const clearStore = installLocalStorageMock();

const validData: TransactionFormData = {
  description: 'Café da tarde',
  amount: 12.5,
  type: 'saida',
  date: '2026-07-13',
};

describe('offlineQueue', () => {
  beforeEach(() => {
    clearStore();
  });

  it('começa vazia', () => {
    expect(loadQueue()).toEqual([]);
  });

  it('enfileira uma transação válida com tempId prefixado e persiste', () => {
    const item = enqueueTransaction(validData);
    expect(item.tempId).toMatch(/^offline-/);
    expect(item.data.description).toBe('Café da tarde');
    expect(loadQueue()).toHaveLength(1);
    expect(loadQueue()[0].tempId).toBe(item.tempId);
  });

  it('zera receipt_url (upload de comprovante não funciona offline)', () => {
    const item = enqueueTransaction({ ...validData, receipt_url: 'algum/caminho.jpg' });
    expect(item.data.receipt_url).toBeNull();
  });

  it('rejeita dados inválidos sem enfileirar', () => {
    expect(() => enqueueTransaction({ ...validData, amount: -5 })).toThrow();
    expect(loadQueue()).toHaveLength(0);
  });

  it('mantém a ordem de inserção', () => {
    enqueueTransaction({ ...validData, description: 'Primeira' });
    enqueueTransaction({ ...validData, description: 'Segunda' });
    const queue = loadQueue();
    expect(queue.map((q) => q.data.description)).toEqual(['Primeira', 'Segunda']);
  });

  it('remove por tempId e devolve a fila restante', () => {
    const a = enqueueTransaction({ ...validData, description: 'A' });
    const b = enqueueTransaction({ ...validData, description: 'B' });
    const remaining = removeFromQueue(a.tempId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tempId).toBe(b.tempId);
    expect(loadQueue()).toHaveLength(1);
  });

  it('ignora conteúdo corrompido no storage', () => {
    localStorage.setItem('myfinance:offline-queue', 'não é json');
    expect(loadQueue()).toEqual([]);
  });

  it('descarta itens malformados dentro do array', () => {
    localStorage.setItem(
      'myfinance:offline-queue',
      JSON.stringify([{ tempId: 'offline-1', data: {}, queuedAt: 'x' }, { lixo: true }]),
    );
    expect(loadQueue()).toHaveLength(1);
  });

  it('isOfflineTempId reconhece o prefixo', () => {
    expect(isOfflineTempId('offline-abc')).toBe(true);
    expect(isOfflineTempId('real-uuid')).toBe(false);
  });
});
