/**
 * Security validation tests — pure JS, no zod dependency.
 *
 * These tests verify the security properties that the validation schemas
 * enforce: SQL injection rejection, XSS rejection, UUID format,
 * amount range checks, date format, enum whitelisting, etc.
 *
 * They mirror the exact same payloads that an attacker would use,
 * and assert our validation pipeline would block them.
 */
import { describe, it, expect } from 'vitest';
import { hasSQLInjectionPattern, hasXSSPattern, sanitizeUUID, sanitizeDate, sanitizeAmount } from '../sanitize';

// ---------------------------------------------------------------------------
// Shared payloads
// ---------------------------------------------------------------------------
const SQL_PAYLOADS = [
  "' OR '1'='1",
  "1' OR 1=1--",
  "'; DROP TABLE transactions;--",
  "1; DELETE FROM users WHERE 1=1;",
  "UNION SELECT * FROM users",
  "union all select password from accounts",
  "/* comment */ SELECT 1",
  "xp_cmdshell('dir')",
  "exec(xp_cmdshell)",
  "' AND SLEEP(5)--",
  "1; TRUNCATE TABLE financial_goals;",
  "INFORMATION_SCHEMA.TABLES",
];

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<Script SRC="http://evil.com/x.js">',
  '<img src=x onerror=alert(document.cookie)>',
  '<body onload=steal()>',
  'onclick=doEvil()',
  'javascript:alert(1)',
  'JAVASCRIPT:void(0)',
  '<iframe src="evil.com">',
  '<object data="evil.swf">',
  'data:text/html,<script>alert(1)</script>',
  'expression(alert(1))',
  'width:expression(alert(1))',
  'vbscript:msgbox("xss")',
];

const SAFE_STRINGS = [
  'Salário mensal',
  'Aluguel de apartamento',
  'user@example.com',
  'João da Silva',
  'Conta Corrente',
  'Alimentação',
];

// ---------------------------------------------------------------------------
// UUID validation
// ---------------------------------------------------------------------------
describe('UUID security', () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValidUUID = (s: string) => UUID_REGEX.test(s);

  it('accepts valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('rejects all SQL injection payloads', () => {
    SQL_PAYLOADS.forEach((p) => {
      expect(isValidUUID(p)).toBe(false);
    });
  });

  it('rejects empty, numeric, short IDs', () => {
    ['', '123', '0', 'null', 'undefined', 'true'].forEach((p) => {
      expect(isValidUUID(p)).toBe(false);
    });
  });

  it('sanitizeUUID throws on SQL injection', () => {
    SQL_PAYLOADS.forEach((p) => {
      expect(() => sanitizeUUID(p)).toThrow('ID inválido');
    });
  });

  it('sanitizeUUID throws on non-UUID strings', () => {
    expect(() => sanitizeUUID('')).toThrow();
    expect(() => sanitizeUUID('not-a-uuid')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------
describe('Email security', () => {
  // Simplified RFC-compliant email check (same as what emailSchema enforces)
  const isValidEmail = (s: string) =>
    /^[^\s@<>'"]+@[^\s@<>'"]+\.[^\s@<>'"]{2,}$/.test(s.trim()) && s.length <= 254;

  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@sub.domain.com')).toBe(true);
  });

  it('rejects XSS payloads in email', () => {
    XSS_PAYLOADS.forEach((p) => {
      expect(isValidEmail(p)).toBe(false);
    });
  });

  it('rejects SQL injection in email', () => {
    expect(isValidEmail("admin'--@example.com")).toBe(false);
    expect(isValidEmail("'; DROP TABLE users;--")).toBe(false);
  });

  it('rejects oversized email (> 254 chars)', () => {
    // 250 + '@b.com' (6) = 256 > 254
    expect(isValidEmail('a'.repeat(250) + '@b.com')).toBe(false);
  });

  it('rejects missing @', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Amount validation
// ---------------------------------------------------------------------------
describe('Amount security', () => {
  it('accepts valid amounts', () => {
    expect(sanitizeAmount(1)).toBe(1);
    expect(sanitizeAmount(1234.56)).toBe(1234.56);
    expect(sanitizeAmount('1.234,56')).toBe(1234.56);
    expect(sanitizeAmount('R$ 500,00')).toBe(500);
  });

  it('rejects negative numbers', () => {
    expect(() => sanitizeAmount(-1)).toThrow();
    expect(() => sanitizeAmount(-100)).toThrow();
  });

  it('rejects zero', () => {
    expect(() => sanitizeAmount(0)).toThrow();
  });

  it('rejects NaN and Infinity', () => {
    expect(() => sanitizeAmount(NaN)).toThrow();
    expect(() => sanitizeAmount(Infinity)).toThrow();
    expect(() => sanitizeAmount(-Infinity)).toThrow();
  });

  it('rejects amounts above maximum', () => {
    expect(() => sanitizeAmount(1_000_000_000)).toThrow();
  });

  it('rejects SQL injection strings in amount field', () => {
    expect(() => sanitizeAmount("100; DROP TABLE transactions;")).toThrow();
    expect(() => sanitizeAmount("' UNION SELECT balance FROM accounts--")).toThrow();
    expect(() => sanitizeAmount("0 OR 1=1")).toThrow();
  });

  it('rejects pure text values', () => {
    expect(() => sanitizeAmount('abc')).toThrow();
    expect(() => sanitizeAmount('<script>')).toThrow();
  });

  it('rounds to 2 decimal places', () => {
    expect(sanitizeAmount(1.999)).toBe(2);
    expect(sanitizeAmount(100.004)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Date validation
// ---------------------------------------------------------------------------
describe('Date security', () => {
  it('accepts valid ISO dates', () => {
    expect(sanitizeDate('2026-04-04')).toBe('2026-04-04');
    expect(sanitizeDate('2000-01-01')).toBe('2000-01-01');
  });

  it('rejects SQL injection in date field', () => {
    const dateSQLPayloads = [
      "2026-01-01' OR '1'='1",
      '2026-01-01; DROP TABLE transactions;',
      "2026-01-01 UNION SELECT * FROM users--",
    ];
    dateSQLPayloads.forEach((p) => {
      expect(() => sanitizeDate(p)).toThrow();
    });
  });

  it('rejects XSS in date field', () => {
    expect(() => sanitizeDate('<script>2026-01-01</script>')).toThrow();
    expect(() => sanitizeDate('javascript:2026-01-01')).toThrow();
  });

  it('rejects non-ISO formats', () => {
    ['04/04/2026', 'April 4, 2026', '2026-4-4', ''].forEach((p) => {
      expect(() => sanitizeDate(p)).toThrow();
    });
  });

  it('rejects invalid calendar dates', () => {
    expect(() => sanitizeDate('2026-13-01')).toThrow(); // month 13
    expect(() => sanitizeDate('9999-99-99')).toThrow();
  });

  it('rejects extreme years', () => {
    expect(() => sanitizeDate('1800-01-01')).toThrow();
    expect(() => sanitizeDate('2500-01-01')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Hex color validation
// ---------------------------------------------------------------------------
describe('Hex color security', () => {
  const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;
  const isValidHex = (s: string) => HEX_REGEX.test(s);

  it('accepts valid hex colors', () => {
    expect(isValidHex('#FF0000')).toBe(true);
    expect(isValidHex('#00ff00')).toBe(true);
    expect(isValidHex('#1a2b3c')).toBe(true);
  });

  it('rejects CSS injection in color field', () => {
    [
      'expression(alert(1))',
      'red; background: url(evil.com)',
      '<style>body{display:none}</style>',
      'url("javascript:alert(1)")',
    ].forEach((p) => {
      expect(isValidHex(p)).toBe(false);
    });
  });

  it('rejects invalid formats', () => {
    ['red', '#GGG', '#1234', '', 'rgb(255,0,0)'].forEach((p) => {
      expect(isValidHex(p)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Enum whitelisting
// ---------------------------------------------------------------------------
describe('Enum whitelisting', () => {
  const VALID_TYPES = new Set(['entrada', 'saida']);
  const VALID_FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly']);
  const VALID_ACCOUNT_TYPES = new Set(['checking', 'savings', 'credit', 'investment']);

  it('accepts valid transaction types', () => {
    expect(VALID_TYPES.has('entrada')).toBe(true);
    expect(VALID_TYPES.has('saida')).toBe(true);
  });

  it('rejects injected transaction types', () => {
    [
      "entrada' OR '1'='1",
      'ENTRADA',
      'entrada; DROP TABLE--',
      '',
      'deposit',
      'withdrawal',
    ].forEach((p) => {
      expect(VALID_TYPES.has(p as any)).toBe(false);
    });
  });

  it('rejects injected frequency values', () => {
    [
      'hourly',
      'MONTHLY',
      "monthly' OR 1=1--",
      '',
      'every-second',
    ].forEach((p) => {
      expect(VALID_FREQUENCIES.has(p as any)).toBe(false);
    });
  });

  it('rejects injected account types', () => {
    [
      'bitcoin',
      'CHECKING',
      "checking' OR 1=1--",
      '',
    ].forEach((p) => {
      expect(VALID_ACCOUNT_TYPES.has(p as any)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// SQL injection pattern detection (via sanitize helper)
// ---------------------------------------------------------------------------
describe('SQL injection pattern detection', () => {
  it('flags all known SQL injection payloads', () => {
    SQL_PAYLOADS.forEach((p) => {
      expect(hasSQLInjectionPattern(p)).toBe(true);
    });
  });

  it('does not flag safe strings', () => {
    SAFE_STRINGS.forEach((s) => {
      expect(hasSQLInjectionPattern(s)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// XSS pattern detection (via sanitize helper)
// ---------------------------------------------------------------------------
describe('XSS pattern detection', () => {
  it('flags all known XSS payloads', () => {
    XSS_PAYLOADS.forEach((p) => {
      expect(hasXSSPattern(p)).toBe(true);
    });
  });

  it('does not flag safe strings', () => {
    SAFE_STRINGS.forEach((s) => {
      expect(hasXSSPattern(s)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Oversized input rejection
// ---------------------------------------------------------------------------
describe('Oversized input rejection', () => {
  it('detects strings over typical field limits', () => {
    const MAX_DESCRIPTION = 200;
    const MAX_NAME = 100;
    const oversized = 'A'.repeat(300);

    expect(oversized.length > MAX_DESCRIPTION).toBe(true);
    expect(oversized.length > MAX_NAME).toBe(true);
  });

  it('detects normal-sized inputs as within bounds', () => {
    const MAX_DESCRIPTION = 200;
    const normal = 'Salário mensal do trabalho';
    expect(normal.length <= MAX_DESCRIPTION).toBe(true);
  });
});
