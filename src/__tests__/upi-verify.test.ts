import { describe, it, expect } from "vitest";
import { pickVerifyPaise, finalAmountPaise } from "@/lib/payments/upi-verify";

describe("pickVerifyPaise", () => {
  it("returns a tag in 1..999 for an empty stall", () => {
    const tag = pickVerifyPaise(5000, []);
    expect(tag).toBeGreaterThanOrEqual(1);
    expect(tag).toBeLessThanOrEqual(999);
  });

  it("never collides with an existing final amount on the same base", () => {
    const tag = pickVerifyPaise(5000, [5001]);
    expect(5000 + tag).not.toBe(5001);
  });

  it("ignores taken finals on a different base", () => {
    const tag = pickVerifyPaise(5000, [6043]);
    expect(tag).toBeGreaterThanOrEqual(1);
    expect(tag).toBeLessThanOrEqual(999);
  });

  it("returns 0 (manual fallback) when all 999 tags for the base are taken", () => {
    const taken = Array.from({ length: 999 }, (_, i) => 5000 + (i + 1));
    expect(pickVerifyPaise(5000, taken)).toBe(0);
  });
});

describe("finalAmountPaise", () => {
  it("adds the tag to the base", () => {
    expect(finalAmountPaise(5000, 43)).toBe(5043);
  });
  it("treats null tag as zero", () => {
    expect(finalAmountPaise(5000, null)).toBe(5000);
  });
});
