<div align="center">

# Tray

**Zero-commission ordering for street food stalls, tiffin centers, and canteens.**

A stall owner signs up, prints one QR, and customers order and pay the stall's
own UPI directly. One deployment serves every outlet — each gets its own link,
menu, and live dashboard.

[![CI](https://github.com/thribhuvan003/trayy/actions/workflows/ci.yml/badge.svg)](https://github.com/thribhuvan003/trayy/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-trayy.vercel.app-22c55e?style=flat-square&logo=vercel)](https://trayy.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray?style=flat-square)](./LICENSE)

</div>

---

## Overview

Tray replaces shouting, paper slips, and cash-counting at food counters — from a two-person street stall to a full campus mess. An owner signs up and immediately gets:

- A **customer ordering page** at a dedicated URL — scan the QR at the counter, order, pay
- **Direct UPI payments** — money goes straight to the owner's bank, no intermediary, zero commission
- A choice of **order flow per outlet**: a full live kitchen board for canteens with staff, or a hands-free **token counter** for stalls — paid orders confirm themselves and the customer's phone shows the token
- A **business dashboard** with real-time revenue and analytics

No IT team required. No per-tenant infrastructure. No app install for customers — it's all web.

---

## Live demo

| Portal | URL |
|--------|-----|
| Customer app | [trayy.vercel.app/c/aditya/menu](https://trayy.vercel.app/c/aditya/menu) |
| Kitchen board | [trayy.vercel.app/c/aditya/kitchen](https://trayy.vercel.app/c/aditya/kitchen) |
| Admin console | [trayy.vercel.app/c/aditya/admin/dashboard](https://trayy.vercel.app/c/aditya/admin/dashboard) |
| Area portal (multi-outlet) | [trayy.vercel.app/college/aditya](https://trayy.vercel.app/college/aditya) |

No account required to explore the demo.

---

## Architecture

### Multi-tenancy

Every database row carries a `tenant_id`. Postgres Row Level Security enforces isolation at the database layer — not in application code. There is no scattered `WHERE tenant_id = ?` logic; a mis-scoped query returns zero rows and cannot leak another tenant's data.

A single Vercel deployment serves **N locations** (a street, a PG cluster, a campus), each with **M outlets** (stalls, tiffin counters, canteens), each with their own URL, menu, payment account, and dashboard.

### Routing

```
/c/[slug]/menu            →  customer ordering app
/c/[slug]/kitchen         →  live kitchen queue (+ /kitchen/announce audio counter)
/c/[slug]/admin/...       →  business dashboard
/college/[slug]           →  area-level multi-outlet view (legacy path name)
```

`middleware.ts` resolves the tenant slug from the path before any route handler runs, then injects `x-tenant-slug` into the request headers. Route handlers never parse URLs for tenant context — they read a header.

### Payment flow

Each tenant picks its rail (`payment_mode`):

**Direct UPI (default)** — the customer pays the stall's own VPA via a `upi://` deep link (GPay / PhonePe / Paytm) or QR. Money is instant and peer-to-peer, which means no server can verify it programmatically — so the order enters the queue flagged unverified, and an optional SMS-listener webhook (`upi-credit`) auto-verifies by matching a unique paise tag on the amount.

**Razorpay (gateway)** —
1. Order placed → Razorpay order created
2. Razorpay fires `payment.captured` webhook → HMAC-SHA256 verified
3. `safe_capture_payment()` Postgres function acquires a `SELECT ... FOR UPDATE` row lock, validates the received amount against the order total, then transitions the order atomically
4. Order appears on the kitchen board in under one second

The webhook handler is fully idempotent: a `raw_event_id` unique constraint on `payments` makes duplicate delivery a database no-op. Failed webhooks write to a Dead Letter Queue; a daily reconciliation cron cross-checks every `pending_payment` order against the Razorpay API.

### Realtime

Order state propagates through an append-only `order_events` table. Kitchen boards and dashboards subscribe to `INSERT` events via Supabase Realtime:

```
payment.captured webhook
  → orders.status = 'placed'       (one DB write, row-locked)
  → order_events INSERT             (in the same transaction)
    → kitchen board refresh         (< 1 s)
    → admin KPI update              (< 1 s)
    → customer tracking page        (< 1 s)
```

All three portals stay synchronized. A 20-second poll fallback and exponential-backoff reconnect (900 ms base, 30 s cap, ±400 ms jitter) keep the kitchen board alive through 30–60 second WiFi drops.

### One schema, two very different counters

Tray started as a campus canteen system and was repositioned for street stalls. The pivot cost almost no schema changes — a mess with kitchen staff and a one-person dosa cart differ only in *who advances an order*, so that became a per-tenant switch (`order_mode`): the full board pipeline for canteens, or "paid ⇒ done, show your token" for stalls. Same tables, same payment rails, same realtime fan-out.

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 App Router + React 19 + TypeScript strict | Server components, streaming, zero-config deployment |
| Database | Supabase Postgres + Row Level Security | Native multi-tenant isolation, no application-layer filtering |
| Auth | Supabase Auth | Magic link for customers, PIN kiosk for kitchen staff |
| Realtime | Supabase Realtime — `order_events` INSERT fan-out | Append-only events = minimal WAL, no duplicate status updates |
| Payments | Razorpay UPI | HMAC webhooks, direct VPA settlement, zero card data stored |
| Styling | Tailwind CSS v4 | Separate design tokens per portal (cream/crimson for customers, dark editorial for kitchen) |
| State | Zustand (cart) + React Server Components (server state) | Per-tenant cart bucket in localStorage; no global client state |
| Animation | Framer Motion + GSAP + Lenis | Scroll-triggered reveals, magnetic buttons, smooth scroll |
| Rate limiting | Upstash Redis | Distributed across Vercel instances; in-memory fallback for local dev |
| Background jobs | QStash (Upstash) | Order expiry at 15 min, daily payment reconciliation |
| Email | Resend | Magic link delivery |
| Error tracking | Sentry | Auto-captures all `logger.error()` calls with structured context |
| Logging | Structured JSON logger | `order_id`, `tenant_id`, `payment_id`, `latency_ms` on every line |
| Deployment | Vercel | Edge middleware for tenant resolution, zero-config |

---

## Portals

### Customer `/c/[slug]/`

- Browse menu with live availability, search, and veg/egg/nonveg filter
- Cart with takeaway or dine-in selection, persisted per outlet in localStorage
- UPI payment: `upi://` deep link on mobile, QR code on desktop
- Two order flows per outlet: full tracking (Placed → Preparing → Ready → Collected) for kitchens, or **token counter** (paid ⇒ token shown, no kitchen step) for stalls
- 4-digit OTP handover at the counter (3-attempt lockout)
- 5-minute cancel window with automatic refund to source account
- Kitchen "busy" warning when queue depth exceeds threshold

### Kitchen board `/c/[slug]/kitchen`

- Four-column live queue: Incoming → Preparing → Ready → Collected
- 44–56 px touch targets for wet or gloved hands on low-end tablets
- 5-second undo window after any status advance — one tap reverses a mistake
- Order rejection with selectable reason + free text; refund triggered automatically
- Prep totals: aggregated quantities across all active orders ("7× Biryani")
- One-tap SOLD OUT per item; updates the customer menu in under 300 ms
- Walk-in order creation: staff searches/browses menu, places order at the counter
- New-order bell chime with mute toggle, plus an optional hands-free audio announcer (`/kitchen/announce`) that reads each paid order aloud
- Three-state connection indicator: Online / Reconnecting / OFFLINE
- Exponential-backoff reconnect; 20-second poll fallback; survives network drops
- PIN kiosk for shift-based staff login

### Admin console `/c/[slug]/admin/`

- Live KPIs: revenue, order count, average ticket, average pickup time — with week-over-week delta
- 7-day revenue trend chart and peak-hour heatmap
- Top-selling items
- Real-time order activity feed
- Menu management: add, edit, toggle availability, manage categories
- Order management: full history with search, cancel any active order with logged reason
- Staff management: invite by email, assign PIN codes
- Settings: UPI VPA (Razorpay-validated at save), opening hours, pause/unpause with countdown
- CSV export filtered by date range

### Area portal `/college/[slug]/` (legacy path name)

- Multi-outlet overview for an operator running several stalls/counters in one area
- Live order counts and open/close status per outlet
- Cross-outlet reports

---

## Project structure

```
tray/
├── src/
│   ├── app/
│   │   ├── (admin)/              Admin portal route group
│   │   │   ├── admin/
│   │   │   │   ├── _actions.ts   Server actions: menu, orders, staff, settings
│   │   │   │   ├── analytics/    Analytics & KPI page
│   │   │   │   ├── dashboard/    Main dashboard with live KPIs
│   │   │   │   ├── menu/         Menu management (list, new, edit)
│   │   │   │   ├── orders/       Order history & management
│   │   │   │   ├── settings/     Canteen settings & UPI ID validation
│   │   │   │   └── staff/        Staff invites & PIN management
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (kitchen)/            Kitchen portal route group
│   │   │   ├── _actions.ts       markPreparing, markReady, rejectOrder, revertStatus, createWalkInOrder
│   │   │   ├── kitchen/
│   │   │   │   ├── page.tsx      Live queue board (force-dynamic)
│   │   │   │   ├── history/      Today's completed orders
│   │   │   │   └── staff-select/ PIN kiosk login
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (student)/            Customer portal route group (folder name kept; serves customers)
│   │   │   ├── _actions.ts       placeOrder, cancelOrder, verifyPayment, getOtp, initiateRefund
│   │   │   ├── menu/             Menu browse
│   │   │   ├── orders/           Order history
│   │   │   ├── pay/[orderId]/    UPI payment screen
│   │   │   └── track/[orderId]/  Live order tracking + OTP display
│   │   │
│   │   ├── (public)/             Unauthenticated pages
│   │   │   ├── login/            Magic link + role tabs
│   │   │   ├── signup/           New account registration
│   │   │   └── legal/            Terms of service, Privacy policy
│   │   │
│   │   ├── api/
│   │   │   ├── health/           GET — DB connectivity probe for uptime monitors
│   │   │   ├── admin/export/     GET — tenant-scoped CSV export (auth-gated)
│   │   │   ├── cron/
│   │   │   │   ├── expire-orders/        QStash: expire unpaid orders at 15 min
│   │   │   │   └── reconcile-payments/   QStash: daily DB vs Razorpay reconciliation
│   │   │   └── webhooks/razorpay/        POST — HMAC-verified payment events
│   │   │
│   │   ├── auth/                 Supabase auth callback + staff invite handler
│   │   ├── c/[slug]/             Outlet entry redirect
│   │   ├── college/[slug]/       Area multi-outlet portal (legacy folder name)
│   │   ├── college-admin/        Area operator dashboard (legacy folder name)
│   │   ├── get-started/          Self-serve onboarding wizard
│   │   └── page.tsx              Landing page
│   │
│   ├── components/
│   │   ├── portal-admin/         Dashboard, KPI cards, charts, heatmap, activity feed
│   │   ├── portal-kitchen/       Board, order columns, OTP dialog, walk-in dialog
│   │   ├── portal-student/       Menu board, cart drawer, pay panel, track panel
│   │   ├── landing/              Landing page sections and GSAP animation engine
│   │   └── ui/                   Button, input, badge, theme toggle
│   │
│   ├── lib/
│   │   ├── auth/get-user.ts      Session resolution + role checks
│   │   ├── cart/store.ts         Zustand cart — per-tenant bucket, localStorage
│   │   ├── db/types.ts           Generated Supabase TypeScript types
│   │   ├── payments/
│   │   │   ├── razorpay.ts       Order creation, HMAC verification, VPA validation
│   │   │   └── upi.ts            UPI QR and deep link payload generator
│   │   ├── rate-limit/           Upstash Redis rate limiting with in-memory fallback
│   │   ├── supabase/
│   │   │   ├── admin.ts          Service-role admin client
│   │   │   ├── browser.ts        Cookie-aware browser client
│   │   │   └── server.ts         Server component client
│   │   ├── env.ts                Validated environment variables (Zod)
│   │   ├── logging.ts            Structured JSON logger — Sentry integration on errors
│   │   ├── tenant.ts             Tenant resolution with 30-second cache
│   │   └── utils.ts              Date, currency, className helpers
│   │
│   └── middleware.ts             Path-based tenant resolution → x-tenant-slug header
│
├── supabase/migrations/
│   ├── 0001_init.sql                              Core schema (orders, tenants, menu_items, payments)
│   ├── 0002_rls.sql                               Row Level Security policies
│   ├── 0003_realtime_seed.sql                     Initial Realtime publication
│   ├── 0006_security.sql                          Security hardening
│   ├── 0007_fix_rls_membership_recursion.sql      RLS recursion fix
│   ├── 0008_harden_function_search_paths.sql      Function search path security
│   ├── 0009_multi_canteen_foundation.sql          Multi-canteen schema + college_canteens RPC
│   ├── 0009a_enum_extensions.sql                  Order status extensions
│   ├── 0010_rls_multi_canteen.sql                 Multi-canteen RLS
│   ├── 0011_realtime_order_events.sql             order_events publication
│   ├── 0012_idempotency_ledger_and_webhook_dlq.sql  Idempotency keys + Dead Letter Queue
│   ├── 0013_payment_failed_status.sql             payment_failed order status
│   ├── 0014_safe_capture_and_walkin.sql           Atomic payment capture function
│   ├── 0015_atomic_order_events_on_capture.sql    order_events emitted inside capture transaction
│   ├── 0016_amount_validation_and_atomic_stock.sql  Amount validation + atomic stock decrement
│   ├── 0017_performance_indexes.sql               Hot-path indexes
│   ├── 0018_payments_refund_id_and_cleanup.sql    Refund tracking
│   ├── 0019_upi_trust_dlq_rls_heartbeat.sql       UPI trust flag, DLQ RLS, heartbeat
│   ├── 0020_menu_images_storage_bucket.sql        Menu image storage
│   ├── 0021_safe_fail_payment.sql                 Atomic payment-failed transition
│   ├── 0022_find_auth_user_by_email.sql           Staff invite lookup
│   ├── 0023_pre_request_set_tenant.sql            PostgREST tenant session hook
│   ├── 0024_payment_mode.sql                      Per-tenant payment rail (direct UPI vs gateway)
│   ├── 0025_admin_phone.sql                       Owner SMS alerts
│   ├── 0026_realtime_rls_fix.sql                  Realtime WebSocket RLS policies
│   ├── 0027_upi_autoverify.sql                    UPI SMS auto-verification
│   └── 0028_tenant_tier_order_mode.sql            Street edition: tier + token-counter order flow
│
├── src/__tests__/                Unit and integration tests (Vitest)
├── docs/                         Architecture decision records
├── public/                       Static assets, demo HTML files
├── sentry.client.config.ts       Sentry browser configuration
├── sentry.server.config.ts       Sentry server configuration
├── sentry.edge.config.ts         Sentry edge/middleware configuration
├── next.config.ts                Next.js + Sentry build config
└── tsconfig.json
```

---

## Key engineering decisions

**Append-only `order_events` instead of `REPLICA IDENTITY FULL` on `orders`**

Full-row WAL replication writes the entire row on every column update. Four status transitions per order = 4× the WAL volume. An append-only events table writes one row per transition. Realtime subscribes to `INSERT` events only — no noise from unrelated updates, no duplicate notifications to the client.

**Postgres RLS over application-layer filtering**

RLS policies run at the database level under the authenticated role. A misconfigured server action that forgets a tenant filter returns zero rows — it cannot return another tenant's data. Adding a new outlet requires zero code changes.

**`safe_capture_payment()` — atomic row-locked capture with amount validation**

The webhook calls a `SECURITY DEFINER` Postgres function that does `SELECT ... FOR UPDATE` on the order row, validates `p_amount_paise >= order.total_paise`, then transitions status and inserts `order_events` in the same transaction. This guarantees atomicity under thundering-herd webhook retries and closes the underpayment attack vector.

**`atomic_decrement_stock()` — row-locked stock decrement on checkout**

Before creating an order row, `placeOrder` calls a Postgres function that acquires `FOR UPDATE` locks on each menu item with finite stock. If any item has insufficient quantity, the function returns immediately — no partial decrements. Two concurrent checkouts for the last samosa: exactly one succeeds.

**Per-tenant cart bucket in localStorage**

A customer browsing two outlets keeps an independent cart for each. `ensureTenant()` saves the outgoing cart state and loads the incoming one. Switching outlets never clears or merges a cart.

---

## What broke in production

The migration history is the honest changelog. Three scars worth reading:

**The RLS policy that queried itself (`0007`)**
The membership policies on `tenant_memberships` checked membership by… selecting from `tenant_memberships`. Postgres detected the infinite recursion and errored on every authenticated query. Fix: move the membership checks into `SECURITY DEFINER` helper functions (`is_tenant_member/staff/admin`) that bypass RLS for the lookup itself.

**The global flag that stranded every order (`0024`)**
Payment behaviour used to switch on "do Razorpay keys exist in env?" — a global flag. The moment live keys were set, tenants collecting money by raw `upi://` deep link (which never touches Razorpay) had every order stuck at `pending_payment`, waiting for a webhook that could never come. Money left customers' accounts; the kitchen never saw the orders. Fix: payment behaviour became a per-tenant column, and "the money rail and the confirmation rail must be the same rail" became a design rule.

**Realtime sockets don't run your HTTP hooks (`0026`)**
Tenant context is set by a PostgREST pre-request hook reading an HTTP header — which WebSocket subscriptions never trigger. RLS dutifully returned zero rows to every realtime subscriber: boards looked alive in dev (polling fallback) and dead-silent in production. Fix: membership-based policies specifically for the realtime paths.

---

## Local setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- Supabase project (free tier works)
- Razorpay account (optional — simulator mode is available without keys)

### Steps

```bash
git clone https://github.com/thribhuvan003/trayy.git
cd trayy
pnpm install
cp .env.example .env.local
# Fill in .env.local with your Supabase credentials
pnpm typecheck   # verify zero TypeScript errors
pnpm dev
```

Open [http://localhost:3000/c/aditya/menu](http://localhost:3000/c/aditya/menu).

### Environment variables

**Required:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side service role key |

**Optional — enables specific features:**

| Variable | Feature |
|----------|---------|
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET` | Live UPI payments |
| `NEXT_PUBLIC_RAZORPAY_LIVE=true` | Hides the dev simulate button in production |
| `RESEND_API_KEY` | Magic link email delivery |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Distributed rate limiting |
| `QSTASH_TOKEN` + signing keys | Order expiry + payment reconciliation crons |
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |
| `SENTRY_AUTH_TOKEN` | Source map uploads to Sentry |
| `DEFAULT_TENANT_SLUG` | Default outlet for subdomain-less local dev |

---

## Database setup

```bash
# Push all migrations to your Supabase project
supabase db push

# Or apply manually via Supabase SQL editor
# Run each file in supabase/migrations/ in order
```

---

## Deployment

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thribhuvan003/Tray&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY)

After deploying: push migrations to your Supabase project, configure environment variables, set up the Razorpay webhook.

### Adding a stall

No code changes required. Insert one row:

```sql
INSERT INTO tenants (slug, name, college_name, upi_vpa, order_mode)
VALUES ('mg-road-07', 'Stall No. 7', 'MG Road', 'stall07@upi', 'token_prepaid');
```

The portals are immediately live at `/c/north-block/menu`, `/c/north-block/kitchen`, and `/c/north-block/admin/dashboard`.

### Razorpay webhook

Register `https://your-domain/api/webhooks/razorpay` in the Razorpay dashboard.

Required events: `payment.captured`, `payment.authorized`, `payment.failed`.

### Uptime monitoring

`GET /api/health` returns `{"ok":true,"db":"ok"}` when healthy, `503` when the database is unreachable.

---

## License

MIT — see [LICENSE](./LICENSE).

---

<div align="center">

Built for India's street food stalls, tiffin counters, and campus messes &nbsp;·&nbsp; Works anywhere there is a queue and a counter

</div>
