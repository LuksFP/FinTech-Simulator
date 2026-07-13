import { describe, it, expect, afterEach, vi } from 'vitest';
import { checkSupabaseHealth } from '../supabaseHealth';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('checkSupabaseHealth', () => {
  it('retorna true quando o health responde 2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response));
    await expect(checkSupabaseHealth()).resolves.toBe(true);
  });

  it('retorna false num 5xx/521 (projeto religando)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 521 } as Response));
    await expect(checkSupabaseHealth()).resolves.toBe(false);
  });

  it('retorna false quando o fetch rejeita (NXDOMAIN / projeto pausado)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(checkSupabaseHealth()).resolves.toBe(false);
  });

  it('bate no endpoint de health do GoTrue com a apikey', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);
    await checkSupabaseHealth();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/auth\/v1\/health$/);
    expect((init.headers as Record<string, string>).apikey).toBeTruthy();
  });
});
