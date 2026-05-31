# Direct-UPI Auto-Verify (Money-Arrival Listener) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-confirm direct-UPI payments by matching the counter phone's "Received ₹X.YY" notification to the one pending order with that unique amount, eliminating fakeable "I paid" self-confirmation while the admin keeps his own personal UPI.

**Architecture:** Each order gets a unique paise tag (`orders.upi_verify_paise`, 1–99) so its final amount is unique among the tenant's unpaid orders. A free automation app (MacroDroid) on the counter phone POSTs the UPI notification text to a new authenticated endpoint (`/api/webhooks/upi-credit`). The endpoint parses the amount, finds the matching pending order, and confirms it atomically via a new `safe_capture_upi_credit` RPC modeled on the existing `safe_capture_payment`. Confirmation flows to the student and kitchen through the existing `order_events` Realtime path. A manual staff-confirm safety net covers the counter-phone-offline case. **`direct_upi` rail only; the `razorpay` rail is untouched.**

**Tech Stack:** Next.js 15 (App Router, server actions, route handlers), Supabase Postgres (SQL migrations + `security definer` RPCs), Vitest, Tailwind v4. Spec: `docs/superpowers/specs/2026-05-31-upi-autoverify-listener-design.md`.

---

## File Structure

**Create:**
- `supabase/migrations/0027_upi_autoverify.sql` — schema + `safe_capture_upi_credit` RPC + RLS.
- `src/lib/payments/upi-verify.ts` — pure: pick a unique verify-paise tag; compute final amount.
- `src/lib/payments/upi-parse.ts` — pure: parse rupee amount (paise) from a UPI notification string.
- `src/app/api/webhooks/upi-credit/route.ts` — the listener endpoint.
- `src/__tests__/upi-verify.test.ts` — unit tests for the tag generator.
- `src/__tests__/upi-parse.test.ts` — unit tests for the parser.
- `src/__tests__/upi-credit-webhook.test.ts` — unit tests for the listener endpoint.
- `src/components/portal-admin/upi-autoverify-card.tsx` — admin setup UI (toggle, secret, URL, MacroDroid guide, last credit).

**Modify:**
- `src/app/(student)/_actions.ts` — `placeOrder`: compute + persist `upi_verify_paise`.
- `src/app/(student)/pay/[orderId]/page.tsx` — pass final amount + `upiAutoverifyEnabled` to `PayPanel`.
- `src/components/portal-student/pay-panel.tsx` — when autoverify on: charge final amount, wait-for-confirmation, no self "I paid" until a 90s fallback.
- `src/components/portal-kitchen/board.tsx` and/or `order-column.tsx` — "✅ Auto-verified" badge; hold unverified orders until staff "Payment received ✓".
- `src/app/(admin)/admin/settings/page.tsx` — render `UpiAutoverifyCard`.
- `src/app/(admin)/admin/_actions.ts` — admin actions: enable/disable toggle, rotate secret, read recent `upi_credit_events`.

---

## Conventions to follow (from the existing codebase)

- Tenant-scoped writes use `getAdminClient(tenant.id)` (see `src/app/(student)/_actions.ts`).
- RPCs are `security definer set search_path = public`, take `p_tenant_id`, do a `FOR UPDATE` lock, and return a status string (see `supabase/migrations/0015_atomic_order_events_on_capture.sql`).
- Realtime is driven by inserting into `order_events`; payload carries `from`/`to`/`source` and, for unverified UPI, `upi_unverified: true` (see `verifyPaymentNow`).
- Route-handler tests mock `@/lib/env`, `@/lib/logging`, `@/lib/rate-limit`, `@/lib/supabase/admin` with `vi.mock` and import the handler last (see `src/__tests__/webhook-idempotency.test.ts`).
- Run a single test: `pnpm vitest run src/__tests__/<file>.ts`. Run all: `pnpm test`.

---

## Task 1: Database migration (schema + RPC + RLS)

**Files:**
- Create: `supabase/migrations/0027_upi_autoverify.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Migration 0027 — Direct-UPI auto-verify (money-arrival listener)
-- Adds: per-order unique paise tag, per-tenant listener secret + toggle,
-- upi_credit_events ledger, and safe_capture_upi_credit RPC.
-- direct_upi rail only. Razorpay path untouched.

-- 1. Per-order uniqueness tag (1-99). NULL = legacy/no tag.
alter table public.orders
  add column if not exists upi_verify_paise smallint;

comment on column public.orders.upi_verify_paise is
  'Direct-UPI auto-verify: 1-99 paise added to total_paise so the order has a
   unique final amount among the tenant''s pending orders. Used to match the
   counter phone UPI notification to this exact order. NULL = no tag (legacy or
   collision fallback).';

-- 2. Per-tenant listener config.
alter table public.tenants
  add column if not exists upi_listener_secret text;
alter table public.tenants
  add column if not exists upi_autoverify_enabled boolean not null default false;

comment on column public.tenants.upi_listener_secret is
  'Shared secret the counter-phone automation (MacroDroid) sends in the
   x-tray-upi-secret header to POST /api/webhooks/upi-credit. Rotatable.';
comment on column public.tenants.upi_autoverify_enabled is
  'When true, the direct_upi pay flow waits for listener confirmation instead of
   the student self-confirming. Default false (behaviour unchanged).';

-- 3. Incoming UPI credit ledger (idempotency + admin audit + unmatched view).
create table if not exists public.upi_credit_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  raw_text        text not null,
  package         text,
  parsed_paise    integer,
  received_at     timestamptz,
  matched_order_id uuid references public.orders(id) on delete set null,
  status          text not null check (status in ('matched','unmatched','unparsed','duplicate')),
  dedup_hash      text not null,
  created_at      timestamptz not null default now(),
  constraint upi_credit_events_dedup_unique unique (tenant_id, dedup_hash)
);

create index if not exists upi_credit_events_tenant_created_idx
  on public.upi_credit_events (tenant_id, created_at desc);

-- 4. Fast matcher lookup: pending orders by tenant + status.
create index if not exists orders_tenant_status_pending_idx
  on public.orders (tenant_id, status)
  where status = 'pending_payment';

-- 5. RLS: service role does everything; tenant admins read their own rows.
alter table public.upi_credit_events enable row level security;

drop policy if exists upi_credit_events_admin_read on public.upi_credit_events;
create policy upi_credit_events_admin_read
  on public.upi_credit_events for select
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = upi_credit_events.tenant_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('canteen_admin','super_admin')
    )
  );

-- 6. safe_capture_upi_credit — atomic, idempotent confirm for a listener-matched order.
-- Mirrors safe_capture_payment but: source='upi_listener', validates the credited
-- amount equals the order's expected final amount (total_paise + verify tag).
create or replace function public.safe_capture_upi_credit(
  p_order_id     uuid,
  p_tenant_id    uuid,
  p_amount_paise bigint,
  p_raw_event_id text
) returns text   -- 'captured' | 'already_captured' | 'not_found' | 'amount_mismatch'
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   text;
  v_order_id uuid;
  v_expected bigint;
begin
  select id, status, (total_paise + coalesce(upi_verify_paise, 0))
    into v_order_id, v_status, v_expected
  from orders
  where id = p_order_id
    and tenant_id = p_tenant_id
  for update;

  if v_order_id is null then
    return 'not_found';
  end if;

  if v_status <> 'pending_payment' then
    return 'already_captured';
  end if;

  if p_amount_paise <> v_expected then
    return 'amount_mismatch';
  end if;

  insert into payments (tenant_id, order_id, razorpay_order_id, razorpay_payment_id, amount_paise, status, raw_event_id)
  values (p_tenant_id, p_order_id, null, p_raw_event_id, p_amount_paise, 'captured', p_raw_event_id)
  on conflict (raw_event_id) do nothing;

  update orders
  set status = 'placed'
  where id = p_order_id
    and tenant_id = p_tenant_id
    and status = 'pending_payment';

  insert into order_events (tenant_id, order_id, event_type, payload)
  values (
    p_tenant_id, p_order_id, 'status_changed',
    jsonb_build_object('from','pending_payment','to','placed','source','upi_listener','verified',true)
  );

  insert into order_status_logs (tenant_id, order_id, from_status, to_status, note)
  values (
    p_tenant_id, p_order_id,
    'pending_payment'::public.order_status, 'placed'::public.order_status,
    'Auto-verified via UPI listener'
  );

  return 'captured';
end;
$$;

comment on function public.safe_capture_upi_credit is
  'Atomic auto-verify for a listener-matched direct-UPI order: FOR UPDATE lock +
   amount check (total_paise + upi_verify_paise) + payments upsert + orders status
   + order_events INSERT (source=upi_listener, verified=true) + order_status_logs.';
```

- [ ] **Step 2: Apply the migration**

Apply against the dev database. Either:
- Supabase CLI: `pnpm dlx supabase db push` (or the project's existing migrate command — check `package.json`/`scripts/`), OR
- Supabase MCP `apply_migration` with name `0027_upi_autoverify` and the SQL above.

Expected: migration applies with no error. Verify columns/table/function exist:
`select column_name from information_schema.columns where table_name='orders' and column_name='upi_verify_paise';` returns one row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0027_upi_autoverify.sql
git commit -m "feat(db): schema + safe_capture_upi_credit RPC for direct-UPI auto-verify"
```

---

## Task 2: Unique verify-paise generator (pure function, TDD)

**Files:**
- Create: `src/lib/payments/upi-verify.ts`
- Test: `src/__tests__/upi-verify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/upi-verify.test.ts
import { describe, it, expect } from "vitest";
import { pickVerifyPaise, finalAmountPaise } from "@/lib/payments/upi-verify";

describe("pickVerifyPaise", () => {
  it("returns a tag in 1..99 for an empty canteen", () => {
    const tag = pickVerifyPaise(5000, []);
    expect(tag).toBeGreaterThanOrEqual(1);
    expect(tag).toBeLessThanOrEqual(99);
  });

  it("never collides with an existing final amount on the same base", () => {
    // base 5000; final 5001 already taken → tag must not be 1
    const tag = pickVerifyPaise(5000, [5001]);
    expect(5000 + tag).not.toBe(5001);
  });

  it("ignores taken finals on a different base", () => {
    // 6043 is a different base; should not constrain base 5000 at all
    const tag = pickVerifyPaise(5000, [6043]);
    expect(tag).toBeGreaterThanOrEqual(1);
    expect(tag).toBeLessThanOrEqual(99);
  });

  it("returns 0 (manual fallback) when all 99 tags for the base are taken", () => {
    const taken = Array.from({ length: 99 }, (_, i) => 5000 + (i + 1));
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/upi-verify.test.ts`
Expected: FAIL — module `@/lib/payments/upi-verify` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/payments/upi-verify.ts

/** Final amount the student actually pays = menu total + uniqueness tag. */
export function finalAmountPaise(totalPaise: number, verifyPaise: number | null): number {
  return totalPaise + (verifyPaise ?? 0);
}

/**
 * Pick a 1..99 paise tag so that `basePaise + tag` is unique among the tenant's
 * currently-pending final amounts. Returns 0 if every tag for this base is taken
 * (caller routes that order to the manual safety net).
 *
 * @param basePaise        the order's menu total in paise
 * @param takenFinalAmounts final amounts (total+tag) of the tenant's pending orders
 */
export function pickVerifyPaise(basePaise: number, takenFinalAmounts: number[]): number {
  const taken = new Set(takenFinalAmounts);
  // Randomised start so concurrent placements are unlikely to probe in lockstep.
  const start = 1 + Math.floor(Math.random() * 99);
  for (let i = 0; i < 99; i++) {
    const tag = ((start - 1 + i) % 99) + 1; // 1..99
    if (!taken.has(basePaise + tag)) return tag;
  }
  return 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/upi-verify.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/upi-verify.ts src/__tests__/upi-verify.test.ts
git commit -m "feat(payments): unique verify-paise tag generator"
```

---

## Task 3: UPI notification amount parser (pure function, TDD)

**Files:**
- Create: `src/lib/payments/upi-parse.ts`
- Test: `src/__tests__/upi-parse.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/upi-parse.test.ts
import { describe, it, expect } from "vitest";
import { parseUpiCreditPaise } from "@/lib/payments/upi-parse";

describe("parseUpiCreditPaise", () => {
  it("parses PhonePe style", () => {
    expect(parseUpiCreditPaise("You have received ₹50.43 from John via UPI")).toBe(5043);
  });
  it("parses Google Pay style", () => {
    expect(parseUpiCreditPaise("₹120.00 received from Aman")).toBe(12000);
  });
  it("parses Paytm 'Rs' style", () => {
    expect(parseUpiCreditPaise("Received Rs 7.05 in your Paytm")).toBe(705);
  });
  it("parses 'INR' style", () => {
    expect(parseUpiCreditPaise("INR 250.50 credited")).toBe(25050);
  });
  it("parses amounts with thousands separators", () => {
    expect(parseUpiCreditPaise("You received ₹1,234.56")).toBe(123456);
  });
  it("treats a whole-rupee amount as .00", () => {
    expect(parseUpiCreditPaise("Received ₹50")).toBe(5000);
  });
  it("returns null when there is no amount", () => {
    expect(parseUpiCreditPaise("Payment request from John")).toBeNull();
  });
  it("ignores debit/sent notifications", () => {
    expect(parseUpiCreditPaise("₹50.43 sent to John")).toBeNull();
    expect(parseUpiCreditPaise("You paid ₹50.43 to John")).toBeNull();
    expect(parseUpiCreditPaise("₹50.43 debited from your account")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/upi-parse.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/payments/upi-parse.ts

// Words that mean "money left the account" — if present, this is NOT a credit.
const DEBIT_WORDS = /\b(sent|paid|debited|debit|request(ed)?)\b/i;

// Matches ₹ / Rs / Rs. / INR followed by a number with optional thousands
// separators and optional .paise. Captures the numeric part.
const AMOUNT_RE = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;

/**
 * Parse the credited rupee amount (in paise) from a UPI app notification.
 * Returns null if the text is a debit/sent/request notification or has no amount.
 */
export function parseUpiCreditPaise(text: string): number | null {
  if (!text) return null;
  if (DEBIT_WORDS.test(text)) return null;

  const m = AMOUNT_RE.exec(text);
  if (!m) return null;

  const numeric = m[1].replace(/,/g, "");
  const rupees = Number.parseFloat(numeric);
  if (!Number.isFinite(rupees)) return null;

  // Round to nearest paise to avoid float drift (e.g. 50.43 → 5043).
  return Math.round(rupees * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/upi-parse.test.ts`
Expected: PASS (9 tests).

> Note: real-world notification strings vary. Unparseable strings are stored as
> `status='unparsed'` by Task 5 so formats can be added here later.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/upi-parse.ts src/__tests__/upi-parse.test.ts
git commit -m "feat(payments): parse credited paise from UPI notification text"
```

---

## Task 4: Generate + persist the unique amount in placeOrder

**Files:**
- Modify: `src/app/(student)/_actions.ts` (the order insert block, around lines 357-393)

- [ ] **Step 1: Add the import**

At the top of `src/app/(student)/_actions.ts`, add to the existing imports:

```ts
import { pickVerifyPaise } from "@/lib/payments/upi-verify";
```

- [ ] **Step 2: Compute the tag before the order insert**

Immediately **before** the `const orderInsert = await admin.from("orders").insert({...})` block, insert:

```ts
  // Direct-UPI auto-verify: give the order a unique final amount (total + 1..99 paise)
  // so the counter-phone listener can match the incoming UPI notification to it.
  // Only meaningful on the direct_upi rail; harmless (still stored) on razorpay.
  let verifyPaise: number | null = null;
  if (paymentMode === "direct_upi") {
    const { data: pendingRows } = await admin
      .from("orders")
      .select("total_paise, upi_verify_paise")
      .eq("tenant_id", tenant.id)
      .eq("status", "pending_payment")
      .gt("payment_expires_at", new Date().toISOString())
      .returns<{ total_paise: number; upi_verify_paise: number | null }[]>();
    const takenFinals = (pendingRows ?? []).map(
      (r) => r.total_paise + (r.upi_verify_paise ?? 0)
    );
    const tag = pickVerifyPaise(total, takenFinals);
    verifyPaise = tag === 0 ? null : tag; // 0 = collision fallback → manual net
  }
```

- [ ] **Step 3: Persist the tag on the order**

In the `admin.from("orders").insert({...})` object, add one field (after `total_paise: total,`):

```ts
      upi_verify_paise: verifyPaise,
```

- [ ] **Step 4: Verify the build typechecks**

Run: `pnpm typecheck`
Expected: no new errors. (If the generated DB types don't yet include `upi_verify_paise`, cast the insert object the same way other new columns are cast in this file, e.g. `as any` on the insert payload, matching existing patterns around `idempotency_keys`.)

- [ ] **Step 5: Commit**

```bash
git add src/app/(student)/_actions.ts
git commit -m "feat(orders): assign unique upi_verify_paise tag on direct_upi orders"
```

---

## Task 5: The listener endpoint (TDD)

**Files:**
- Create: `src/app/api/webhooks/upi-credit/route.ts`
- Test: `src/__tests__/upi-credit-webhook.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @ts-nocheck — mock objects intentionally omit Supabase client internals
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({
  env: { SUPABASE_SERVICE_ROLE_KEY: "service_role_test_key" },
}));
vi.mock("@/lib/logging", () => {
  const noop = () => {};
  const l = { debug: noop, info: noop, warn: noop, error: noop, withContext: () => l };
  return { logger: l, withRequestContext: () => l };
});
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}));

const mockRpc = vi.fn();
const mockGetAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: (...a) => mockGetAdminClient(...a) }));

import { POST } from "@/app/api/webhooks/upi-credit/route";

const TENANT = "tenant-uuid-001";
const SECRET = "tray_upi_secret_demo";

function makeReq(body, secret = SECRET) {
  return new Request("http://localhost/api/webhooks/upi-credit", {
    method: "POST",
    headers: { "content-type": "application/json", "x-tray-upi-secret": secret, "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

// Admin client where: tenants lookup returns our tenant+secret, orders matcher
// returns one pending order at the given final amount, RPC returns 'captured',
// and upi_credit_events insert succeeds.
function adminWith({ tenantRow, matchRows, rpcResult }) {
  return () => ({
    from: (table) => {
      if (table === "tenants") {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: tenantRow, error: null }) }) }) };
      }
      if (table === "orders") {
        return { select: () => ({ eq: () => ({ eq: () => ({ gt: () => ({ returns: () => Promise.resolve({ data: matchRows, error: null }) }) }) }) }) };
      }
      if (table === "upi_credit_events") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    },
    rpc: vi.fn().mockResolvedValue({ data: rpcResult, error: null }),
  });
}

describe("upi-credit listener", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s on a bad secret", async () => {
    mockGetAdminClient.mockImplementation(
      adminWith({ tenantRow: { id: TENANT, upi_listener_secret: SECRET, upi_autoverify_enabled: true }, matchRows: [], rpcResult: "captured" })
    );
    const res = await POST(makeReq({ tenant: TENANT, text: "₹50.43 received" }, "WRONG"));
    expect(res.status).toBe(401);
  });

  it("confirms the matching order and returns matched:true", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "captured", error: null });
    mockGetAdminClient.mockImplementation(() => ({
      from: (table) => {
        if (table === "tenants") return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: TENANT, upi_listener_secret: SECRET, upi_autoverify_enabled: true }, error: null }) }) }) };
        if (table === "orders") return { select: () => ({ eq: () => ({ eq: () => ({ gt: () => ({ returns: () => Promise.resolve({ data: [{ id: "order-1", total_paise: 5000, upi_verify_paise: 43, placed_at: "2026-05-31T00:00:00Z" }], error: null }) }) }) }) }) };
        if (table === "upi_credit_events") return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      },
      rpc,
    }));
    const res = await POST(makeReq({ tenant: TENANT, text: "You received ₹50.43 from X" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched).toBe(true);
    expect(rpc).toHaveBeenCalledWith("safe_capture_upi_credit", expect.objectContaining({ p_order_id: "order-1", p_amount_paise: 5043 }));
  });

  it("returns matched:false when no pending order has that amount", async () => {
    mockGetAdminClient.mockImplementation(
      adminWith({ tenantRow: { id: TENANT, upi_listener_secret: SECRET, upi_autoverify_enabled: true }, matchRows: [], rpcResult: "captured" })
    );
    const res = await POST(makeReq({ tenant: TENANT, text: "₹999.99 received" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matched).toBe(false);
  });

  it("returns parsed:false for unparseable text", async () => {
    mockGetAdminClient.mockImplementation(
      adminWith({ tenantRow: { id: TENANT, upi_listener_secret: SECRET, upi_autoverify_enabled: true }, matchRows: [], rpcResult: "captured" })
    );
    const res = await POST(makeReq({ tenant: TENANT, text: "Payment request from John" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.parsed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__tests__/upi-credit-webhook.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Write the endpoint**

```ts
// src/app/api/webhooks/upi-credit/route.ts
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";
import { rateLimit } from "@/lib/rate-limit";
import { parseUpiCreditPaise } from "@/lib/payments/upi-parse";
import { finalAmountPaise } from "@/lib/payments/upi-verify";

type Body = { tenant?: string; text?: string; package?: string; received_at?: string };
type TenantRow = { id: string; upi_listener_secret: string | null; upi_autoverify_enabled: boolean };
type OrderRow = { id: string; total_paise: number; upi_verify_paise: number | null; placed_at: string };

function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function POST(req: NextRequest) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`webhook:upi-credit:${ip}`, { limit: 120, windowMs: 60_000 });
  if (!rl.success) return NextResponse.json({ ok: true }, { status: 200 });

  const raw = await req.text();
  let body: Body;
  try { body = JSON.parse(raw) as Body; } catch { return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 }); }

  const tenantId = body.tenant?.trim();
  const text = (body.text ?? "").toString();
  const providedSecret = req.headers.get("x-tray-upi-secret") ?? "";
  if (!tenantId) return NextResponse.json({ ok: false, error: "Missing tenant" }, { status: 400 });

  const admin = getAdminClient();
  const { data: tenantRow } = await admin
    .from("tenants")
    .select("id, upi_listener_secret, upi_autoverify_enabled")
    .eq("id", tenantId)
    .maybeSingle<TenantRow>();

  if (!tenantRow?.upi_listener_secret || !constantTimeEqual(providedSecret, tenantRow.upi_listener_secret)) {
    logger.warn("upi-credit: bad secret", { tenant_id: tenantId });
    return NextResponse.json({ ok: false, error: "Unauthorised" }, { status: 401 });
  }

  const tenantAdmin = getAdminClient(tenantId);
  const dedupHash = crypto.createHash("sha256")
    .update(`${tenantId}|${text}|${body.received_at ?? ""}`)
    .digest("hex")
    .slice(0, 40);

  const parsedPaise = parseUpiCreditPaise(text);

  // Helper to record the credit event (idempotent on dedup_hash).
  const record = async (status: string, matchedOrderId: string | null) => {
    await (tenantAdmin as any).from("upi_credit_events").insert({
      tenant_id: tenantId,
      raw_text: text.slice(0, 500),
      package: body.package ?? null,
      parsed_paise: parsedPaise,
      received_at: body.received_at ?? null,
      matched_order_id: matchedOrderId,
      status,
      dedup_hash: dedupHash,
    });
  };

  if (parsedPaise === null) {
    await record("unparsed", null);
    return NextResponse.json({ ok: true, parsed: false });
  }

  // Find pending orders whose final amount equals the credited amount.
  const { data: pending } = await (tenantAdmin
    .from("orders")
    .select("id, total_paise, upi_verify_paise, placed_at")
    .eq("tenant_id", tenantId)
    .eq("status", "pending_payment")
    .gt("payment_expires_at", new Date().toISOString()) as any)
    .returns<OrderRow[]>();

  const matches = (pending ?? [])
    .filter((o) => finalAmountPaise(o.total_paise, o.upi_verify_paise) === parsedPaise)
    .sort((a, b) => new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime());

  if (matches.length === 0) {
    await record("unmatched", null);
    return NextResponse.json({ ok: true, parsed: true, matched: false });
  }

  const target = matches[0]; // oldest; uniqueness should make this the only one
  const rawEventId = `upi_listener_${dedupHash}`;
  const { data: result } = await (tenantAdmin as any).rpc("safe_capture_upi_credit", {
    p_order_id: target.id,
    p_tenant_id: tenantId,
    p_amount_paise: parsedPaise,
    p_raw_event_id: rawEventId,
  });

  await record(result === "captured" || result === "already_captured" ? "matched" : "unmatched", target.id);
  logger.info("upi-credit processed", { tenant_id: tenantId, order_id: target.id, result, parsed_paise: parsedPaise });

  return NextResponse.json({ ok: true, parsed: true, matched: result === "captured" || result === "already_captured", result });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__tests__/upi-credit-webhook.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all pass; no new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/webhooks/upi-credit/route.ts src/__tests__/upi-credit-webhook.test.ts
git commit -m "feat(api): UPI credit listener endpoint (auth + parse + match + confirm)"
```

---

## Task 6: Pay panel — autoverify wait-for-confirmation + 90s fallback

**Files:**
- Modify: `src/app/(student)/pay/[orderId]/page.tsx`
- Modify: `src/components/portal-student/pay-panel.tsx`

- [ ] **Step 1: Pass the final amount + flag from the page**

In `src/app/(student)/pay/[orderId]/page.tsx`, where the order + tenant are loaded and `PayPanel` is rendered:
- Select `upi_verify_paise` on the order and `upi_autoverify_enabled` on the tenant.
- Pass two new props to `PayPanel`: `upiAutoverifyEnabled={tenant.upi_autoverify_enabled === true}` and `verifyPaise={order.upi_verify_paise ?? null}`.

(Match the existing select + prop-passing style already in this file.)

- [ ] **Step 2: Accept the props in PayPanel**

In `src/components/portal-student/pay-panel.tsx`, add to the `PayPanel` props type and destructure:

```ts
  upiAutoverifyEnabled?: boolean;
  verifyPaise?: number | null;
```
with defaults `upiAutoverifyEnabled = false, verifyPaise = null` in the destructure.

- [ ] **Step 3: Charge the final amount**

Replace the QR/charge amount source. Add near the top of the component body:

```ts
  // When auto-verify is on, the student must pay the EXACT unique amount so the
  // listener can match it. Otherwise charge the plain total (unchanged behaviour).
  const chargePaise = upiAutoverifyEnabled ? order.total_paise + (verifyPaise ?? 0) : order.total_paise;
```

Then use `chargePaise` instead of `order.total_paise` in:
- the `upiQrPayload({ ... amountPaise: chargePaise ... })` call, and
- the displayed "Pay ₹X" heading and the order-total figure on this screen.

- [ ] **Step 4: Gate the self-confirm button behind autoverify**

The existing fallback block renders when `showFallback && paymentMode === "direct_upi"`. Change the condition so that when autoverify is ON, the self-confirm button only appears as a **last-resort fallback** after the 90s timer, and the copy makes clear it creates an UNVERIFIED order:

- Change the fallback timer (currently `20_000` at the `setShowFallback(true)` effect) to `upiAutoverifyEnabled ? 90_000 : 20_000`.
- When `upiAutoverifyEnabled` is true and `phase === "monitoring"` and `!showFallback`, show the message: **"Waiting for payment confirmation… this is automatic and usually takes a few seconds."** (Reuse the existing `monitoringMsg` area.)

This keeps non-autoverify tenants exactly as today, and makes autoverify tenants wait for the real listener confirmation (delivered via the existing Realtime subscription) before any manual option appears.

- [ ] **Step 5: Verify in the running app**

Run the dev server (or use the one already on port 3000). With a tenant set to `upi_autoverify_enabled = true`:
- Place an order → pay screen shows the unique amount (e.g. ₹50.43).
- POST a matching credit to `/api/webhooks/upi-credit` (curl with the tenant secret) → the pay screen flips to success automatically without tapping anything.

Run (example):
```bash
curl -s -X POST http://localhost:3000/api/webhooks/upi-credit \
  -H "content-type: application/json" -H "x-tray-upi-secret: <secret>" \
  -d '{"tenant":"<tenant-id>","text":"You received ₹50.43 from Test","received_at":"2026-05-31T10:00:00Z"}'
```
Expected response: `{"ok":true,"parsed":true,"matched":true,"result":"captured"}` and the student screen redirects to the track page.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(student\)/pay/\[orderId\]/page.tsx src/components/portal-student/pay-panel.tsx
git commit -m "feat(pay): autoverify charges unique amount + waits for listener confirmation"
```

---

## Task 7: Kitchen board — auto-verified badge + hold unverified

**Files:**
- Modify: `src/components/portal-kitchen/board.tsx` and/or `src/components/portal-kitchen/order-column.tsx`

- [ ] **Step 1: Read the current order rendering**

Read both files to find where an order card is rendered and where the existing `upi_unverified` flag (from the `order_events` payload / order status logs) is surfaced as a badge.

- [ ] **Step 2: Add the auto-verified badge**

Where the unverified badge is decided, add the positive case: an order whose latest status_changed event has `source === "upi_listener"` (or `verified === true`) renders a **green "✅ Auto-verified"** badge. Match the existing badge component/markup used for the unverified state — do not invent a new style system.

- [ ] **Step 3: Hold unverified orders**

For an order flagged `upi_unverified` (student "I paid" fallback path), disable the "Start preparing" control and add a **"Payment received ✓"** button. Wire it to a kitchen action (in `src/app/(kitchen)/_actions.ts`, following the existing action pattern there) that clears the unverified flag (emit an `order_events` row `{ source: "staff_confirm", verified: true }` + `order_status_logs` entry) and re-enables preparing. Auto-verified and razorpay orders are never held.

- [ ] **Step 4: Verify in the running app**

With the kitchen board open:
- An auto-verified order shows the green badge and can be started immediately.
- A student-"I paid" order shows held state; "Payment received ✓" unlocks "Start preparing".

- [ ] **Step 5: Commit**

```bash
git add src/components/portal-kitchen/ src/app/\(kitchen\)/_actions.ts
git commit -m "feat(kitchen): auto-verified badge + hold unverified until staff confirm"
```

---

## Task 8: Admin setup card + actions

**Files:**
- Create: `src/components/portal-admin/upi-autoverify-card.tsx`
- Modify: `src/app/(admin)/admin/_actions.ts`
- Modify: `src/app/(admin)/admin/settings/page.tsx`

- [ ] **Step 1: Add admin server actions**

In `src/app/(admin)/admin/_actions.ts`, following the existing action + `requireTenantContext()` + `getAdminClient(tenant.id)` pattern, add:

```ts
import crypto from "crypto";

export async function setUpiAutoverify(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const { tenant } = await requireTenantContext();
  const admin = getAdminClient(tenant.id);
  // Generate a secret on first enable if none exists.
  const { data: row } = await admin.from("tenants").select("upi_listener_secret").eq("id", tenant.id).maybeSingle<{ upi_listener_secret: string | null }>();
  const patch: Record<string, unknown> = { upi_autoverify_enabled: enabled };
  if (enabled && !row?.upi_listener_secret) {
    patch.upi_listener_secret = `tray_upi_${crypto.randomBytes(18).toString("hex")}`;
  }
  const { error } = await admin.from("tenants").update(patch as any).eq("id", tenant.id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function rotateUpiSecret(): Promise<{ ok: boolean; secret?: string; error?: string }> {
  const { tenant } = await requireTenantContext();
  const admin = getAdminClient(tenant.id);
  const secret = `tray_upi_${crypto.randomBytes(18).toString("hex")}`;
  const { error } = await admin.from("tenants").update({ upi_listener_secret: secret } as any).eq("id", tenant.id);
  return error ? { ok: false, error: error.message } : { ok: true, secret };
}

export async function getRecentUpiCredits(): Promise<{ rows: { raw_text: string; parsed_paise: number | null; status: string; created_at: string }[] }> {
  const { tenant } = await requireTenantContext();
  const admin = getAdminClient(tenant.id);
  const { data } = await (admin as any).from("upi_credit_events")
    .select("raw_text, parsed_paise, status, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(10);
  return { rows: data ?? [] };
}
```

- [ ] **Step 2: Build the card component**

Create `src/components/portal-admin/upi-autoverify-card.tsx` (client component) that:
- shows the enable/disable toggle (calls `setUpiAutoverify`),
- shows the webhook URL `https://<app domain>/api/webhooks/upi-credit` and the secret (with a copy button + "Rotate secret" calling `rotateUpiSecret`),
- shows a collapsible **MacroDroid setup guide** (static text): install MacroDroid → New Macro → Trigger: "Notification Received" from the UPI app → Action: "HTTP Request (POST)" to the URL, header `x-tray-upi-secret: <secret>`, body `{"tenant":"<tenant id>","text":"{notification_text}","package":"{package_name}","received_at":"{date}"}`,
- lists the last credits from `getRecentUpiCredits` ("last received").

Match the existing card markup/styling in `src/components/portal-admin/` (reuse the same card container classes used by neighboring settings cards).

- [ ] **Step 3: Render it on the settings page**

In `src/app/(admin)/admin/settings/page.tsx`, import and render `<UpiAutoverifyCard tenantId={tenant.id} />` within the existing settings layout, near the UPI VPA field.

- [ ] **Step 4: Verify in the running app**

Open Admin → Settings:
- Toggle on → a secret appears; webhook URL shown; MacroDroid guide expands.
- After the Task 6 curl test, the credit shows in "last received".

- [ ] **Step 5: Commit**

```bash
git add src/components/portal-admin/upi-autoverify-card.tsx src/app/\(admin\)/admin/_actions.ts src/app/\(admin\)/admin/settings/page.tsx
git commit -m "feat(admin): UPI auto-verify setup card (toggle, secret, MacroDroid guide, recent credits)"
```

---

## Task 9: Final verification pass

- [ ] **Step 1: Full test + typecheck + lint + build**

Run:
```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```
Expected: all green.

- [ ] **Step 2: End-to-end manual flow (autoverify tenant)**

1. Set a test tenant `payment_mode='direct_upi'`, `upi_autoverify_enabled=true`.
2. Place an order → confirm pay screen shows the unique amount.
3. Curl the listener with the matching amount + correct secret → pay screen auto-succeeds; kitchen shows ✅ Auto-verified.
4. Curl with a wrong secret → 401; with a non-matching amount → `matched:false` and an "unmatched" row in the admin card.
5. With the counter "offline" (don't curl): after 90s the fallback "I paid" appears → order enters kitchen **held/unverified** → staff "Payment received ✓" unlocks it.

- [ ] **Step 3: Confirm the razorpay rail is untouched**

Set a tenant `payment_mode='razorpay'` and confirm the pay screen + webhook behave exactly as before (no unique amount, Razorpay checkout, auto-confirm).

- [ ] **Step 4: Commit any fixes, then stop for review**

```bash
git add -A && git commit -m "test: end-to-end verification for direct-UPI auto-verify"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** unique amount (Task 1,2,4) · listener endpoint (Task 5) · verified vs unverified (Task 1 RPC + Task 7) · pay panel wait/fallback (Task 6) · kitchen badge + hold (Task 7) · admin setup + unmatched view (Task 8) · `upi_credit_events` ledger/idempotency (Task 1,5) · security/auth (Task 5) · testing (Tasks 2,3,5,9). All spec sections map to a task.
- **Placeholders:** none — logic tasks ship full code + tests; UI tasks give exact insertion points and code, verified via the running app (matching this repo's existing UI verification approach).
- **Type/name consistency:** `pickVerifyPaise` / `finalAmountPaise` (upi-verify), `parseUpiCreditPaise` (upi-parse), `safe_capture_upi_credit(p_order_id,p_tenant_id,p_amount_paise,p_raw_event_id)`, `upi_verify_paise`, `upi_listener_secret`, `upi_autoverify_enabled`, `upi_credit_events`, header `x-tray-upi-secret` — used identically across Tasks 1–8.

## Open items to finalize during execution
- Confirm the project's migration apply command (CLI vs Supabase MCP) before Task 1 Step 2.
- Confirm the exact MacroDroid magic-variable tokens for notification text/package on the admin's device.
- 90s fallback delay is a proposal (Task 6) — adjustable after real-world testing.
