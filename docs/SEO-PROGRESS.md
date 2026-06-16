# Tray — SEO Work Log (living document)

> Single source of truth for SEO/performance work + agent activity.
> Update this after every meaningful change so any new session (or person) has full context.
> Companion file: [`SEO-2026-CHECKLIST.md`](./SEO-2026-CHECKLIST.md) (the full strategy map).

- **Repo:** github.com/thribhuvan003/trayy  (local folder is named `Tray`)
- **Live:** https://trayy.vercel.app  (Vercel auto-deploys on push to `main`)
- **Commit identity rule:** ALWAYS `thribhuvan003 <thribhuvan003@gmail.com>`, **no Claude co-author trailer.**
- **Stack:** Next.js 15 (App Router), React 19, pnpm, Supabase, Sentry, framer-motion + GSAP + Lenis on the landing page. `force-dynamic` on root layout (multi-tenant via headers()).

---

## Current status (last updated: 2026-06-16)

| Area | Score / State |
|------|---------------|
| PageSpeed SEO | **100/100** ✅ |
| PageSpeed Best Practices | 92 |
| PageSpeed Accessibility | 96 (audit in progress to reach 100) |
| PageSpeed Performance (mobile) | **52 → fix shipped, awaiting re-test.** Was LCP 13.0s; fix deployed in commit `df4c71f`. |
| Google Search Console | Verified (HTML tag + file). Sitemap submitted. Awaiting first crawl/index. |

---

## Completed & shipped

### Commit `203a98f` — SEO foundation
- `src/app/robots.ts` — robots.txt; blocks /api, /auth, /admin, /kitchen, /menu, /orders, /pay, /track, /college-admin, /unauthorised, /c.
- `src/app/sitemap.ts` — 6 public URLs (/, /get-started, /signup, /login, /legal/privacy, /legal/terms).
- `src/app/opengraph-image.tsx` — dynamic 1200×630 OG image (next/og).
- `src/app/layout.tsx` — fixed `metadataBase` (was `localhost` fallback → now `https://trayy.vercel.app`), added canonical, full OpenGraph + Twitter card, keywords, `SoftwareApplication` JSON-LD, Google verification (env `GOOGLE_SITE_VERIFICATION` with hardcoded fallback token `bdXP...`).
- `public/google9a5f29565b8fac26.html` — GSC HTML-file verification.

### Commit `266416b` — AI/GEO layer
- `public/llms.txt` — AI-crawler map.
- `docs/SEO-2026-CHECKLIST.md` — full 2026 strategy checklist.

### Commit `df4c71f` — LCP fix (perf specialist + my review)
- **Root cause:** hero `<h1>` (LCP element) rendered `opacity:0` in SSR HTML via framer-motion `initial="hidden"`, AND re-hidden by `gsap.from(... opacity:0)` that only runs after gsap/lenis dynamic imports + intro event → ~13s on mobile.
- **Fix:** `src/app/globals.css` added `.tl-hero-rise` CSS keyframe entrance (no JS). `TrayHero.tsx` H1+subtitle converted from `motion.h1/p` to plain `<h1>/<p>` with CSS classes (paint on first frame). `landing-motion.tsx` removed `opacity:0` from hero `.tl-word` gsap.from. `layout.tsx` removed unused **Chewy** font (grep-confirmed zero refs).
- **Verified:** tsc clean, `pnpm build` exit 0.
- **Known caveat:** on SLOW connections, GSAP's `clipPath: inset(100%)` curtain still re-animates the headline after it's visible (cosmetic flicker only; LCP metric unaffected). 2-line removal if undesired.

---

## Agent activity log
- **vercel:performance-optimizer** (done) — implemented the LCP fix above. Could not run `pnpm build` (sandbox perms); I ran it after = exit 0.
- **agent-skills:code-reviewer** (BLOCKED) — launched to review the LCP diff but returned 0 tokens due to session limit. Not re-run; I reviewed the diff manually instead. agentId `a29875a9ac30a7bd2` (can be resumed via SendMessage if desired).
- **general-purpose / accessibility audit** (RUNNING as of last update) — read-only audit of landing-page contrast to find what's needed for a11y 100. agentId `aa53b9454559a7322`.

---

## Pending — NO user facts needed (can do anytime)
- [ ] Re-run PageSpeed mobile to confirm LCP dropped (user action, or via chrome-devtools lighthouse MCP).
- [ ] Accessibility contrast fixes → 100 (pending audit results; some may alter muted-text design — needs owner sign-off).
- [ ] Optional: remove GSAP hero clip-path re-animate (slow-connection flicker).
- [ ] Consider scoping `force-dynamic` off the public landing page (perf) — RISKY, tied to tenant headers(). Separate careful task.

## Pending — NEEDS USER FACTS (do not fabricate)
- [ ] **Super FAQ page + FAQPage JSON-LD** — need: Is Tray free / pricing model? Support contact/email? Is there an API? Who is it for?
- [ ] **`/pricing` page** — need real plan tiers + prices.
- [ ] **`/features` page** — need confirmed feature list.
- [ ] **`/about` page (E-E-A-T)** — need founder/team info.

## Off-site (owner's job, code can't do) — see checklist §5-§10
Google Business Profile, Product Hunt/G2/Capterra, Reddit presence, YouTube, email list, backlinks/Source-of-Sources, genuine reviews.

---

## How to resume in a new session
1. Read this file + `SEO-2026-CHECKLIST.md`.
2. Check `git log` for commits past `df4c71f`.
3. Check for completed background agents (accessibility audit `aa53b9454559a7322`).
4. Ask the owner for the "NEEDS USER FACTS" items before building FAQ/money pages.
5. Commit as `thribhuvan003`, no co-author. Push to `main` = auto-deploy.
