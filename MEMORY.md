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

## Next
- Hard refresh localhost:3000 — check demos cards, ledger lines, close CTA contrast.
- Optional commit when user approves.
