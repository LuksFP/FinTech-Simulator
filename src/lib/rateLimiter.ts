/**
 * Client-side HTTP rate limiting.
 *
 * Two layers:
 *  1. InMemoryRateLimiter  — per-key sliding window, reset on page reload.
 *     Use for general API mutations (prevents accidental rapid-fire clicks).
 *
 *  2. PersistentRateLimiter — backed by localStorage so the window survives
 *     page reloads. Use for auth attempts (login / signup / password reset).
 */

interface Window {
  count: number;
  windowStart: number;
}

// ---------------------------------------------------------------------------
// In-memory limiter (resets on page reload)
// ---------------------------------------------------------------------------
export class InMemoryRateLimiter {
  private readonly store = new Map<string, Window>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.store.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, retryAfterMs: this.windowMs - (now - entry.windowStart) };
    }

    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Persistent limiter (survives page reload via localStorage)
// ---------------------------------------------------------------------------
export class PersistentRateLimiter {
  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly storageKey: string,
  ) {}

  private load(): Window | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as Window) : null;
    } catch {
      return null;
    }
  }

  private save(entry: Window): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entry));
    } catch {
      // Silently ignore if storage is unavailable
    }
  }

  check(): { allowed: boolean; retryAfterMs: number; attemptsLeft: number } {
    const now = Date.now();
    const entry = this.load();

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.save({ count: 1, windowStart: now });
      return { allowed: true, retryAfterMs: 0, attemptsLeft: this.maxAttempts - 1 };
    }

    if (entry.count >= this.maxAttempts) {
      const retryAfterMs = this.windowMs - (now - entry.windowStart);
      return { allowed: false, retryAfterMs, attemptsLeft: 0 };
    }

    this.save({ ...entry, count: entry.count + 1 });
    return {
      allowed: true,
      retryAfterMs: 0,
      attemptsLeft: this.maxAttempts - entry.count - 1,
    };
  }

  /** Reset after successful auth so the counter doesn't linger. */
  reset(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // ignore
    }
  }

  remainingMs(): number {
    const now = Date.now();
    const entry = this.load();
    if (!entry || now - entry.windowStart >= this.windowMs) return 0;
    if (entry.count < this.maxAttempts) return 0;
    return this.windowMs - (now - entry.windowStart);
  }
}

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

/** Auth attempts: 5 per 15 minutes, persisted across reloads. */
export const authRateLimiter = new PersistentRateLimiter(
  5,
  15 * 60 * 1000,
  '__rl_auth__',
);

/** General API write operations: 60 per minute, in-memory. */
export const apiRateLimiter = new InMemoryRateLimiter(60, 60 * 1000);

// ---------------------------------------------------------------------------
// Helper: format countdown string for UI ("2m 30s")
// ---------------------------------------------------------------------------
export function formatRetryAfter(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
