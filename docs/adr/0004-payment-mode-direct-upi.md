# 0004 — Per-tenant payment_mode; direct-UPI as the default rail

## Status
Accepted

## Context
Production symptom: a student paid (money debited) but the order never reached the
kitchen and the admin never saw it.

Root cause (confirmed by reading the code): the money rail and the confirmation
rail were disconnected.

- **Money rail:** the pay screen renders a raw `upi://pay?pa=<canteen VPA>` QR
  (`pay-panel.tsx` → `upiQrPayload`). The student pays the canteen's UPI VPA
  **directly, peer-to-peer**. Razorpay is never in this transfer. There is no
  Razorpay Checkout integration anywhere (no `checkout.razorpay.com`, no
  `new Razorpay()`).
- **Confirmation rail:** the webhook, `verifyPaymentNow` (live branch) and the
  reconcile cron all wait for **Razorpay** to report a captured payment.

Behaviour was switched **globally** by `featureFlags.razorpayLive` ("do Razorpay
keys exist in env?"). The moment live keys were set, every tenant was forced down
the Razorpay-capture path — but no payment ever flows through Razorpay, so the
Razorpay order stays `created` forever, no `payment.captured` webhook fires, and
the order is stuck on `pending_payment` until expiry. Kitchen never sees it.

A raw peer-to-peer UPI transfer to a personal/merchant VPA **cannot be verified
programmatically** — no public API/webhook exists for it. Automatic confirmation
requires the money to flow through a gateway (Razorpay/PhonePe-for-Business/etc.).

## Decision
Decide payment behaviour **per tenant**, not globally, via a new
`tenants.payment_mode` column (migration `0024`):

- `direct_upi` (**default**): student pays the canteen VPA directly (money is
  instant to the canteen's bank). The order enters the kitchen queue flagged
  **UNVERIFIED**; verification is at the counter — pickup OTP (who collects) +
  the staff's own UPI-app/soundbox glance (that it was actually paid). No
  Razorpay. Matches the product vision: "admin just adds a UPI ID."
- `razorpay`: money flows through the gateway; the existing webhook /
  `safe_capture_payment` / reconcile machinery auto-captures. Gateway-ready — a
  canteen flips to this with no rewrite.

`payment_mode` (not `featureFlags.razorpayLive`) is now the authoritative switch
in `placeOrder`, `verifyPaymentNow`, the pay page, and refund handling.

In `direct_upi` mode there is no programmatic refund: `initiateRefundForOrder`
short-circuits non-gateway payments, records a `refund_owed` event, and sets a
sentinel `refund_id` so the reconcile cron never retries a doomed Razorpay refund.
The canteen repays manually from their UPI app.

## Consequences
- Fixes the money-stuck bug: a paid order reaches the kitchen the moment the
  student taps to pay (no mandatory "I've Paid" click).
- Honest trade-off: direct UPI cannot be server-verified, so staff must confirm
  payment at the counter (the UNVERIFIED badge already exists in the kitchen
  board). A dishonest student could tap-without-paying; the counter check is the
  guard, exactly like every small UPI shop in India.
- Direct UPI refunds are manual (admin "refunds owed" payout — UI to follow).
- **Deploy ordering:** migration `0024` MUST be applied to the database BEFORE the
  new code is deployed. The combined `select(is_open, paused_until, payment_mode)`
  errors out if the column is missing, which silently skips the open/paused guard.
