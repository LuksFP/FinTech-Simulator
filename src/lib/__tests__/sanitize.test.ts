import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  sanitizeAmount,
  sanitizeDate,
  sanitizeUUID,
  hasSQLInjectionPattern,
  hasXSSPattern,
} from '../sanitize';

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------
describe('stripHtml', () => {
  it('removes script tags', () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('removes all HTML tags', () => {
    expect(stripHtml('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
    expect(stripHtml('<img src=x onerror=alert(1)>')).toBe('');
    expect(stripHtml('<iframe src="evil.com"></iframe>')).toBe('');
  });

  it('strips javascript: protocol', () => {
    expect(stripHtml('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('decodes dangerous HTML entities', () => {
    const result = stripHtml('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result).toContain('<script>');
  });

  it('trims whitespace', () => {
    expect(stripHtml('  hello  ')).toBe('hello');
  });

  it('preserves safe plain text', () => {
    expect(stripHtml('Salário mensal')).toBe('Salário mensal');
    expect(stripHtml('Aluguel')).toBe('Aluguel');
  });
});

// ---------------------------------------------------------------------------
// sanitizeAmount
// ---------------------------------------------------------------------------
describe('sanitizeAmount', () => {
  it('accepts valid numbers', () => {
    expect(sanitizeAmount(100)).toBe(100);
    expect(sanitizeAmount(1234.56)).toBe(1234.56);
  });

  it('rounds to 2 decimal places', () => {
    expect(sanitizeAmount(1.999)).toBe(2);
    expect(sanitizeAmount(1.001)).toBe(1);
  });

  it('parses BRL formatted strings', () => {
    expect(sanitizeAmount('1.234,56')).toBe(1234.56);
    expect(sanitizeAmount('R$ 500,00')).toBe(500);
  });

  it('throws on NaN', () => {
    expect(() => sanitizeAmount('abc')).toThrow();
    expect(() => sanitizeAmount(NaN)).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => sanitizeAmount(Infinity)).toThrow();
  });

  it('throws on negative numbers', () => {
    expect(() => sanitizeAmount(-100)).toThrow();
  });

  it('throws on zero', () => {
    expect(() => sanitizeAmount(0)).toThrow();
  });

  it('throws on values above max', () => {
    expect(() => sanitizeAmount(1_000_000_000)).toThrow();
  });

  it('throws on SQL injection attempts', () => {
    expect(() => sanitizeAmount("100; DROP TABLE transactions;")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// sanitizeDate
// ---------------------------------------------------------------------------
describe('sanitizeDate', () => {
  it('accepts valid ISO dates', () => {
    expect(sanitizeDate('2026-04-04')).toBe('2026-04-04');
    expect(sanitizeDate('2000-01-01')).toBe('2000-01-01');
  });

  it('throws on wrong format', () => {
    expect(() => sanitizeDate('04/04/2026')).toThrow();
    expect(() => sanitizeDate('April 4, 2026')).toThrow();
    expect(() => sanitizeDate('2026-4-4')).toThrow(); // no zero-padding
    expect(() => sanitizeDate('')).toThrow();
  });

  it('throws on SQL injection in date field', () => {
    expect(() => sanitizeDate("2026-01-01' OR '1'='1")).toThrow();
    expect(() => sanitizeDate('2026-01-01; DROP TABLE--')).toThrow();
  });

  it('throws on invalid calendar dates', () => {
    expect(() => sanitizeDate('2026-13-01')).toThrow(); // month 13
    expect(() => sanitizeDate('9999-99-99')).toThrow();
  });

  it('throws on absurd years', () => {
    expect(() => sanitizeDate('1800-01-01')).toThrow();
    expect(() => sanitizeDate('2500-01-01')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// sanitizeUUID
// ---------------------------------------------------------------------------
describe('sanitizeUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(sanitizeUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('normalizes to lowercase', () => {
    expect(sanitizeUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
  });

  it('throws on SQL injection', () => {
    expect(() => sanitizeUUID("' OR 1=1--")).toThrow('ID inválido');
    expect(() => sanitizeUUID('1; DROP TABLE users;')).toThrow('ID inválido');
  });

  it('throws on invalid UUID formats', () => {
    expect(() => sanitizeUUID('')).toThrow();
    expect(() => sanitizeUUID('123')).toThrow();
    expect(() => sanitizeUUID('not-a-uuid')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// hasSQLInjectionPattern
// ---------------------------------------------------------------------------
describe('hasSQLInjectionPattern', () => {
  it('detects classic injection attempts', () => {
    expect(hasSQLInjectionPattern("' OR '1'='1")).toBe(true);
    expect(hasSQLInjectionPattern("1' OR 1=1--")).toBe(true);
    expect(hasSQLInjectionPattern('; DROP TABLE users;--')).toBe(true);
    expect(hasSQLInjectionPattern('UNION SELECT * FROM users')).toBe(true);
    expect(hasSQLInjectionPattern('union all select password from accounts')).toBe(true);
    expect(hasSQLInjectionPattern('/* comment */ SELECT')).toBe(true);
    expect(hasSQLInjectionPattern('xp_cmdshell')).toBe(true);
    expect(hasSQLInjectionPattern('exec(xp_cmdshell)')).toBe(true);
    expect(hasSQLInjectionPattern('INFORMATION_SCHEMA.TABLES')).toBe(true);
  });

  it('does not flag safe strings', () => {
    expect(hasSQLInjectionPattern('Salário mensal')).toBe(false);
    expect(hasSQLInjectionPattern('Aluguel de apartamento')).toBe(false);
    expect(hasSQLInjectionPattern('user@example.com')).toBe(false);
    expect(hasSQLInjectionPattern('João da Silva')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasXSSPattern
// ---------------------------------------------------------------------------
describe('hasXSSPattern', () => {
  it('detects script injection', () => {
    expect(hasXSSPattern('<script>alert(1)</script>')).toBe(true);
    expect(hasXSSPattern('<Script SRC="evil.com/x.js">')).toBe(true);
  });

  it('detects event handler injection', () => {
    expect(hasXSSPattern('<img onerror=alert(1)>')).toBe(true);
    expect(hasXSSPattern('<body onload=steal()>')).toBe(true);
    expect(hasXSSPattern('onclick=doEvil()')).toBe(true);
  });

  it('detects javascript: protocol', () => {
    expect(hasXSSPattern('javascript:alert(1)')).toBe(true);
    expect(hasXSSPattern('JAVASCRIPT:void(0)')).toBe(true);
  });

  it('detects dangerous elements', () => {
    expect(hasXSSPattern('<iframe src="evil.com">')).toBe(true);
    expect(hasXSSPattern('<object data="evil.swf">')).toBe(true);
    expect(hasXSSPattern('data:text/html,<script>alert(1)</script>')).toBe(true);
  });

  it('detects CSS expression injection', () => {
    expect(hasXSSPattern('expression(alert(1))')).toBe(true);
    expect(hasXSSPattern('width:expression(alert(1))')).toBe(true);
  });

  it('does not flag safe strings', () => {
    expect(hasXSSPattern('Salário mensal')).toBe(false);
    expect(hasXSSPattern('conta@email.com')).toBe(false);
    expect(hasXSSPattern('Aluguel — R$ 1.500,00')).toBe(false);
  });
});
