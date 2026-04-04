/**
 * Pure sanitization helpers.
 * These functions are a last-resort defense; primary validation is done with Zod schemas.
 */

/** Strip all HTML tags and decode dangerous HTML entities. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/javascript\s*:/gi, '')
    .trim();
}

/**
 * Normalize a monetary value to 2 decimal places.
 * Accepts strings with BRL formatting (R$ 1.234,56 → 1234.56).
 * Throws if the result is not a finite positive number.
 */
export function sanitizeAmount(value: unknown): number {
  let n: number;

  if (typeof value === 'string') {
    // Guard: reject strings that contain non-numeric/non-formatting characters
    // after stripping the allowed BRL symbols — catches SQL injection attempts.
    const stripped = value.replace(/R\$\s*/g, '').replace(/\s/g, '');
    if (!/^-?[\d.,]+$/.test(stripped)) {
      throw new Error('Valor monetário inválido');
    }
    // Normalize BRL formatting: thousands dots and decimal comma
    const cleaned = stripped.replace(/\./g, '').replace(',', '.');
    n = parseFloat(cleaned);
  } else {
    n = Number(value);
  }

  if (!Number.isFinite(n)) throw new Error('Valor monetário inválido');
  if (n <= 0) throw new Error('Valor deve ser positivo');
  if (n > 999_999_999.99) throw new Error('Valor máximo excedido');

  return Math.round(n * 100) / 100;
}

/**
 * Validate and return an ISO date string (YYYY-MM-DD).
 * Throws on invalid or non-existent dates.
 */
export function sanitizeDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new Error('Data inválida (formato esperado: AAAA-MM-DD)');

  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00`);
  if (isNaN(date.getTime())) throw new Error('Data inválida');

  // Guard against obviously wrong years
  const year = date.getFullYear();
  if (year < 1900 || year > 2200) throw new Error('Ano fora do intervalo permitido');

  return `${y}-${m}-${d}`;
}

/**
 * Validate a UUID v4.
 * Throws if the string is not a valid UUID.
 */
export function sanitizeUUID(value: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) throw new Error('ID inválido');
  return value.toLowerCase();
}

/**
 * Check if a string looks like a SQL injection attempt.
 * Not a replacement for parameterized queries — just an extra layer for logging/alerting.
 */
export function hasSQLInjectionPattern(input: string): boolean {
  const patterns = [
    /'\s*(or|and)\s*'?\d/i,
    /'\s*(or|and)\s*1\s*=\s*1/i,
    /;\s*(drop|truncate|delete|insert|update)\s+/i,
    /union\s+(all\s+)?select/i,
    /--(\s|$)/,
    /\bsleep\s*\(\d+\)/i,
    /\bwaitfor\s+delay\b/i,
    /\/\*.*\*\//,
    /xp_\w+/i,
    /exec\s*\(/i,
    /INFORMATION_SCHEMA/i,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Check if a string contains XSS payloads.
 * Not a replacement for output encoding — just an extra layer.
 */
export function hasXSSPattern(input: string): boolean {
  const patterns = [
    /<script[^>]*>/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,       // onerror=, onclick=, etc.
    /<iframe/i,
    /<object/i,
    /data:\s*text\/html/i,
    /vbscript\s*:/i,
    /expression\s*\(/i, // CSS expression()
  ];
  return patterns.some((p) => p.test(input));
}
