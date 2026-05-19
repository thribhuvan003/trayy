# Tray demo & landing spec (F1 bar)

**Read before any demo/landing edit.** Kitchen: `public/demo/kitchen.html` is **frozen**.

## Success bar (user-locked)

| # | Requirement |
|---|-------------|
| C | Landing pitch-ready **and** student demo = **real laptop web app** (sidebar + cart), not phone chrome |
| — | Pre-Monsoon Dusk (Next landing), Midnight Sky (student static demo) |
| — | No single-college branding on product landing |
| — | Every control in demos **works**; no dead buttons, no broken HTML |

## Council pick (2026-05-19)

**Primary:** KFC/QSR **service mode** — **Takeaway** vs **Dine in** (optional table), drives copy on pay → track → OTP.

**Secondary (same ship):**

| Idea | Where | Solves |
|------|--------|--------|
| Pickup window ETA | Student tracking | “How long until I walk?” not vague “preparing” |
| Veg lane | Student menu | One-tap veg-only browse (not just dots) |
| Line leave | Landing | “Where are you now?” sets expectation (class / queue / counter) |

## Surfaces

| File | Owner lane | Notes |
|------|------------|--------|
| `src/components/landing/landing-page.tsx` | landing-next | GSAP + portals; student iframe = **desktop** label |
| `src/components/landing/landing-motion.tsx` | landing-motion | ScrollTrigger; respect `prefers-reduced-motion` |
| `public/demo/index.html` | demo-index | Static marketing; align copy with Next where possible |
| `public/demo/student.html` | demo-student | Full order flow prototype |
| `public/demo/admin.html` | demo-admin | Tabs, export, modals |
| `public/demo/kitchen.html` | **nobody** | Do not edit |

## Student demo — required flow

1. **Service mode** — Takeaway \| Dine in; table field when dine-in.
2. **Menu** — categories, search, veg lane, add/qty, desktop cart sidebar + mobile bar.
3. **Pay** — timer, order ref, “I've paid”.
4. **Track** — steps + progress + pickup ribbon ETA.
5. **OTP** — 4-digit code; mode tag visible.
6. **Reset** — topbar reset clears cart + mode.

## Micro-interactions checklist

- [ ] Cart count bump on add
- [ ] Checkout disabled when cart empty
- [ ] Service mode cards show active state
- [ ] Veg lane filters menu (not only badges)
- [ ] Pickup ribbon visible on tracking
- [ ] Back to menu from payment works
- [ ] Confirm reset when order in progress

## Landing — required

- [ ] Student portal device tag: laptop / sidebar (not “Mobile 480×”)
- [ ] Hero + ticker generic campus copy
- [ ] Line leave or equivalent “where are you” strip (interactive)
- [ ] Portal iframes load; open links work
- [ ] Reduced motion: no required motion to understand page

## QA lanes (F1)

| Lane | Focus |
|------|--------|
| `qa-amazon-ms` | P0/P1 click paths, a11y, focus, keyboard |
| `qa-micro` | Hover, active, disabled, empty states |
| `senior-dev-review` | TS/React landing only |
| `build-verify` | `npm run typecheck` + `npm run build` |

Log findings in `docs/PARALLEL-WORK.md` with **P0** first.
