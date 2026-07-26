import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8");

describe("production migration integrity", () => {
  it("keeps every migration version numeric so the Supabase CLI applies it", () => {
    const names = readdirSync(resolve(process.cwd(), "supabase", "migrations")).filter(
      (name) => name.endsWith(".sql")
    );
    expect(names.every((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))).toBe(true);
  });

  it("commits enum extensions before later migrations use the new values", () => {
    const foundation = migration("0009_multi_canteen_foundation.sql");
    const enums = migration("0032_enum_extensions.sql");
    expect(foundation).not.toContain("'partially_ready'");
    expect(enums).toContain("add value if not exists 'cancelled_by_kitchen'");
    expect(enums).toContain("add value if not exists 'partially_ready'");
    expect(enums).toContain("add value if not exists 'refunded'");
  });

  it("defines the historical bootstrap functions before migration 0008 alters them", () => {
    const m0006 = migration("0006_security.sql");
    for (const fn of [
      "touch_updated_at",
      "next_order_short_code",
      "pre_request_set_tenant",
    ]) {
      expect(m0006).toContain(`function public.${fn}`);
    }
    expect(m0006).toContain("create table if not exists public.pickup_secrets");
    expect(m0006).toContain("set pgrst.db_pre_request = 'public.pre_request_set_tenant'");
  });

  it("keeps wide order codes instead of truncating at four digits", () => {
    const m0031 = migration("0031_atomic_payment_and_inventory.sql");
    expect(m0031).toContain("when allocated < 10000 then lpad");
    expect(m0031).toContain("else allocated::text");
    expect(m0031).toContain("o.short_code ~ '^T-[0-9]{1,6}$'");
  });

  it("restores stock for every pre-fulfilment cancellation state", () => {
    const m0033 = migration("0033_restore_all_terminal_order_stock.sql");
    expect(m0033).toContain(
      "old.status in ('pending_payment', 'placed', 'preparing', 'ready')"
    );
    for (const state of [
      "expired",
      "rejected",
      "cancelled_by_kitchen",
      "payment_failed",
      "refunded",
    ]) {
      expect(m0033).toContain(`'${state}'`);
    }
  });

  it("validates the whole aggregated cart before the set-based stock update", () => {
    const m0031 = migration("0031_atomic_payment_and_inventory.sql");
    const lock = m0031.indexOf("for update of menu");
    const validation = m0031.indexOf("return 'out_of_stock:'");
    const update = m0031.indexOf("update public.menu_items menu", validation);
    expect(lock).toBeGreaterThan(-1);
    expect(validation).toBeGreaterThan(lock);
    expect(update).toBeGreaterThan(validation);
    expect(m0031).toContain("sum(item.qty)::bigint");
  });

  it("updates the existing gateway payment before inserting only as a missing-ledger fallback", () => {
    const m0031 = migration("0031_atomic_payment_and_inventory.sql");
    const capture = m0031.indexOf("create or replace function public.safe_capture_payment");
    const update = m0031.indexOf("update public.payments", capture);
    const fallback = m0031.indexOf("if v_payment_id is null then", update);
    const insert = m0031.indexOf("insert into public.payments", fallback);
    expect(update).toBeGreaterThan(capture);
    expect(fallback).toBeGreaterThan(update);
    expect(insert).toBeGreaterThan(fallback);
    expect(m0031).toContain("abs(p_amount_paise - v_total_paise) > 1");
    expect(m0031).toContain("p_razorpay_pid is null");
    expect(m0031).toContain("p_razorpay_oid is null");
  });

  it("atomically claims direct UPI and writes its order transition audit trail", () => {
    const m0031 = migration("0031_atomic_payment_and_inventory.sql");
    const claim = m0031.indexOf("create or replace function public.safe_claim_direct_upi");
    const payment = m0031.indexOf("update public.payments", claim);
    const order = m0031.indexOf("update public.orders", payment);
    const event = m0031.indexOf("insert into public.order_events", order);
    const log = m0031.indexOf("insert into public.order_status_logs", event);
    const end = m0031.indexOf("revoke all on function public.safe_claim_direct_upi", log);
    expect(claim).toBeGreaterThan(-1);
    expect(payment).toBeGreaterThan(claim);
    expect(order).toBeGreaterThan(payment);
    expect(event).toBeGreaterThan(order);
    expect(log).toBeGreaterThan(event);
    expect(end).toBeGreaterThan(log);
    expect(m0031.slice(claim, end)).toContain("payment_verified = false");
    expect(m0031.slice(claim, end)).toContain("status = 'initiated'");
  });

  it("persists direct-UPI verification and confirms it with the kitchen transition atomically", () => {
    const m0031 = migration("0031_atomic_payment_and_inventory.sql");
    expect(m0031).toContain(
      "add column if not exists payment_verified boolean not null default true"
    );
    expect(m0031).toContain("tenants_slug_not_reserved");
    const confirm = m0031.indexOf(
      "create or replace function public.safe_confirm_direct_upi_and_start"
    );
    const payment = m0031.indexOf("update public.payments", confirm);
    const order = m0031.indexOf("update public.orders", payment);
    const log = m0031.indexOf("insert into public.order_status_logs", order);
    const audit = m0031.indexOf("insert into public.audit_logs", log);
    const event = m0031.indexOf("insert into public.order_events", audit);
    const end = m0031.indexOf(
      "revoke all on function public.safe_confirm_direct_upi_and_start",
      event
    );
    expect(confirm).toBeGreaterThan(-1);
    expect(payment).toBeGreaterThan(confirm);
    expect(order).toBeGreaterThan(payment);
    expect(log).toBeGreaterThan(order);
    expect(audit).toBeGreaterThan(log);
    expect(event).toBeGreaterThan(audit);
    expect(end).toBeGreaterThan(event);
    expect(m0031.slice(confirm, end)).toContain("payment_verified = true");
    expect(m0031.slice(confirm, end)).toContain("status = 'captured'");
  });

  it("atomically records the direct-UPI refund sentinel and refund-owed event", () => {
    const m0031 = migration("0031_atomic_payment_and_inventory.sql");
    const mark = m0031.indexOf(
      "create or replace function public.safe_mark_direct_upi_refund_owed"
    );
    const payment = m0031.indexOf("update public.payments", mark);
    const event = m0031.indexOf("insert into public.order_events", payment);
    const end = m0031.indexOf(
      "revoke all on function public.safe_mark_direct_upi_refund_owed",
      event
    );
    expect(mark).toBeGreaterThan(-1);
    expect(payment).toBeGreaterThan(mark);
    expect(event).toBeGreaterThan(payment);
    expect(end).toBeGreaterThan(event);
    expect(m0031.slice(mark, end)).toContain("manual_upi_refund_owed");
  });
});
