import "server-only";
import { env, featureFlags } from "@/lib/env";

type Result = { success: boolean; limit: number; remaining: number; reset: number };

// Module-level singleton — one Redis connection shared across warm instances.
// Lazy-initialised on first call so tests without Upstash env vars don't blow
// up at import time.
let _upstash: {
  Ratelimit: typeof import("@upstash/ratelimit").Ratelimit;
  redis: import("@upstash/redis").Redis;
  limiters: Map<string, import("@upstash/ratelimit").Ratelimit>;
} | null = null;

async function getUpstash() {
  if (_upstash) return _upstash;
  if (!featureFlags.upstashLive) return null;

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });

  _upstash = { Ratelimit, redis, limiters: new Map() };
  return _upstash;
}

// In-memory fallback — ONLY for local development and test environments.
// env.ts throws at startup in production if Upstash is missing, so this
// path is never reached on Vercel.
const _mem = new Map<string, { count: number; reset: number }>();
let _lastUpstashErrorLogAt = 0;

function memoryRateLimit(key: string, limit: number, windowMs: number): Result {
  const now = Date.now();
  const cur = _mem.get(key);
  if (!cur || cur.reset < now) {
    _mem.set(key, { count: 1, reset: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }
  cur.count += 1;
  return {
    success: cur.count <= limit,
    limit,
    remaining: Math.max(0, limit - cur.count),
    reset: cur.reset,
  };
}

export async function rateLimit(
  key: string,
  opts?: { limit?: number; windowMs?: number }
): Promise<Result> {
  const limit = opts?.limit ?? 20;
  const windowMs = opts?.windowMs ?? 10_000;

  const u = await getUpstash();
  if (u) {
    try {
      const policyKey = `${limit}:${windowMs}`;
      let limiter = u.limiters.get(policyKey);
      if (!limiter) {
        limiter = new u.Ratelimit({
          redis: u.redis,
          limiter: u.Ratelimit.slidingWindow(limit, `${windowMs} ms`),
          analytics: true,
          prefix: `tray:${limit}:${windowMs}`,
        });
        u.limiters.set(policyKey, limiter);
      }
      const r = await limiter.limit(key);
      return {
        success: r.success,
        limit: r.limit,
        remaining: r.remaining,
        reset: r.reset,
      };
    } catch (error) {
      // Redis is the distributed source of truth, but a transient dependency
      // outage must not turn every order, login, cron, and signed webhook into
      // a 500. Degrade to a strict per-instance window while the provider
      // recovers. Log at most once per minute to avoid an outage log storm.
      const now = Date.now();
      if (now - _lastUpstashErrorLogAt >= 60_000) {
        _lastUpstashErrorLogAt = now;
        console.error("[Tray] Upstash rate limit unavailable; using local fallback", error);
      }
      return memoryRateLimit(key, limit, windowMs);
    }
  }

  // Local dev / test only.
  return memoryRateLimit(key, limit, windowMs);
}
