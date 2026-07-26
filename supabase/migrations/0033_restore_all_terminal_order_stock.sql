-- Extend the inventory-restoration trigger after the terminal enum values from
-- 0032 are committed. This keeps fresh database resets and existing projects
-- idempotent while covering every pre-fulfilment terminal transition.

create or replace function public.restore_terminal_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.stock_released_at is null
     and old.status in ('pending_payment', 'placed', 'preparing', 'ready')
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
