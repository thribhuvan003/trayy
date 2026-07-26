-- Add the remaining production roles and order states in their own migration.
-- PostgreSQL requires newly-added enum values to be committed before later
-- migrations reference them.

alter type public.member_role add value if not exists 'college_admin';
alter type public.order_status add value if not exists 'cancelled_by_kitchen';
alter type public.order_status add value if not exists 'partially_ready';
alter type public.order_status add value if not exists 'refunded';
