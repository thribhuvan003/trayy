-- Restore finite inventory exactly once when an order ends before fulfilment.
-- Checkout reserves stock while payment is pending; without this trigger,
-- abandoned, failed, cancelled, or rejected orders permanently consume stock.

alter table public.orders
  add column if not exists stock_released_at timestamptz;

create or replace function public.restore_terminal_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.stock_released_at is null
     and old.status in ('pending_payment', 'placed')
     and new.status in (
       'expired',
       'rejected',
       'cancelled_by_kitchen',
       'payment_failed',
       'refunded'
     )
     and new.status is distinct from old.status
  then
    update public.menu_items as menu
    set
      stock_qty = menu.stock_qty + reserved.qty,
      in_stock = case
        when menu.status = 'live' then true
        else menu.in_stock
      end,
      updated_at = now()
    from (
      select items.menu_item_id, sum(items.qty)::int as qty
      from public.order_items as items
      where items.order_id = new.id
        and items.tenant_id = new.tenant_id
        and items.menu_item_id is not null
      group by items.menu_item_id
    ) as reserved
    where menu.id = reserved.menu_item_id
      and menu.tenant_id = new.tenant_id
      and menu.stock_qty is not null;

    new.stock_released_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists restore_terminal_order_stock on public.orders;
create trigger restore_terminal_order_stock
before update of status on public.orders
for each row
execute function public.restore_terminal_order_stock();

comment on column public.orders.stock_released_at is
  'Set atomically when reserved finite inventory is returned after a pre-fulfilment terminal transition.';
