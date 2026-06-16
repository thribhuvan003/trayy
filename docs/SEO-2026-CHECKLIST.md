# Tray — 2026 Search Everywhere Optimization Checklist

Maps the 2026 SEO/AEO/GEO strategy to Tray. Status legend:
- ✅ Done in code (live)
- 🟡 Buildable in code — needs facts/decisions from you first
- 🔴 Off-site / ongoing — not a code task, owner must do manually

---

## 1. Technical SEO foundation (the floor)
- ✅ Title, meta description, canonical (`src/app/layout.tsx`)
- ✅ Open Graph + Twitter card + auto OG image (`src/app/opengraph-image.tsx`)
- ✅ `robots.txt` (`src/app/robots.ts`)
- ✅ `sitemap.xml` (`src/app/sitemap.ts`)
- ✅ `SoftwareApplication` JSON-LD (`src/app/layout.tsx`)
- ✅ Google Search Console verification (meta tag + HTML file)
- ✅ `llms.txt` for AI crawlers (`public/llms.txt`)
- 🟡 **Core Web Vitals** — LCP is ~13s on mobile (target <2.5s). Likely the landing intro animation + 18 Google fonts. THIS IS THE BIGGEST OPEN TECHNICAL ITEM. Needs a focused performance pass.
- 🟡 H1/H2/H3 hierarchy audit on landing page

## 2. Money pages first (bottom-of-funnel)
- 🟡 `/pricing` — needs real plan tiers + prices from you
- 🟡 `/features` — needs confirmed feature list
- 🟡 `/about` — needs founder/team info for E-E-A-T "Experience" signal

## 3. Brand narrative (so AI cites you, not third parties)
- 🟡 **Super FAQ page + `FAQPage` schema** — needs real answers: Is Tray free? How is pricing structured? Is there an API? Who is it for? Support contact? Founder?

## 4. Topic clusters / content (informational funnel)
- 🟡 `/blog` scaffold — structure is buildable; articles need real human writing + original data
- 🔴 Seed topic + 100-topic map (e.g. "canteen ordering for colleges") — strategy/research work
- 🔴 Each article needs the "Human Layer": real data, screenshots, your experience

## 5. GEO / AI visibility
- ✅ `llms.txt` published
- ✅ Structured data for grounding
- 🔴 Track brand mentions across ChatGPT / Perplexity / Gemini (use an AI-visibility tracker)
- 🔴 Reddit presence (it is the #1 cited source for AI) — answer in campus/college/SaaS subreddits

## 6. Directories & legitimacy signals
- 🔴 Google Business Profile
- 🔴 SaaS directories (Product Hunt, G2, Capterra, SaaSHub, AlternativeTo)
- 🔴 Use "link intersect" to find where competitors are listed

## 7. Owned assets & funnels
- 🔴 YouTube: one "conversion asset" (product demo) + educational videos funneling to it
- 🔴 LinkedIn / X repurposed posts from the same topics

## 8. Email & retention
- 🟡 Email capture / lead magnet on site — needs an email provider (e.g. Resend/Mailchimp) + decision
- 🔴 Ongoing list building + sending

## 9. Link building & citations
- 🔴 Source of Sources (journalist queries) for authoritative backlinks
- 🔴 Sweat-equity partnerships with campus/food-tech creators
- 🔴 Earn placement in "best canteen/food ordering software" roundups

## 10. Reviews (E-E-A-T trust)
- 🔴 Collect genuine user reviews (never fake/incentivized — Google's Gemini purges those)

---

## Immediate priority order
1. **Fix LCP / Core Web Vitals** (item 1) — affects ranking + is already failing.
2. **Super FAQ + money pages** (items 2, 3) — needs your facts, then I build.
3. **Off-site: Google Business Profile + Product Hunt/G2 + Reddit** (items 5, 6) — your job, highest off-site leverage.
