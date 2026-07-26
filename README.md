# Tray

Tray is a multi-tenant ordering system for food stalls, tiffin centres, and canteens. Customers order from a live menu, kitchen staff move tickets through preparation, and operators manage service, stock, staff, and reports.

Live: [trayy.vercel.app](https://trayy.vercel.app)

## Try the product

The demos use local browser storage and do not require an account.

| Portal | Demo |
| --- | --- |
| Customer ordering | [trayy.vercel.app/demo/student](https://trayy.vercel.app/demo/student) |
| Kitchen board | [trayy.vercel.app/demo/kitchen](https://trayy.vercel.app/demo/kitchen) |
| Operator dashboard | [trayy.vercel.app/demo/admin](https://trayy.vercel.app/demo/admin) |

Previously shared links such as `/c/aditya/menu`, `/c/aditya/kitchen`, and `/c/aditya/admin/dashboard` redirect to the matching demos.

## Product flow

- Customers browse an open outlet, add available items, place an order, pay, track its status, and present a pickup OTP.
- Kitchen staff accept tickets, mark them ready, verify pickup, handle walk-ins, and announce specials.
- Operators control service availability, menu stock, staff access, orders, refunds, exports, and reporting.
- Institution administrators can view and manage the outlets in their institution.

Production data is isolated by tenant in PostgreSQL with row-level security. Supabase Realtime updates active portals, with a polling fallback when a realtime connection is unavailable.

## Payments and inventory

Razorpay checkout is verified on the server and webhook handling is idempotent. Direct UPI is also supported for tenants that choose manual confirmation.

Inventory reservations and releases are performed in database functions. Apply every migration in `supabase/migrations/` in filename order before deploying the matching application code. This release requires `0031_atomic_payment_and_inventory.sql`.

Direct UPI transfers cannot be automatically reversed by the application. A rejected or cancelled direct-UPI order is recorded as requiring a manual merchant refund.

## Stack

- Next.js 15 and React 19
- TypeScript
- Supabase Auth, PostgreSQL, Storage, and Realtime
- Razorpay
- Vitest and Playwright
- Vercel

## Local setup

Requirements: Node.js 22 and pnpm 10 (the versions used in CI).

```bash
git clone https://github.com/thribhuvan003/trayy.git
cd trayy
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

The Supabase project MCP definition is stored in `.mcp.json`. Authentication remains local to each developer and is never committed.

## Environment

Copy `.env.example` and provide the values required by the environment:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
NEXT_PUBLIC_RAZORPAY_LIVE

APP_URL
DEFAULT_TENANT_SLUG
```

Resend and QStash variables are optional. To enable email, configure both
`RESEND_API_KEY` and `RESEND_FROM_EMAIL` with a sender verified in Resend.
Upstash Redis is optional for local
development but both Upstash variables are required in production so rate
limits remain effective across serverless instances. Their purpose is
documented in `.env.example`.

Never expose the Supabase service-role key or payment secrets to browser code.

## Database

Migrations are forward-only and live in `supabase/migrations`.

```bash
supabase link --project-ref mepowrsrbjddaqfvzvtc
supabase db push
```

Use a separate Supabase branch or project for local and preview testing. Do not run production migrations from an unauthenticated agent session.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --prod
pnpm build
pnpm demo:verify
```

With the built application running on port 3000:

```bash
pnpm demo:verify:e2e
pnpm landing:audit
```

`DEMO_BASE` and `LANDING_BASE` can point the browser checks at another deployment.
The scripts also accept `--base=https://example.com`.

## Repository

```text
.
├── docs/                  architecture decisions and implementation specs
├── public/                public verification and discovery assets
├── scripts/               browser and source verification
├── src/
│   ├── __tests__/         unit and integration tests
│   ├── app/               routes, actions, API handlers, and demos
│   ├── components/        portal and shared UI
│   └── lib/               auth, payments, data, and utilities
├── supabase/
│   └── migrations/        ordered database changes
└── package.json           scripts and dependency manifest
```

See `CONTRIBUTING.md` for the development workflow and `SECURITY.md` for private vulnerability reporting.

## License

MIT
