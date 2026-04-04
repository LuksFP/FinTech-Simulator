import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryRateLimiter, PersistentRateLimiter, formatRetryAfter } from '../rateLimiter';

// ---------------------------------------------------------------------------
// InMemoryRateLimiter
// ---------------------------------------------------------------------------
describe('InMemoryRateLimiter', () => {
  it('allows requests up to maxRequests', () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);
    expect(limiter.check('key').allowed).toBe(true);
    expect(limiter.check('key').allowed).toBe(true);
    expect(limiter.check('key').allowed).toBe(true);
  });

  it('blocks after maxRequests is exceeded', () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);
    limiter.check('key');
    limiter.check('key');
    limiter.check('key');
    const result = limiter.check('key');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets counter after window expires', () => {
    vi.useFakeTimers();
    const limiter = new InMemoryRateLimiter(2, 1_000);
    limiter.check('key');
    limiter.check('key');
    expect(limiter.check('key').allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(limiter.check('key').allowed).toBe(true);
    vi.useRealTimers();
  });

  it('tracks different keys independently', () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);
    expect(limiter.check('key-A').allowed).toBe(true);
    expect(limiter.check('key-A').allowed).toBe(false);
    expect(limiter.check('key-B').allowed).toBe(true); // separate key
  });

  it('reset() clears the key counter', () => {
    const limiter = new InMemoryRateLimiter(1, 60_000);
    limiter.check('key');
    expect(limiter.check('key').allowed).toBe(false);
    limiter.reset('key');
    expect(limiter.check('key').allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PersistentRateLimiter (mocked localStorage)
// ---------------------------------------------------------------------------
describe('PersistentRateLimiter', () => {
  const storageKey = '__test_rl__';
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows attempts up to maxAttempts', () => {
    const limiter = new PersistentRateLimiter(3, 60_000, storageKey);
    expect(limiter.check().allowed).toBe(true);
    expect(limiter.check().allowed).toBe(true);
    expect(limiter.check().allowed).toBe(true);
  });

  it('blocks after maxAttempts', () => {
    const limiter = new PersistentRateLimiter(3, 60_000, storageKey);
    limiter.check();
    limiter.check();
    limiter.check();
    const result = limiter.check();
    expect(result.allowed).toBe(false);
    expect(result.attemptsLeft).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('persists across instantiations (simulates page reload)', () => {
    const l1 = new PersistentRateLimiter(2, 60_000, storageKey);
    l1.check();
    l1.check();

    // Create new instance (simulating reload) — reads from localStorage
    const l2 = new PersistentRateLimiter(2, 60_000, storageKey);
    expect(l2.check().allowed).toBe(false);
  });

  it('reset() clears localStorage', () => {
    const limiter = new PersistentRateLimiter(1, 60_000, storageKey);
    limiter.check();
    expect(limiter.check().allowed).toBe(false);
    limiter.reset();
    expect(limiter.check().allowed).toBe(true);
  });

  it('resets after window expires', () => {
    vi.useFakeTimers();
    const limiter = new PersistentRateLimiter(1, 1_000, storageKey);
    limiter.check();
    expect(limiter.check().allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(limiter.check().allowed).toBe(true);
    vi.useRealTimers();
  });

  it('attemptsLeft decrements correctly', () => {
    const limiter = new PersistentRateLimiter(3, 60_000, storageKey);
    expect(limiter.check().attemptsLeft).toBe(2);
    expect(limiter.check().attemptsLeft).toBe(1);
    expect(limiter.check().attemptsLeft).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatRetryAfter
// ---------------------------------------------------------------------------
describe('formatRetryAfter', () => {
  it('formats seconds only', () => {
    expect(formatRetryAfter(30_000)).toBe('30s');
    expect(formatRetryAfter(1_000)).toBe('1s');
    expect(formatRetryAfter(500)).toBe('1s'); // ceil
  });

  it('formats minutes and seconds', () => {
    expect(formatRetryAfter(90_000)).toBe('1m 30s');
    expect(formatRetryAfter(150_000)).toBe('2m 30s');
    expect(formatRetryAfter(900_000)).toBe('15m 0s');
  });
});
