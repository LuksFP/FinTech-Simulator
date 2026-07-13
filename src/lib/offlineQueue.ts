import { assertValid, transactionSchema } from '@/lib/validation';
import type { TransactionFormData } from '@/types/transaction';

// ---------------------------------------------------------------------------
// Fila de transações criadas offline.
//
// Guardada em localStorage (payloads pequenos). Cada item recebe um `tempId`
// usado como id otimista na UI até a transação real ser criada no Supabase.
// Só cobre CRIAÇÃO — editar/excluir item já sincronizado exige rede.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'myfinance:offline-queue';

export interface QueuedTransaction {
  tempId: string;
  data: TransactionFormData;
  queuedAt: string; // ISO
}

function isQueued(value: unknown): value is QueuedTransaction {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.tempId === 'string' && typeof v.queuedAt === 'string' && typeof v.data === 'object' && v.data !== null;
}

export function loadQueue(): QueuedTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueued);
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // storage cheio/indisponível — silencioso; a UI já refletiu o item em memória
  }
}

/**
 * Valida e enfileira uma nova transação. Lança se os dados forem inválidos
 * (não queremos guardar algo que nunca vai sincronizar). Comprovantes não são
 * suportados offline: o upload precisa de rede, então `receipt_url` é zerado.
 */
export function enqueueTransaction(data: TransactionFormData): QueuedTransaction {
  const valid = assertValid(transactionSchema, data);
  const item: QueuedTransaction = {
    tempId: `offline-${crypto.randomUUID()}`,
    data: { ...valid, receipt_url: null },
    queuedAt: new Date().toISOString(),
  };
  saveQueue([...loadQueue(), item]);
  return item;
}

export function removeFromQueue(tempId: string): QueuedTransaction[] {
  const next = loadQueue().filter((q) => q.tempId !== tempId);
  saveQueue(next);
  return next;
}

export function isOfflineTempId(id: string): boolean {
  return id.startsWith('offline-');
}
