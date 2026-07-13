// Verifica se o backend Supabase está no ar. No plano free o projeto pausa
// após dias sem atividade: o domínio para de resolver (NXDOMAIN → "Failed to
// fetch") e, durante o restore, responde 521 antes de voltar 200. Nesses casos
// queremos mostrar uma tela de manutenção em vez de erros crípticos.

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://pvouegghhzpkhkrffyxj.supabase.co';

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2b3VlZ2doaHpwa2hrcmZmeXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjE1MDksImV4cCI6MjA5MDgzNzUwOX0.oGXbNxEqIwPCA-fhWg6QEee-yEIJqC0xKj6Jv8NrKaw';

const HEALTH_TIMEOUT_MS = 6000;

/**
 * Pinga o endpoint de health do GoTrue (exige a apikey; sem ela responde 401).
 * Retorna true só com um 2xx. Timeout, erro de rede (projeto pausado) ou
 * 5xx/521 → false.
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: SUPABASE_KEY },
      signal: controller.signal,
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
