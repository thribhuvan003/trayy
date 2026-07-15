# TrayY session memory

## Decisions

### Landing section worlds (2026-07-15)
- **What:** Each landing band is a distinct visual world (font + color + layout + India-first Hinglish copy).
- **Why:** User asked for section-to-section difference, free Google fonts, India hook, full creative polish.
- **Fonts (from root layout + Mukta on landing):**
  - Hero: Instrument Serif
  - Demos: Unbounded (saffron bazaar band)
  - Walkthrough: Bebas (night cinema)
  - Ledger: Newsreader italic (bahi-khata lines)
  - Carbon: Space Grotesk (blue office triplicate)
  - Trust: Clash (mehendi night)
  - Quote: Cormorant (dark editorial)
  - Ticker: Barlow Condensed
  - Body: Mukta
- **Rejected:** Single beige template + 3 fonts for whole page; pure English SaaS voice; loading duplicate Instrument/JetBrains when root already has them.

### Canonical repo
- Work only on `D:\trayy` = origin/main base. No force-push.

## In progress
- Landing redesign uncommitted on main.
- Visual hard-refresh QA screenshots flaky (font load timeouts in Playwright).

### Anti-AI pass (2026-07-15, round 2)
- **Killed:** dark Cormorant italic “closing line” + specimen board; giant Bebas TRAY watermark; Instrument Serif short-line Hinglish hero with strike word; soft beige radial glow; forced Hinglish everywhere.
- **Hero:** Clash bold stacked utility lines + steel plate label + 1-2-3 steps + thermal receipt (Space Mono), not card token.
- **Close band:** white tile, ₹0 mark, product facts list, red neo-brutal CTA — no quote block.
- **Footer:** black utility bar `tray / street edition`, no watermark.
- **Research signal:** 2026 anti-AI / human-made / neo-brutal differentiation (Figma neo-brutalism, “soulless plastic” AI sites).

### Landing visibility polish (2026-07-15)
- **What:** Coupons/Ledger/Quote copy + contrast only. Demos headings `#000`, body `#3a342c`; coupon cards solid white + 2px border; close band pure white + white CTA text on red; `.lp-reveal` stays `opacity: 1 !important`.
- **Why:** Readability on phones; kill soft rgba body text and cream-on-cream wash.
- **Rejected:** Touching CarbonSection (owned by another agent); new features; reintroducing Hinglish in demos.

### Kitchen demo phone-first (2026-07-15)
- **What:** `/demo/kitchen` rewritten phone-first: sticky header (brand/clock/sound), segment tabs New|Cooking|Serve, huge START/READY/SERVE CTAs, canteen+special in overflow sheet, collected as history strip. Desktop = 3 columns (no 4th collected lane). Web Audio chime on new inbox orders.
- **Why:** Product story — phone + speaker is enough for the cook; no multi-lane scroll on ~390 width.
- **Rejected:** Keeping 4-column desktop with collected as primary lane; "Start prep"/"Mark ready"/"Hand over" labels.
- **Files:** `src/app/demo/kitchen/kitchen-demo.tsx`, `kitchen.css` only. Store/inbox APIs unchanged.

### Kitchen portal phone-first live board (2026-07-15)
- **What:** Production kitchen board is phone-first: segment tabs New|Cooking|Serve; full-width tickets; verbs START → READY → SERVE (OTP); speaker control first-class + persistent pref; new order ding jumps to New; desktop 3-col (Collected → History only); specials/walk-in demoted to ⋯ tools on phone; footer hidden on phone.
- **Why:** Differentiator vs shouting canteens — phone + speaker is enough. Backend status machine + Realtime unchanged.
- **Rejected:** Multi-counter stations; 4-col horizontal Kanban on phone; auto-skip START; rewriting actions/Realtime.
- **Files:** `ticket-card.tsx` (new), `order-column.tsx`, `board.tsx`, `otp-verify-dialog.tsx`, `(kitchen)/layout.tsx`.

### Admin portal hisab board (2026-07-15)
- **What:** Admin phone-first “aaj ka hisaab”: shell nav Today/Orders/Menu/QR/More; dashboard hero ₹ + Open/Pause/Close + kitchen pipeline; charts demoted on phone; settings regrouped Pay vs Service; demo admin aligned.
- **Why:** Indian stall owner cares about today money + open/close first, not SaaS charts.
- **Rejected:** New payment stack; college-admin redesign; full Hindi UI; admin as second KDS.
- **Files:** `shell.tsx`, `dashboard-view.tsx`, `service-controls.tsx` (new), `dashboard/page.tsx`, `settings/page.tsx`, `_actions.ts` revalidate, demo admin.

### Admin demo — aaj ka hisaab phone (2026-07-15)
- **What:** `/demo/admin` only: tabs Today | Menu | Staff | Settings; Today hero huge ₹ + orders + Open/Pause mock + New/Cooking/Serve pipeline; live inbox orders kept; menu sold-out/price stay; desktop = 480px phone column.
- **Why:** Match product story (stall owner phone hisaab) like kitchen demo rewrite.
- **Rejected:** Wide cash-book ledger; OVERVIEW/PEOPLE/AUDIT ALL-CAPS; multi-col tables as primary UI.
- **Files:** `src/app/demo/admin/admin-demo.tsx`, `admin.css` only.

### Product DNA UI unify (2026-07-15)
- **What:** Shared brand DNA: paper/ink/tomato signal/money green; type Newsreader + Jakarta + JetBrains across student/kitchen/admin. Student ocean→tomato. Admin light = warm paper ledger. Login 52px CTAs + tomato mark.
- **Why:** Zomato-grade cohesion — one product, not three skins.
- **Rejected:** Blue student SaaS; neon chartreuse admin on light; Fraunces-only admin display.
- **Files:** `globals.css`, login, smart-login-form, admin shell, demo admin.css.

## Next
- Multi-agent UI roast after push.

