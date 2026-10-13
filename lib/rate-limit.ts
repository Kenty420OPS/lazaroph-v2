export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter({
  maxRequests,
  windowMs,
}: RateLimiterOptions): (key: string) => RateLimitResult {
  const store = new Map<string, { count: number; resetTime: number }>();

  return function check(key: string): RateLimitResult {
    const now = Date.now();

    // Opportunistically evict expired entries when store exceeds 1000 keys
    if (store.size > 1000) {
      store.forEach((record, k) => {
        if (now >= record.resetTime) {
          store.delete(k);
        }
      });
    }

    const record = store.get(key);

    if (!record || now >= record.resetTime) {
      const resetTime = now + windowMs;
      store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      return {
        allowed: false,
        retryAfterSeconds,
      };
    }

    record.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      allowed: true,
      retryAfterSeconds,
    };
  };
}
