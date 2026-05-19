-- Tray — Realtime publication: subscribe to order_events (append-only)
-- and menu_items (for instant stock-out grey-out on student menu).
--
-- ⚠️ We do NOT set REPLICA IDENTITY FULL on orders. order_events is the
-- append-only signal for status changes — clients subscribe to it. This
-- avoids WAL write amplification on the orders table during lunch rush.

-- order_events is append-only, so REPLICA IDENTITY DEFAULT (PK only) is fine.
do $$ begin
  alter publication supabase_realtime add table public.order_events;
exception when duplicate_object then null; end $$;

-- menu_items needs FULL so the in_stock filter survives row updates.
alter table public.menu_items replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.menu_items;
exception when duplicate_object then null; end $$;
