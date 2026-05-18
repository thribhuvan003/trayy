<div align="center">

<br/>

# Tray

### Skip the queue. Order from your phone.

A full-stack canteen ordering system built for college campuses.  
Students order and pay before they reach the counter. The kitchen sees everything live. The admin tracks every rupee.

<br/>

[![CI](https://github.com/thribhuvan003/Tray/actions/workflows/ci.yml/badge.svg)](https://github.com/thribhuvan003/Tray/actions/workflows/ci.yml)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Razorpay](https://img.shields.io/badge/Razorpay-UPI-0C2451?logo=razorpay&logoColor=white)](https://razorpay.com)

<br/>

</div>

---

## The problem

College canteens are stuck in 2005. Students stand in line for 10–15 minutes, pay with printed tokens, and wait around hoping their name gets called. The kitchen has no visibility into what's coming. The admin has no idea what sold, what didn't, or where the money went.

**Tray fixes all of this.**

---

## Three portals, one system

Everything runs from the same codebase. Each portal has its own design, its own role, and talks to the same live database.

### 📱 Student App
Browse today's menu, add to cart, pay via UPI QR code, and get a **4-digit OTP** to collect your order at the counter. Live status updates — order placed → preparing → ready.

### 🍳 Kitchen View
A real-time order board showing every incoming ticket with prep timers and status lanes (Incoming → Preparing → Ready → Collected). OTP verification on every handover. Push a daily special and it lands on every student's phone in under 300ms.

### 📊 Admin Dashboard
Revenue charts, peak-hour heatmaps, top-selling items, a live activity feed, and full order history — all in one screen. Every event from every portal, in real time.

---

## Tech stack

| Layer | What we use |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 + TypeScript strict |
| **Styling** | Tailwind CSS v4 — three separate portal themes |
| **Database** | Supabase (Postgres) with Row Level Security — tenants are fully isolated |
| **Auth** | Supabase Auth + role-based membership (student / kitchen staff / admin) |
| **Realtime** | Supabase Realtime — orders update live across all tabs |
| **Payments** | Razorpay UPI — HMAC-verified webhooks, no card data stored |
| **State** | TanStack Query + Zustand (cart persisted per user) |
| **UI** | Radix UI · Framer Motion · Vaul · Sonner · Lucide Icons |
| **Infra** | Upstash (rate limiting) · Resend (email) · QStash (scheduled jobs) |
| **Deployment** | Vercel Edge — live at [trayy.vercel.app](https://trayy.vercel.app) |

---

## How an order works

```
Student orders  →  pays via UPI  →  kitchen gets ticket
      →  kitchen marks ready  →  student gets 4-digit OTP
            →  shows OTP at counter  →  staff verifies  →  done
```

If payment isn't captured in 15 minutes, the order auto-expires. If the kitchen rejects, a refund is triggered. Every state change is logged.

---

## Multi-tenant — one deployment, any college

One Vercel deployment serves multiple colleges at the same time. Each college gets its own subdomain (`aditya.tray.app`, `vit.tray.app`). The database isolates every row by tenant using Postgres RLS — students from one college never see another college's data.

---

## Run it locally

**Requirements:** Node 22 · pnpm 10 · a Supabase project

```bash
git clone https://github.com/thribhuvan003/Tray.git
cd Tray
pnpm install
cp .env.example .env.local   # add your Supabase + Razorpay keys
pnpm dev                     # → http://localhost:3000
```

For multi-tenant dev: `http://aditya.localhost:3000` or `http://localhost:3000/?tenant=aditya`

**Database setup:**

```bash
supabase db push
```

Migrations are in `supabase/migrations/`. Run once on a fresh Supabase project.

---

## Environment variables

**Required to build:**

| Variable | What it's for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public browser key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key |

**Optional** (app runs fine without these — features just skip gracefully):

| Variable | Feature |
|---|---|
| `RAZORPAY_KEY_ID` + `KEY_SECRET` + `WEBHOOK_SECRET` | UPI payments |
| `RESEND_API_KEY` | Transactional emails |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Rate limiting |
| `QSTASH_TOKEN` + signing keys | Scheduled jobs |

See [`.env.example`](./.env.example) for the full list.

---

## Project structure

```
src/
├── app/
│   ├── (public)/      landing, login, signup
│   ├── (student)/     menu, cart, payment, order tracking
│   ├── (kitchen)/     live order queue + OTP verify
│   ├── (admin)/       dashboard, menu manager, orders, analytics
│   └── api/           webhooks, CSV export routes
├── components/        portal UI + shared components
├── lib/               Supabase clients, auth, tenant logic
└── middleware.ts      subdomain → tenant resolution

supabase/
└── migrations/        Postgres schema + RLS policies
```

---

## Commands

```bash
pnpm dev          # start dev server
pnpm build        # production build
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
```

---

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a PR — it covers branch names, commit style, and the PR checklist.

Found a security issue? Use [`SECURITY.md`](./SECURITY.md) for responsible disclosure instead of opening a public issue.

---

<div align="center">

Built for college campuses &nbsp;·&nbsp; Made in India

</div>
