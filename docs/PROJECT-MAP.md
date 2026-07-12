# Tray — Project Map (read this FIRST every session)

The one place that answers "which folder, which file, where are the keys." If anything
here disagrees with reality, reality wins — re-verify and fix this file.

## 1. The canonical folder

**`D:\trayy`** is the ONE working clone. Branch `main`, pushed to
`github.com/thribhuvan003/trayy`. Do all work here.

Other copies that exist on disk — DO NOT WORK IN THESE:
- `C:\Users\ntena\Downloads\trayy` — STALE old clone (months behind). Ignore or delete.
- `D:\trayy-ws3`, `D:\trayy-ws4` — leftover git-worktree dirs from parallel work.
  Their branches are merged into main and deleted. Safe to delete the folders.

Live site: https://trayy.vercel.app (auto-deploys on push to main).

## 2. Commit identity (never varies)

```
git config user.name  "thribhuvan003"
git config user.email "thribhuvan003@gmail.com"
```
NO AI co-author trailers, ever. Already set in D:\trayy.

## 3. The "duplicate menu files" — they are NOT duplicates

`menu` appears in several paths because there are four distinct surfaces. Each has one
real file:

| Surface | File | What it is |
|---|---|---|
| Customer menu ROUTE | `src/app/(student)/menu/page.tsx` | Server component rendered at `/c/<slug>/menu` |
| Customer menu UI | `src/components/portal-student/menu-board.tsx` | The actual client menu (this is the one WS5 redesigns) |
| One food card | `src/components/portal-student/menu-item-card.tsx` | Single item card used by menu-board |
| Realtime stock | `src/components/portal-student/menu-live-sync.tsx` | Live sold-out sync on the customer menu |
| Admin menu mgmt | `src/components/portal-admin/menu-dashboard.tsx` + `menu-table.tsx` | Owner adds/edits items, sold-out toggle |
| Marketing DEMO | `src/app/demo/student/student-demo.tsx` | Static self-playing demo (not the real app) |

Route groups in `src/app/`: `(student)` = customer, `(admin)` = owner, `(kitchen)` =
kitchen board + announcer, `(public)` = landing/login/legal. Parentheses = the folder
name is NOT in the URL.

## 4. Keys / secrets

- Real secrets live in `D:\trayy\.env.local` — **gitignored, never committed** (verified).
- `.env.example` lists the *names* the app needs (no values).
- Production secrets live in Vercel → Project Settings → Environment Variables.
- Full env-var list and what each unlocks: see README "Environment variables".
- Supabase project ref: `mepowrsrbjddaqfvzvtc` (the trayy DB; NOT the `unhold` project).

## 5. Database / migration state (as of 2026-07-11)

- Migrations live in `supabase/migrations/` (0001 … 0028).
- **LESSON: repo migrations have drifted from prod before.** 0027 was missing in prod,
  which silently broke checkout. ALWAYS diff `information_schema` vs the migration files
  before assuming prod matches the repo. Supabase MCP is authed for this project.
- Applied to prod through 0028 (tier + order_mode) and 0027 (UPI auto-verify) as of
  this date. Payment capture, token flow, and idempotency verified live.

## 6. Per-tenant behaviour switches (on `tenants` table)

- `order_mode`: `kitchen_flow` (default, full board) | `token_prepaid` (stall: paid ⇒
  token, no kitchen). Set in Admin → Settings → Order Flow.
- `tier`: `canteen` (default) | `street_stall`.
- `payment_mode`: `direct_upi` (default, money → stall's UPI) | `razorpay` (gateway).
- Test tenant for token mode: `/c/demo-stall` (needs menu items to demo visually).

## 7. Verify before claiming done

`npx tsc --noEmit` · `npx vitest run` (73 tests green) · `npx eslint .` — run directly
(pnpm's wrapper can crash here). PowerShell 5.1 is broken on this machine; use the Bash
tool or `D:\tools\pwsh\pwsh.exe`.
