"use client";

import { useEffect, useState, useRef } from "react";
import {
  KitchenTicketCard,
  type KitchenTicketOrder,
  type KitchenTicketLine,
  type KitchenTicketStatus,
} from "./ticket-card";

type Status = KitchenTicketStatus;
type Order = KitchenTicketOrder;
type Line = KitchenTicketLine;

const COL_DOT: Record<Status, { symbol: string; color: string }> = {
  placed: { symbol: "▣", color: "var(--kt-mustard)" },
  preparing: { symbol: "◐", color: "var(--kt-tomato)" },
  ready: { symbol: "✓", color: "var(--kt-olive)" },
  collected: { symbol: "▪", color: "var(--kt-ink-3)" },
};

export function OrderColumn({
  title,
  status,
  orders,
  linesByOrder,
  onAction,
  onReject,
  pendingActionId,
  unverifiedUpiOrders,
  /** Hide column chrome when parent already shows segment tabs */
  hideHeader = false,
  /** Phone single-lane: taller list + phone ticket size */
  variant = "column",
}: {
  title: string;
  subtitle?: string;
  status: Status;
  orders: Order[];
  linesByOrder: Map<string, Line[]>;
  onAction: (id: string, action: "start" | "ready" | "verify") => void;
  onReject?: (id: string, reason: string) => Promise<void>;
  pendingActionId?: string | null;
  unverifiedUpiOrders?: Set<string>;
  hideHeader?: boolean;
  variant?: "column" | "phone";
}) {
  const dot = COL_DOT[status];
  const isPhone = variant === "phone";

  const [nowMs, setNowMs] = useState(() => Date.now());
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasOrders = orders.length > 0;
  const needsClock = (status === "placed" || status === "preparing") && hasOrders;
  useEffect(() => {
    if (!needsClock) {
      if (clockRef.current) {
        clearInterval(clockRef.current);
        clockRef.current = null;
      }
      return;
    }
    if (clockRef.current) return;
    clockRef.current = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      if (clockRef.current) {
        clearInterval(clockRef.current);
        clockRef.current = null;
      }
    };
  }, [needsClock]);

  return (
    <section
      className="flex flex-col min-h-0"
      style={{
        background: isPhone ? "transparent" : "var(--kt-cream-4)",
        borderRight: isPhone ? "none" : "1px solid var(--kt-line)",
        minHeight: 0,
        flex: isPhone ? 1 : undefined,
      }}
    >
      {!hideHeader && (
        <header
          className="flex justify-between items-center sticky top-0 z-10"
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--kt-line)",
            background: "var(--kt-paper)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--kt-ink)",
            }}
          >
            <span style={{ color: dot.color, marginRight: "4px" }}>{dot.symbol}</span>
            {title}
          </span>
          <span
            className="tabular"
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "11px",
              background: "var(--kt-ink)",
              color: "var(--kt-cream)",
              padding: "2px 8px",
              borderRadius: "5px",
              fontWeight: 700,
            }}
          >
            {String(orders.length).padStart(2, "0")}
          </span>
        </header>
      )}

      <div
        className="flex flex-col overflow-y-auto"
        style={{
          flex: 1,
          padding: isPhone ? "12px 12px 88px" : "10px",
          gap: isPhone ? "12px" : "8px",
          maxHeight: isPhone ? undefined : "min(600px, 52vh)",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--kt-line-2) transparent",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--kt-ink-4)",
              fontSize: "13px",
              padding: isPhone ? "48px 20px" : "32px 16px",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>—</div>
            {status === "placed" && "No new tickets. Speaker will ding when one lands."}
            {status === "preparing" && "Nothing on the flame."}
            {status === "ready" && "Nothing waiting to serve."}
            {status === "collected" && "No orders"}
          </div>
        ) : (
          orders.map((o, idx) => (
            <KitchenTicketCard
              key={o.id}
              order={o}
              lines={linesByOrder.get(o.id) ?? []}
              animDelay={idx * 0.04}
              onAction={(act) => onAction(o.id, act)}
              onReject={onReject ? (reason) => onReject(o.id, reason) : undefined}
              pending={pendingActionId === o.id}
              isUnverifiedUpi={unverifiedUpiOrders?.has(o.id) ?? false}
              nowMs={nowMs}
              size={isPhone ? "phone" : "default"}
            />
          ))
        )}
      </div>
    </section>
  );
}
