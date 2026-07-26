// @ts-nocheck — focused dependency-outage mocks omit SDK internals
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: {
    UPSTASH_REDIS_REST_URL: "https://unavailable.example",
    UPSTASH_REDIS_REST_TOKEN: "test-token",
  },
  featureFlags: { upstashLive: true },
}));
vi.mock("@upstash/redis", () => ({
  Redis: class Redis {
    constructor() {}
  },
}));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow() {
      return {};
    }

    async limit() {
      throw new Error("Redis unavailable");
    }
  }
  return { Ratelimit };
});

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit dependency outage fallback", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps a strict local window instead of throwing a production 500", async () => {
    const key = `fallback-${Date.now()}`;
    const first = await rateLimit(key, { limit: 1, windowMs: 60_000 });
    const second = await rateLimit(key, { limit: 1, windowMs: 60_000 });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
