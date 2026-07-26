import "server-only";
import crypto from "node:crypto";
import { env, featureFlags } from "@/lib/env";

// ── Resilient fetch helper ─────────────────────────────────────────────────
// All Razorpay API calls go through this wrapper so they:
//   1. Always have a hard timeout (default 8s — Razorpay SLA is 3s p99)
//   2. Retry up to `maxAttempts` times on network errors or 5xx responses
//   3. Use exponential backoff (500ms, 1000ms) between retries
//
// This prevents a slow Razorpay response from hanging a Vercel serverless
// function indefinitely and consuming connection-pool slots under heavy load.

async function razorpayFetch(
  url: string,
  opts: RequestInit,
  { timeoutMs = 8000, maxAttempts = 3 }: { timeoutMs?: number; maxAttempts?: number } = {}
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        signal: AbortSignal.timeout(timeoutMs),
      });
      // Don't retry on 4xx — those are client errors (bad order ID, wrong key etc.)
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      // Retry on 5xx (Razorpay internal error) unless it's the last attempt
      lastErr = new Error(`Razorpay HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
      // If it's the last attempt, fall through and throw
      if (attempt === maxAttempts) break;
    }
    // Exponential backoff before retry
    await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
  }
  throw lastErr;
}

export type CreateOrderInput = {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
};

export type CreatedOrder = {
  id: string;
  amount: number;
  currency: "INR";
  receipt: string;
  status: "created";
  simulated: boolean;
};

/**
 * Creates a Razorpay order. When keys are absent, returns a deterministic
 * simulated order so the rest of the flow (QR display, status polling, OTP
 * issuance on capture) can run end-to-end in dev.
 */
export async function createRazorpayOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (!featureFlags.razorpayLive) {
    return {
      id: `order_sim_${crypto.randomBytes(8).toString("hex")}`,
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      status: "created",
      simulated: true,
    };
  }

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString(
    "base64"
  );
  const res = await razorpayFetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order create failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: string; amount: number; receipt: string };
  return {
    id: data.id,
    amount: data.amount,
    currency: "INR",
    receipt: data.receipt,
    status: "created",
    simulated: false,
  };
}

/**
 * Verifies a Razorpay webhook signature. Compares HMAC-SHA256 over the raw
 * request body using the configured webhook secret. Constant-time compare.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  // Use fixed-length hex-decoded buffers so timingSafeEqual runs in constant time
  // regardless of the attacker-controlled `signature` string length.
  // Buffer.from(hex, "hex") silently truncates on odd-length or invalid chars,
  // so we produce a 32-byte expected buffer and a 32-byte comparison target —
  // the comparison always takes the same number of cycles.
  const expectedBuf = Buffer.from(expected, "hex"); // always 32 bytes for SHA-256
  const sigBuf = Buffer.alloc(32); // zero-filled 32 bytes
  Buffer.from(signature, "hex").copy(sigBuf, 0, 0, 32);
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Fetches the payments associated with a Razorpay order.
 * Returns the captured payment ID + amount so verifyPaymentNow can pass them
 * to safe_capture_payment (which validates amount against order total).
 * Returns null when not in live mode or on any error.
 */
export async function fetchRazorpayOrderPayments(
  razorpayOrderId: string
): Promise<{ paymentId: string; amountPaise: number } | null> {
  if (!featureFlags.razorpayLive) return null;
  try {
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}/payments`, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { items?: Array<{ id: string; amount: number; status: string }> };
    const captured = data.items?.find((p) => p.status === "captured");
    if (!captured) return null;
    return { paymentId: captured.id, amountPaise: captured.amount };
  } catch {
    return null;
  }
}

/**
 * Polls Razorpay's REST API for the current order status. Used by the
 * "I've paid" manual-verify path and the QStash reconcile cron when a webhook
 * was dropped. In simulator mode (no live keys) we treat sim orders as
 * 'paid' so the manual-verify path mirrors the simulate-capture button.
 */
export async function fetchRazorpayOrderStatus(
  razorpayOrderId: string
): Promise<"created" | "attempted" | "paid" | "failed" | "unknown"> {
  if (!featureFlags.razorpayLive) {
    return razorpayOrderId.startsWith("order_sim_") ? "paid" : "unknown";
  }
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString(
    "base64"
  );
  let res: Response;
  try {
    res = await razorpayFetch(
      `https://api.razorpay.com/v1/orders/${razorpayOrderId}`,
      { method: "GET", headers: { Authorization: `Basic ${auth}` }, cache: "no-store" }
    );
  } catch {
    // Network error or all retries exhausted — treat as unknown, not failed
    return "unknown";
  }
  if (res.status === 404) return "unknown";
  if (!res.ok) {
    return "unknown";
  }
  const data = (await res.json()) as { status?: string };
  const s = data.status;
  if (s === "paid" || s === "attempted" || s === "created" || s === "failed") return s;
  return "unknown";
}

/**
 * Initiates a Razorpay refund for a captured payment.
 * Returns the Razorpay refund ID on success.
 * In simulator mode, returns a fake refund ID so the flow works end-to-end.
 */
export async function initiateRazorpayRefund(opts: {
  razorpayPaymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<{ refundId: string; simulated: boolean } | { error: string }> {
  const { razorpayPaymentId, amountPaise, notes } = opts;
  const idempotencyKey =
    opts.idempotencyKey ?? `refund_${razorpayPaymentId}_${amountPaise}`;

  // Use simulator when live keys are absent or the payment ID itself is simulated.
  if (!featureFlags.razorpayLive || razorpayPaymentId.startsWith("pay_sim_")) {
    return {
      refundId: "rfnd_sim_" + crypto.randomBytes(8).toString("hex"),
      simulated: true,
    };
  }

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  let res: Response;
  try {
    res = await razorpayFetch(
      `https://api.razorpay.com/v1/payments/${razorpayPaymentId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          // Razorpay returns the original refund for a retry with the same
          // key, including after a network timeout where we never received
          // the first response.
          "X-Refund-Idempotency": idempotencyKey,
        },
        body: JSON.stringify({ amount: amountPaise, notes }),
      },
      { timeoutMs: 12000, maxAttempts: 2 } // Refunds: longer timeout, fewer retries
    );
  } catch (err) {
    return { error: `Razorpay refund network error: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!res.ok) {
    return { error: `Razorpay refund failed: ${res.status}` };
  }

  const data = (await res.json()) as { id: string };
  return { refundId: data.id, simulated: false };
}
