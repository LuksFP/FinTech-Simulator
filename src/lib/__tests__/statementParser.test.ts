import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  parseDate,
  detectType,
  autoDetect,
  parseOFX,
  decodeOFXBuffer,
  isOFXFile,
  duplicateKey,
} from '../statementParser';

describe('parseAmount', () => {
  it('converte formato brasileiro (1.234,56)', () => {
    expect(parseAmount('R$ 1.234,56')).toBe(1234.56);
  });

  it('retorna valor absoluto de negativos', () => {
    expect(parseAmount(-42.5)).toBe(42.5);
    expect(parseAmount('-15,90')).toBe(15.9);
  });

  it('retorna 0 para lixo', () => {
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });
});

describe('parseDate', () => {
  it('aceita dd/MM/yyyy', () => {
    expect(parseDate('15/03/2026')).toBe('2026-03-15');
  });

  it('aceita yyyy-MM-dd', () => {
    expect(parseDate('2026-03-15')).toBe('2026-03-15');
  });
});

describe('detectType', () => {
  it('valor negativo → saída', () => {
    expect(detectType(undefined, -10)).toBe('saida');
    expect(detectType(undefined, '-10,50')).toBe('saida');
  });

  it('coluna de tipo com palavra-chave de débito → saída', () => {
    expect(detectType('Débito', 10)).toBe('saida');
    expect(detectType('despesa', 10)).toBe('saida');
  });

  it('default → entrada', () => {
    expect(detectType('crédito', 10)).toBe('entrada');
    expect(detectType(undefined, 10)).toBe('entrada');
  });
});

describe('autoDetect', () => {
  it('detecta cabeçalhos em português', () => {
    const mapping = autoDetect(['Data', 'Descrição', 'Valor', 'Tipo'], []);
    expect(mapping).toEqual({ date: 'Data', description: 'Descrição', amount: 'Valor', type: 'Tipo' });
  });

  it('detecta cabeçalhos em inglês por match parcial', () => {
    const mapping = autoDetect(['Transaction Date', 'Description', 'Amount'], []);
    expect(mapping.date).toBe('Transaction Date');
    expect(mapping.description).toBe('Description');
    expect(mapping.amount).toBe('Amount');
  });
});

describe('isOFXFile', () => {
  it('reconhece .ofx e .qfx, ignora caixa', () => {
    expect(isOFXFile('extrato.ofx')).toBe(true);
    expect(isOFXFile('EXTRATO.OFX')).toBe(true);
    expect(isOFXFile('extrato.qfx')).toBe(true);
    expect(isOFXFile('extrato.csv')).toBe(false);
  });
});

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260310120000[-3:BRT]
<TRNAMT>-45.90
<FITID>abc123
<MEMO>IFOOD *RESTAURANTE
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260305
<TRNAMT>3500.00
<FITID>abc124
<NAME>SALARIO EMPRESA LTDA
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

const OFX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<CCSTMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>OTHER</TRNTYPE>
<DTPOSTED>20260401</DTPOSTED>
<TRNAMT>-120,00</TRNAMT>
<MEMO>Compra parcelada</MEMO>
</STMTTRN>
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;

describe('parseOFX', () => {
  it('parseia OFX 1.x SGML (extrato de conta)', () => {
    const rows = parseOFX(OFX_SGML);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      date: '2026-03-10',
      description: 'IFOOD *RESTAURANTE',
      amount: 45.9,
      type: 'saida',
    });
    expect(rows[1]).toEqual({
      date: '2026-03-05',
      description: 'SALARIO EMPRESA LTDA',
      amount: 3500,
      type: 'entrada',
    });
  });

  it('parseia OFX 2.x XML (fatura de cartão) com vírgula decimal e sem TRNTYPE útil', () => {
    const rows = parseOFX(OFX_XML);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      date: '2026-04-01',
      description: 'Compra parcelada',
      amount: 120,
      type: 'saida',
    });
  });

  it('ignora blocos sem valor', () => {
    expect(parseOFX('<STMTTRN><MEMO>sem valor</STMTTRN>')).toHaveLength(0);
    expect(parseOFX('arquivo sem transações')).toHaveLength(0);
  });
});

describe('decodeOFXBuffer', () => {
  it('decodifica UTF-8 normal', () => {
    const buffer = new TextEncoder().encode('<OFX><MEMO>Café</MEMO></OFX>').buffer;
    expect(decodeOFXBuffer(buffer as ArrayBuffer)).toContain('Café');
  });

  it('cai para windows-1252 quando o UTF-8 quebra', () => {
    // "Café" em latin-1: 0xE9 não é UTF-8 válido
    const bytes = new Uint8Array([0x43, 0x61, 0x66, 0xe9]);
    expect(decodeOFXBuffer(bytes.buffer)).toBe('Café');
  });
});

describe('duplicateKey', () => {
  it('mesma transação gera a mesma chave (ignora acentos/caixa/espaços)', () => {
    const a = { date: '2026-03-10', amount: 45.9, type: 'saida' as const, description: 'IFOOD  *Café' };
    const b = { date: '2026-03-10', amount: 45.9, type: 'saida' as const, description: 'ifood *cafe' };
    expect(duplicateKey(a)).toBe(duplicateKey(b));
  });

  it('valor ou data diferente gera chave diferente', () => {
    const base = { date: '2026-03-10', amount: 45.9, type: 'saida' as const, description: 'x' };
    expect(duplicateKey(base)).not.toBe(duplicateKey({ ...base, amount: 45.91 }));
    expect(duplicateKey(base)).not.toBe(duplicateKey({ ...base, date: '2026-03-11' }));
  });
});
