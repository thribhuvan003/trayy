# Tray Street Edition — Master Plan

> Pivot: campus canteens → street food stalls / tiffin centers near PGs & hostels.
> Core thesis: zero-commission direct ordering; the stall owner never touches a screen while cooking.
> Drafted 2026-07-10 from 4-agent codebase analysis + local run + 3-persona review panel. Panel verdicts folded in same day — plan complete.
> Rule for all work: surgical diffs, no drive-by refactors, every change traces to this plan.

## Product decisions (locked)

1. **Model A — token flow (core)**: customer scans QR → orders → pays UPI → gets token (`short_code`, e.g. T-2422) + PAID screen → shows phone at counter. Auto-accepted; no kitchen interaction; no status progression.
2. **Model B — audio announcer (add-on)**: an old phone at the counter speaks each new paid order aloud (Web Speech API). For stalls taking pre-orders from PGs.
3. **Kitchen board becomes optional** — a per-tenant mode, not a deletion. Canteens keep the full flow; stalls never see it.
4. **Rebrand campus → street**: relabel UI + metadata only. **Freeze the schema** — no table/enum/URL renames.
5. Everything ships behind per-tenant flags; existing campus tenants (aditya) are untouched.

## What the codebase analysis established

- **Auto-accept already exists.** Razorpay webhook (`safe_capture_payment`), UPI SMS auto-verify (`safe_capture_upi_credit`, migration 0027), and reconcile cron all flip paid orders to `placed` with zero human action. Model A does NOT touch payment code.
- **The token already exists.** `orders.short_code` (T-24xx, race-safe per-tenant sequence) is already shown on the pay-success and track screens.
- **The "confirmed" state already exists.** `placed` is the universal paid state. Model A adds no enum value.
- **Walk-in orders** (`createWalkInOrder`) are the existing template for "insert directly at placed, payment captured".
- **Realtime already delivers the signal** Model B needs: `order_events` INSERT with payload `to='placed'`, published + RLS-cleared (migrations 0011/0026).
- **No feature-flag system exists** — per-tenant behavior = bespoke columns (`payment_mode` is the pattern to copy, migration 0024).
- **Deployed `resolve_tenant` RPC has drifted from the repo** (applied via MCP, superset of setup.sql:393). Any new tenant column MUST be added to that RPC or it never reaches the app.
- **Admin dashboard already computes** today's revenue / orders / top items client-side; sold-out toggle action already exists (`setMenuItemStock`).
- **Rebrand is ~90% copy+metadata**; `student`/`canteen`/`college` in schema, roles, and route groups are invisible to users and stay.

## Workstream 1 — Tenant tier + feature resolver (foundation, everything depends on this)

1. Migration `0028_tenant_tier.sql` (copy pattern of `0024_payment_mode.sql`):
   - `tenants.tier text not null default 'canteen' check (tier in ('canteen','street_stall'))`
   - `tenants.order_mode text not null default 'kitchen_flow' check (order_mode in ('kitchen_flow','token_prepaid'))`
   - Mirror in `supabase/setup.sql`.
2. Update the **deployed** `resolve_tenant` RPC (add new columns to return set) — and commit the current deployed version back into the repo to fix the drift.
3. Plumb through: `src/lib/db/types.ts` (tenants Row), `ResolvedTenant` + mapping in `src/lib/tenant.ts:9-23,124-137`, middleware `getMiddlewareTenant` (`middleware.ts:30-33`).
4. New `src/lib/features.ts`: `resolveFeatures(tenant)` → `{ hasKitchenQueue, hasOrderStatuses, ... }` merging tier defaults. All conditional rendering goes through this — never raw column reads.
5. Admin settings: expose `order_mode` toggle (`(admin)/admin/settings/page.tsx` + `_actions.ts:336-341`, reuse the `payment_mode` spread pattern).

Verify: existing tenant behaves identically (default values); new columns visible via `resolveTenant()` in a test tenant.

## Workstream 2 — Model A: token_prepaid flow

1. `src/app/(student)/track/[orderId]/page.tsx`: fetch `order_mode`, pass to TrackPanel.
2. `src/components/portal-student/track-panel.tsx`: token mode branch —
   - big token card = existing pickup-code markup (`:244-283`) fed `short_code`
   - PAID badge; skip the 4-step stepper (`:313-346`)
   - add `placed` to terminal set (`:104`) in token mode only → poll stops.
3. `pay-panel.tsx`: wording tweak for token mode ("Show this at the counter").
4. Kitchen queue filter (`(kitchen)/kitchen/page.tsx:60`, `board.tsx:348`): token-mode orders don't enter Incoming; optional passive "served today" list.
5. Cron sweep (`api/cron/expire-orders/route.ts`): daily auto-close of token-mode `placed` orders (reuse existing batch + order_events pattern).
6. Big sold-out toggles: stall admin menu view leads with in/out buttons (action `setMenuItemStock` exists; UI enlargement only).

Verify: E2E on a test tenant — order → pay (simulate) → track shows token + PAID, no stepper, kitchen board stays empty, dashboard counts the order.

## Workstream 3 — Model B: /announce audio page

1. New page `(kitchen)/kitchen/announce/page.tsx` (mirrors `kitchen/page.tsx` auth/tenant context; zero routing/middleware changes — kitchen role guard already covers it).
2. New client component `portal-kitchen/announcer.tsx`:
   - realtime: copy `board.tsx:423-474` subscription (`order_events` INSERT, `tenant_id` filter), react to `to==='placed'`
   - fetch `short_code`/items for the order, speak via `speechSynthesis` (net-new, zero deps)
   - one-tap "Start announcing" unlock (browser gesture requirement) + `navigator.wakeLock.request('screen')`
   - visual fallback: giant last-3-orders list (audio can be missed).
3. Optional later: WhatsApp ping server-side beside `notifyAdminNewOrder` (`(student)/_actions.ts:791`, razorpay webhook `:161`). SMS scaffolding exists but needs Twilio creds — defer.

Verify: two browsers — place order in one, announcer speaks in the other; screen stays awake.

## Workstream 4 — Street rebrand (copy + metadata only)

Tier 1 (centralized, do first): `src/app/layout.tsx` metadata + JSON-LD, `opengraph-image.tsx`, `public/llms.txt`, README tagline/overview, repo description + topics on GitHub.
Tier 2 (mechanical, scattered): landing 7 files (~51 hits), demo pages 9 files (~179 hits), get-started wizard, login role tabs, portal labels, legal pages. Introduce `src/lib/labels.ts` so the next rebrand is one file.
Terminology: student→customer · canteen→stall/outlet · college→area (UI only) · campus→street/neighbourhood. KEEP: ledger/token/register/counter metaphor (translates perfectly), `/c/` URLs, all schema/enum/role names, `/college*` paths (alias later if ever needed).
Do NOT: rename tables, enums, roles, route folders, or URLs.

## Workstream 5 — UI/UX fixes + standout changes (from local run + persona panel)

Defects found in local run:
- [P0-investigate] Student menu at 390px mobile viewport hard-hung the browser tab (dev mode). Reproduce, profile, fix — customers are 100% mobile.
- Stuck "RECONNECTING…" pill on student menu (localhost realtime — verify against prod).
- Cart panel: price truncation "₹2…" + horizontal scrollbar (overflow bug at 1440px).
- Emoji (🥬🍗) as food-image placeholders — reads AI-generic; needs proper placeholder art.
- Red "1 Issue" toast bottom-left on menu (investigate source; dev-only?).

### Panel: senior engineer verdict → README/engineering-story changes

Score 7.5/10 (leans hand-crafted). Migration history (RLS recursion fix 0007, webhook DLQ 0012, realtime RLS fix 0026) and failure-mode test names read authentic — "nobody fakes a recursion fix."

1. **Kill the fake testimonial** ("Kitchen Supervisor — Campus Canteen", unattributed) — the single loudest AI tell. Replace only with a real, named quote from the pilot stall.
2. **Sync the stale README** — it lists migrations only through 0016; repo has 0027. Reads as "AI wrote the README once." Also surface the existing CI workflow as a badge + test-suite count.
3. **Replace asserted numbers with measured ones** — "&lt;1s" claims → k6/artillery run: orders/sec sustained, p95 webhook→board latency, idempotency ledger under 100 duplicate deliveries.
4. **One architecture diagram** (tenant resolution → RLS → webhook → order_events fan-out).
5. **Fix demo data inconsistency**: admin demo shows ₹74,860/746 orders in one place, ₹14,260/312 in the KPI row of the same view.
6. Interview stories to protect (don't refactor away): concurrent last-samosa (`atomic_decrement_stock` + test), webhook-delivered-5-times arc (0012→0016→0021), append-only `order_events` WAL reasoning.

### Panel: design lead verdict → visual fixes ranked

Landing 8.5/10 hand-crafted; **real student menu is the weak surface — the repo ships two design systems** (`editorial-minimalist` landing vs `neobrutalist-bento` app) and the gap breaks the "promise = product" story.

1. **Rebuild the student menu in the ledger design system** — kill emoji-as-food-icons, one type family set, dense ledger rows (name · ₹ · +) that scan 3× faster on a cheap Android and survive sun glare (ink-on-cream beats white theme outdoors). Fold into WS2/WS4.
2. **Merge the two colliding mobile floating pills** ("Browse Menu" + cart) into one sticky "₹X · Place order →" bar, cart-first.
3. **Food first on mobile**: menu list is row 1; the "How are you eating today?" mode picker demotes to checkout (stalls are takeaway-default anyway).
4. **Delete the duplicate search input** (nav + in-page = two on one screen).
5. **Street-ify while keeping the ledger**: the metaphor fits stalls *better* than campus (real artifact = the stall's *hisaab* notebook + torn token). Torn-edge tokens, hand-painted-signboard accents ("₹70/-"), landmark-based stall identity ("near PG gate no. 2"), drop "REG. NO. TRY/2026" collegiate framing. Keep: red margin, mono timestamps, stamps, cash book.

### Panel: recruiter verdict → proof points + packaging

Verdict: borderline-forward, decided by README engineering depth — almost killed by fabricated-looking numbers.

1. **Fix the credibility contradiction first**: landing says demos are "live, connected"; demo banner says "STATIC DATA · EVERYTHING STAYS IN YOUR BROWSER". Relabel demos "interactive walkthrough" — never "live" next to fabricated numbers.
2. **Proof above architecture**: deployment claim in README's first 3 lines + link to a public `/live` metrics page (real DB, boring jagged numbers like ₹3,412 — not ₹54.8k) + one phone-quality photo of the stall QR. Polish smells fake here; jagged reality converts.
3. **Delete the hospital/stadium/airport "scales beyond campuses" table** — classic AI-inflation tell.
4. **Add a "What broke in production" README section** (RLS recursion, webhook failure, WiFi drop) — scars are the strongest anti-AI-slop signal available.
5. Resume bullet to build toward: *"Built and deployed Tray, a multi-tenant UPI food-ordering platform (Next.js, Postgres RLS, Razorpay webhooks) processing live orders at N street stalls — idempotent payment capture, realtime order fan-out, zero commission."* Wins vs IIT/GSoC pool on end-to-end product ownership + **verifiable production traffic** (can't be counterfeited, interrogable for 45 minutes); loses on pedigree — so the one flip is real, verifiable users (WS6).

## Workstream 6 — Real users (the actual goal)

The pivot only pays off with a live pilot: 1–3 stalls near a PG cluster, free, self-onboarded by you.
Product must-haves for pilot day: QR poster per stall (exists: share-qr), token flow (WS2), owner's daily-money admin view, sold-out toggles, UPI direct (exists — `payment_mode='direct_upi'`, optional SMS auto-verify via MacroDroid, migration 0027).
Success metric for the resume: "N stalls live, M orders/week, ₹X settled, zero commission."

## Execution order & parallelism

WS1 first (foundation, single worktree, one PR). Then WS2, WS3, WS4 are independent → parallel worktrees/agents. WS5 fixes fold into WS2/WS4 files where they overlap (surgical: one concern per PR). WS6 is field work, not code.
Commits: `thribhuvan003 <thribhuvan003@gmail.com>`, no AI co-author trailers. Every PR: tests pass (`vitest`), lint clean, diff traces to this plan.
