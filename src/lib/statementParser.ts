import { parse, format, isValid } from 'date-fns';
import type { TransactionType } from '@/types/transaction';

// ---------------------------------------------------------------------------
// Linha normalizada de um extrato (CSV/XLSX mapeado ou OFX)
// ---------------------------------------------------------------------------

export interface StatementRow {
  date: string; // yyyy-MM-dd
  description: string;
  amount: number; // sempre positivo; o sinal vira `type`
  type: TransactionType;
}

export type RawRow = Record<string, unknown>;

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Parsing de valores (CSV/XLSX)
// ---------------------------------------------------------------------------

const DATE_FORMATS = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'd/M/yyyy',
  'M/d/yyyy',
  'dd/MM/yy',
  'MM/dd/yy',
  'yyyy/MM/dd',
];

export function parseDate(raw: unknown, excelDateParser?: (serial: number) => Date | null): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (raw === null || raw === undefined || raw === '') return today;

  // Número serial do Excel
  if (typeof raw === 'number') {
    const d = excelDateParser?.(raw);
    if (d && isValid(d)) return format(d, 'yyyy-MM-dd');
    return today;
  }

  const str = String(raw).trim();
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  }

  const native = new Date(str);
  if (isValid(native)) return format(native, 'yyyy-MM-dd');

  return today;
}

export function parseAmount(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return Math.abs(raw);
  const str = String(raw)
    .trim()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

const DEBIT_KEYWORDS = /d[eé]bit|saida|saída|despesa|expense|out|pagamento|withdraw/i;
const CREDIT_KEYWORDS = /credit|entrada|receita|income|deposit|in/i;

export function detectType(raw: unknown, amountRaw: unknown): TransactionType {
  // Convenção de sinal: valor negativo → saída
  if (typeof amountRaw === 'number' && amountRaw < 0) return 'saida';
  if (typeof amountRaw === 'string') {
    const cleaned = String(amountRaw).replace(/[R$\s.]/g, '').replace(',', '.');
    if (parseFloat(cleaned) < 0) return 'saida';
  }

  const str = String(raw ?? '').toLowerCase().trim();
  if (DEBIT_KEYWORDS.test(str)) return 'saida';
  return 'entrada';
}

// ---------------------------------------------------------------------------
// Auto-detecção de colunas (CSV/XLSX)
// ---------------------------------------------------------------------------

function looksLikeTypeColumn(rows: RawRow[], key: string): boolean {
  const values = rows.map((r) => String(r[key] ?? '')).filter(Boolean);
  if (values.length === 0) return false;
  const hits = values.filter((v) => DEBIT_KEYWORDS.test(v) || CREDIT_KEYWORDS.test(v));
  return hits.length / values.length > 0.4;
}

export function autoDetect(headers: string[], rows: RawRow[]): ColumnMapping {
  const mapping: ColumnMapping = { date: '', description: '', amount: '', type: '' };

  const normalized = headers.map((h) => ({ original: h, lower: h.toLowerCase().trim() }));

  for (const { original, lower } of normalized) {
    if (!mapping.date && /^(data|date|fecha|dat[ae])$/.test(lower)) {
      mapping.date = original;
    } else if (!mapping.description && /descri|description|historico|histórico|memo|detail|narrat|particulars/.test(lower)) {
      mapping.description = original;
    } else if (!mapping.amount && /^(valor|amount|value|monto|importe|vlr|val|quantia|price)$/.test(lower)) {
      mapping.amount = original;
    } else if (!mapping.type && /^(tipo|type|categoria|natureza|dc|d\/c|cr\/dr)$/.test(lower)) {
      mapping.type = original;
    }
  }

  // Fallback: match parcial
  for (const { original, lower } of normalized) {
    if (!mapping.date && lower.includes('dat')) mapping.date = original;
    if (!mapping.description && (lower.includes('desc') || lower.includes('hist'))) mapping.description = original;
    if (!mapping.amount && (lower.includes('val') || lower.includes('amo') || lower.includes('vlr'))) mapping.amount = original;
    if (!mapping.type && (lower.includes('tip') || lower.includes('type'))) mapping.type = original;
  }

  // Último recurso: inspeciona os valores das colunas
  if (!mapping.type) {
    for (const h of headers) {
      if (looksLikeTypeColumn(rows, h)) {
        mapping.type = h;
        break;
      }
    }
  }

  return mapping;
}

// ---------------------------------------------------------------------------
// OFX (Open Financial Exchange) — formato de extrato de bancos BR
// ---------------------------------------------------------------------------

export function isOFXFile(fileName: string): boolean {
  return /\.(ofx|qfx)$/i.test(fileName);
}

/**
 * Decodifica o buffer respeitando o charset declarado no header OFX.
 * Bancos brasileiros costumam exportar em windows-1252/latin-1.
 */
export function decodeOFXBuffer(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const header = utf8.slice(0, 600).toUpperCase();
  const declares1252 = /CHARSET[:=]\s*"?1252/.test(header) || /ENCODING[:=]\s*"?USASCII/.test(header);
  if (declares1252 || utf8.includes('�')) {
    try {
      return new TextDecoder('windows-1252').decode(buffer);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

/** DTPOSTED vem como YYYYMMDD ou YYYYMMDDHHMMSS[-3:BRT] */
function parseOFXDate(raw: string): string {
  const digits = raw.trim().slice(0, 8);
  if (/^\d{8}$/.test(digits)) {
    const d = parse(digits, 'yyyyMMdd', new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  return format(new Date(), 'yyyy-MM-dd');
}

/** TRNAMT usa ponto decimal por spec, mas alguns bancos mandam vírgula */
function parseOFXAmount(raw: string): number {
  const str = raw.trim().replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parser de OFX 1.x (SGML) e 2.x (XML). Extrai as transações dos blocos
 * <STMTTRN> — funciona para extrato de conta (BANKMSGSRSV1) e fatura de
 * cartão (CREDITCARDMSGSRSV1).
 */
export function parseOFX(text: string): StatementRow[] {
  const rows: StatementRow[] = [];

  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const block of blocks) {
    // corta no fim do bloco (fechamento explícito ou próximo elemento)
    const body = block.split(/<\/STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>|<\/STMTRS>/i)[0];

    const tag = (name: string): string => {
      const m = body.match(new RegExp(`<${name}>([^\\r\\n<]*)`, 'i'));
      return m ? m[1].trim() : '';
    };

    const rawAmount = tag('TRNAMT');
    if (!rawAmount) continue;

    const amount = parseOFXAmount(rawAmount);
    if (amount === 0) continue;

    const trnType = tag('TRNTYPE').toUpperCase();
    let type: TransactionType;
    if (trnType === 'DEBIT') type = 'saida';
    else if (trnType === 'CREDIT') type = 'entrada';
    else type = amount < 0 ? 'saida' : 'entrada';

    const description = tag('MEMO') || tag('NAME') || 'Transação importada';

    rows.push({
      date: parseOFXDate(tag('DTPOSTED')),
      description,
      amount: Math.abs(amount),
      type,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Detecção de duplicatas
// ---------------------------------------------------------------------------

function normalizeDescription(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chave de comparação: mesma data + valor + tipo + descrição ⇒ duplicata */
export function duplicateKey(t: { date: string; amount: number; type: TransactionType; description: string }): string {
  return `${t.date}|${t.amount.toFixed(2)}|${t.type}|${normalizeDescription(t.description)}`;
}
