import { describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logging";

describe("structured logger redaction", () => {
  it("scrubs secrets and customer contact data while preserving useful payment ids", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      logger.error(
        "razorpay order create failed",
        new Error("Authorization: Basic abc123 rzp_live_leakykey user@example.com +919876543210"),
        {
          tenant_id: "tenant_123",
          order_id: "order_123",
          razorpay_payment_id: "pay_123",
          RAZORPAY_KEY_SECRET: "sk_test_should_not_log",
          nested: {
            otp: "4821",
            safe_value: "visible",
          },
        }
      );

      expect(spy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(String(spy.mock.calls[0][0]));
      const serialized = JSON.stringify(parsed);

      expect(parsed.razorpay_payment_id).toBe("pay_123");
      expect(parsed.RAZORPAY_KEY_SECRET).toBe("[REDACTED]");
      expect(parsed.nested.otp).toBe("[REDACTED]");
      expect(parsed.nested.safe_value).toBe("visible");
      expect(serialized).not.toContain("abc123");
      expect(serialized).not.toContain("rzp_live_leakykey");
      expect(serialized).not.toContain("user@example.com");
      expect(serialized).not.toContain("9876543210");
      expect(serialized).not.toContain("sk_test_should_not_log");
    } finally {
      spy.mockRestore();
    }
  });
});
