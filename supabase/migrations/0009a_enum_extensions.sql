-- Tray — Enum extensions (separate migration so each ALTER TYPE runs
-- in its own implicit transaction). IF NOT EXISTS makes it idempotent.

alter type public.member_role  add value if not exists 'college_admin';
alter type public.order_status add value if not exists 'cancelled_by_kitchen';
alter type public.order_status add value if not exists 'partially_ready';
alter type public.order_status add value if not exists 'refunded';
