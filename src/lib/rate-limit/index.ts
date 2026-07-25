import "server-only";
import { env, featureFlags } from "@/lib/env";

type Result = { success: boolean; limit: number; remaining: number; reset: number };

// Module-level singleton — one Redis connection shared across warm instances.
// Lazy-initialised on first call so tests without Upstash env vars don't blow
// up at import time.
let _upstash: {
  Ratelimit: typeof import("@upstash/ratelimit").Ratelimit;
  rl: import("@upstash/ratelimit").Ratelimit;
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

  // Sliding window — strictly correct: no 2× burst at window boundaries.
  // Fixed window lets a student place 10 orders in 2 seconds by straddling
  // a minute boundary (5 at :59.9, 5 at :00.0). Sliding window prevents this.
  // analytics=true surfaces usage in the Upstash dashboard for capacity planning.
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "10 s"),
    analytics: true,
    prefix: "tray",
  });

  _upstash = { Ratelimit, rl };
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
      const r = await u.rl.limit(key);
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
