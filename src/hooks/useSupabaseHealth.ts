import { useState, useEffect, useCallback, useRef } from 'react';
import { checkSupabaseHealth } from '@/lib/supabaseHealth';

export type HealthStatus = 'ok' | 'down';

const RETRY_INTERVAL_MS = 15000;

/**
 * Monitora a saúde do backend. Otimista: começa 'ok' para não penalizar o
 * caminho feliz com uma espera no boot; só vira 'down' se o ping falhar.
 *
 * Sem internet (navigator.onLine === false) NÃO é manutenção — é a conexão do
 * usuário (tratada pelo modo offline). Então só reporta 'down' quando o browser
 * se diz online mas o Supabase não responde.
 */
export function useSupabaseHealth() {
  const [status, setStatus] = useState<HealthStatus>('ok');
  const [isChecking, setIsChecking] = useState(false);
  const runningRef = useRef(false);

  const check = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (runningRef.current) return;
    runningRef.current = true;
    setIsChecking(true);
    try {
      const healthy = await checkSupabaseHealth();
      setStatus(healthy ? 'ok' : 'down');
    } finally {
      setIsChecking(false);
      runningRef.current = false;
    }
  }, []);

  // Checa no boot.
  useEffect(() => {
    check();
  }, [check]);

  // Recheca quando a conexão volta.
  useEffect(() => {
    const onOnline = () => check();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [check]);

  // Enquanto estiver fora, tenta de novo sozinho (auto-recupera quando o
  // projeto termina de religar).
  useEffect(() => {
    if (status !== 'down') return;
    const id = setInterval(check, RETRY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, check]);

  return { status, isChecking, retry: check };
}
