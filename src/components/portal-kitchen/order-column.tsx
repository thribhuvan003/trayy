"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChefHat, Hand, KeyRound, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRupees, formatTimeIST, elapsedSeconds, fmtElapsed } from "@/lib/utils";

type Status = "placed" | "preparing" | "ready" | "collected";
type Order = {
  id: string;
  short_code: string;
  status: Status | "pending_payment" | "rejected" | "expired";
  total_paise: number;
  placed_at: string;
  ready_at: string | null;
  collected_at: string | null;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
  table_label: string | null;
};
type Line = {
  id: string;
  order_id: string;
  name_snapshot: string;
  qty: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
};

/* Column colour prefix — matches kitchen.html data-status ::before content */
const COL_DOT: Record<Status, { symbol: string; color: string }> = {
  placed:     { symbol: "▣", color: "var(--kt-mustard)" },
  preparing:  { symbol: "◐", color: "var(--kt-tomato)" },
  ready:      { symbol: "✓", color: "var(--kt-olive)" },
  collected:  { symbol: "▪", color: "var(--kt-ink-3)" },
};

const COL_CTA: Record<Status, { label: string; icon: typeof ChefHat } | null> = {
  placed:    { label: "Start →",    icon: ChefHat },
  preparing: { label: "Ready →",    icon: CheckCircle2 },
  ready:     { label: "Verify OTP", icon: KeyRound },
  collected: null,
};

export function OrderColumn({
  title,
  subtitle,
  status,
  orders,
  linesByOrder,
  onAction,
  onReject,
}: {
  title: string;
  subtitle: string;
  status: Status;
  orders: Order[];
  linesByOrder: Map<string, Line[]>;
  onAction: (id: string, action: "start" | "ready" | "verify") => void;
  onReject?: (id: string, reason: string) => Promise<void>;
}) {
  const dot = COL_DOT[status];
  const cta = COL_CTA[status];

  return (
    /* .col — cream-4 bg, border-right (managed by parent grid), flex column */
    <section
      className="flex flex-col"
      style={{
        background: "var(--kt-cream-4)",
        borderRight: "1px solid var(--kt-line)",
        minHeight: 0,
      }}
    >
      {/* .col-head — paper bg, sticky, border-bottom */}
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

      {/* .col-body — scrollable ticket list */}
      <div
        className="flex flex-col overflow-y-auto"
        style={{
          flex: 1,
          padding: "10px",
          gap: "8px",
          maxHeight: "min(600px, 52vh)",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--kt-line-2) transparent",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {orders.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              fontFamily: "var(--font-newsreader), ui-serif, Georgia",
              fontStyle: "italic",
              fontSize: "28px",
              color: "var(--kt-ink-4)",
              opacity: 0.4,
              lineHeight: 1,
            }}
          >
            ∅
          </div>
        ) : (
          orders.map((o, idx) => (
            <TicketCard
              key={o.id}
              order={o}
              lines={linesByOrder.get(o.id) ?? []}
              animDelay={idx * 0.04}
              cta={cta}
              onAction={(act) => onAction(o.id, act)}
              onReject={onReject ? (reason) => onReject(o.id, reason) : undefined}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TicketCard({
  order,
  lines,
  animDelay,
  cta,
  onAction,
  onReject,
}: {
  order: Order;
  lines: Line[];
  animDelay: number;
  cta: { label: string; icon: typeof ChefHat } | null;
  onAction: (action: "start" | "ready" | "verify") => void;
  onReject?: (reason: string) => Promise<void>;
}) {
  const [elapsed, setElapsed] = useState(elapsedSeconds(order.placed_at));
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedSeconds(order.placed_at)), 1000);
    return () => clearInterval(id);
  }, [order.placed_at]);

  useEffect(() => {
    if (showReject) setTimeout(() => reasonRef.current?.focus(), 30);
  }, [showReject]);

  const overtime = order.status !== "collected" && elapsed > 480;
  const isCollected = order.status === "collected";

  const handle = () => {
    if (order.status === "placed") onAction("start");
    else if (order.status === "preparing") onAction("ready");
    else if (order.status === "ready") onAction("verify");
  };

  const submitReject = async () => {
    if (!onReject) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("Enter a reason before rejecting");
      reasonRef.current?.focus();
      return;
    }
    setRejecting(true);
    try {
      await onReject(trimmed);
      setShowReject(false);
      setReason("");
    } finally {
      setRejecting(false);
    }
  };

  return (
    /* .ticket — paper bg, border, 7px radius, ticketIn animation */
    <article
      className={cn("relative ticket-in", isCollected && "ticket-stamp")}
      style={{
        background: "var(--kt-paper)",
        border: "1px solid var(--kt-line)",
        borderRadius: "7px",
        padding: "11px 13px",
        display: "flex",
        flexDirection: "column",
        gap: "7px",
        cursor: "pointer",
        transition: "transform 0.12s, box-shadow 0.12s, border-color 0.15s",
        animationDelay: `${animDelay}s`,
        opacity: isCollected ? 0.6 : 1,
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        handle();
      }}
    >
      {/* .tkt-r1 — order id + placed time */}
      <div className="flex justify-between items-center">
        <span
          className="tabular"
          style={{
            fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--kt-ink)",
            letterSpacing: "0.02em",
          }}
        >
          {order.short_code}
        </span>
        <span
          className="tabular"
          style={{
            fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
            fontSize: "10px",
            color: "var(--kt-ink-3)",
            letterSpacing: "0.06em",
          }}
        >
          {formatTimeIST(order.placed_at)}
        </span>
      </div>

      {/* .tkt-student — customer name + order type */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
          fontSize: "10px",
          color: "var(--kt-ink-3)",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {order.order_type === "dine_in" ? (
          <><UtensilsCrossed size={9} /> Table {order.table_label}</>
        ) : (
          <><ShoppingBag size={9} /> Takeaway</>
        )}
        {order.customer_name && (
          <> · {order.customer_name}</>
        )}
      </div>

      {/* .tkt-items — line items with veg/nonveg dot */}
      <div className="flex flex-col" style={{ gap: "3px", fontSize: "11.5px", color: "var(--kt-ink-2)", lineHeight: 1.4 }}>
        {lines.map((l) => (
          <div key={l.id} className="flex justify-between items-center" style={{ gap: "6px" }}>
            <span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--kt-ink-3)",
                }}
              >
                {l.qty}×
              </span>
              {" "}{l.name_snapshot}
            </span>
            {/* Veg/nonveg indicator dot — matches .veg-dot spec */}
            <VegDot diet={l.diet_snapshot} />
          </div>
        ))}
      </div>

      {/* .tkt-foot — timer/OTP left, action button right */}
      <div
        className="flex justify-between items-center"
        style={{
          paddingTop: "7px",
          borderTop: "1px dashed var(--kt-line)",
        }}
      >
        {/* Left side: timer for active orders, OTP display for ready/collected */}
        {(order.status === "ready" || order.status === "collected") ? (
          <span
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "11px",
              color: "var(--kt-ink-2)",
              fontWeight: 600,
            }}
          >
            {formatRupees(order.total_paise)}
          </span>
        ) : (
          <span
            className="inline-flex items-center tabular"
            style={{
              gap: "5px",
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "10px",
              color: overtime ? "var(--kt-tomato-2)" : "var(--kt-tomato)",
              fontWeight: 600,
              animation: overtime ? "urgent 1s infinite" : "none",
            }}
          >
            {order.status === "preparing" ? "◐ " : "⊙ "}
            {fmtElapsed(elapsed)}
          </span>
        )}

        {/* Right side: action button or collected timestamp */}
        <div className="flex items-center gap-1.5">
          {/* Reject button — only on placed orders */}
          {order.status === "placed" && onReject && !showReject && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowReject(true); }}
              title="Reject this order"
              aria-label="Reject order"
              className="inline-flex items-center justify-center transition-colors"
              style={{
                height: "44px",
                width: "44px",
                borderRadius: "5px",
                border: "1px solid var(--kt-line-2)",
                background: "transparent",
                color: "var(--kt-ink-3)",
                cursor: "pointer",
              }}
            >
              <X size={15} />
            </button>
          )}

          {/* .tkt-action — tomato button for status advances */}
          {cta && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handle(); }}
              className="inline-flex items-center gap-1.5 transition-all"
              style={{
                fontFamily: "var(--font-manrope), ui-sans-serif, system-ui",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--kt-cream)",
                background: "var(--kt-tomato)",
                padding: "0 10px",
                height: "44px",
                borderRadius: "5px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
                border: "none",
                boxShadow: "none",
                transition: "transform 0.12s, box-shadow 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 0 var(--kt-ink)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
              }}
            >
              <cta.icon size={12} /> {cta.label}
            </button>
          )}

          {isCollected && order.collected_at && (
            <span
              className="inline-flex items-center gap-1"
              style={{
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "10px",
                color: "var(--kt-olive)",
              }}
            >
              <Hand size={10} /> {formatTimeIST(order.collected_at)}
            </span>
          )}
        </div>
      </div>

      {/* Reject inline form */}
      {showReject && (
        <div
          style={{
            marginTop: "8px",
            paddingTop: "12px",
            borderTop: "1px dashed var(--kt-line)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--kt-tomato)",
              marginBottom: "6px",
            }}
          >
            Reject reason (required)
          </p>
          <textarea
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            rows={2}
            maxLength={200}
            placeholder="e.g. Item unavailable, wrong order, etc."
            style={{
              width: "100%",
              resize: "none",
              border: "1px solid var(--kt-line-2)",
              background: "var(--kt-cream-4)",
              color: "var(--kt-ink)",
              fontSize: "12px",
              padding: "8px 10px",
              borderRadius: "6px",
              fontFamily: "inherit",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--kt-tomato)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--kt-line-2)"; }}
          />
          <div
            style={{
              textAlign: "right",
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "10px",
              color: "var(--kt-ink-4)",
              marginBottom: "8px",
            }}
          >
            {reason.length}/200
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowReject(false); setReason(""); }}
              disabled={rejecting}
              className="flex-1 transition-colors"
              style={{
                height: "36px",
                borderRadius: "6px",
                border: "1px solid var(--kt-line-2)",
                background: "var(--kt-cream-4)",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--kt-ink-2)",
                cursor: "pointer",
                opacity: rejecting ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitReject()}
              disabled={rejecting || !reason.trim()}
              className="flex-1 transition-colors"
              style={{
                height: "36px",
                borderRadius: "6px",
                background: "var(--kt-tomato)",
                color: "var(--kt-cream)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: rejecting || !reason.trim() ? "not-allowed" : "pointer",
                opacity: rejecting || !reason.trim() ? 0.5 : 1,
                border: "none",
                boxShadow: "0 2px 0 var(--kt-ink)",
              }}
            >
              {rejecting ? "Rejecting…" : "Confirm reject"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/* Veg/nonveg/egg indicator dot — matches kitchen.html .veg-dot spec */
function VegDot({ diet }: { diet: "veg" | "nonveg" | "egg" }) {
  const color =
    diet === "veg" ? "var(--kt-olive)"
    : diet === "egg" ? "var(--kt-mustard)"
    : "var(--kt-tomato)";

  return (
    <span
      className="shrink-0"
      style={{
        width: "10px",
        height: "10px",
        border: `1.4px solid ${color}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: "2px",
        position: "relative",
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: color,
          display: "block",
        }}
      />
    </span>
  );
}
