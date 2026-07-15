"use client";

import { useState, memo } from "react";
import { CheckCircle2, ChefHat, Hand, KeyRound, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRupees, formatTimeIST, fmtElapsed } from "@/lib/utils";

export type KitchenTicketStatus = "placed" | "preparing" | "ready" | "collected";

export type KitchenTicketOrder = {
  id: string;
  short_code: string;
  status: KitchenTicketStatus | "pending_payment" | "rejected" | "expired";
  total_paise: number;
  placed_at: string;
  ready_at: string | null;
  collected_at: string | null;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
  table_label: string | null;
  otp_attempts: number;
};

export type KitchenTicketLine = {
  id: string;
  order_id: string;
  name_snapshot: string;
  qty: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
};

/** Product verbs: phone + speaker replace shouting. START → READY → SERVE. */
export const KITCHEN_CTA: Record<
  KitchenTicketStatus,
  { label: string; icon: typeof ChefHat } | null
> = {
  placed: { label: "START", icon: ChefHat },
  preparing: { label: "READY", icon: CheckCircle2 },
  ready: { label: "SERVE", icon: KeyRound },
  collected: null,
};

function TicketCardInner({
  order,
  lines,
  animDelay = 0,
  onAction,
  onReject,
  pending = false,
  isUnverifiedUpi = false,
  nowMs,
  size = "default",
}: {
  order: KitchenTicketOrder;
  lines: KitchenTicketLine[];
  animDelay?: number;
  onAction: (action: "start" | "ready" | "verify") => void;
  onReject?: (reason: string) => Promise<void>;
  pending?: boolean;
  isUnverifiedUpi?: boolean;
  nowMs?: number;
  /** phone = full-width tall card + 52px CTA; default = column card */
  size?: "default" | "phone";
}) {
  const cta = KITCHEN_CTA[order.status as KitchenTicketStatus] ?? null;
  const elapsed = Math.floor(((nowMs ?? Date.now()) - new Date(order.placed_at).getTime()) / 1000);
  const [showReject, setShowReject] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [otherReason, setOtherReason] = useState("");

  const overtime = order.status !== "collected" && elapsed > 480;
  const isCollected = order.status === "collected";
  const isPhone = size === "phone";
  const ctaH = isPhone ? 52 : 48;
  const codeSize = isPhone ? 22 : 13;

  const handle = () => {
    if (order.status === "placed") onAction("start");
    else if (order.status === "preparing") onAction("ready");
    else if (order.status === "ready") onAction("verify");
  };

  const REJECT_REASONS = [
    "Item unavailable",
    "Out of stock",
    "Order too late",
    "Counter closed",
  ];

  const isOtherSelected = selectedReason === "Other (type below)";
  const effectiveReason = isOtherSelected
    ? otherReason.trim() || "Other (unspecified)"
    : selectedReason;

  const submitReject = async () => {
    if (!onReject) return;
    if (!effectiveReason) {
      toast.error("Select or type a reason before rejecting");
      return;
    }
    setRejecting(true);
    try {
      await onReject(effectiveReason);
      setShowReject(false);
      setSelectedReason("");
      setOtherReason("");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <article
      className={cn("relative ticket-in", isCollected && "ticket-stamp")}
      style={{
        background: "var(--kt-paper)",
        border: isPhone ? "2px solid var(--kt-ink)" : "1px solid var(--kt-line)",
        borderRadius: isPhone ? "12px" : "7px",
        padding: isPhone ? "14px 16px" : "11px 13px",
        display: "flex",
        flexDirection: "column",
        gap: isPhone ? "10px" : "7px",
        cursor: "pointer",
        transition: "transform 0.12s, box-shadow 0.12s, border-color 0.15s",
        animationDelay: `${animDelay}s`,
        opacity: pending ? 0.7 : isCollected ? 0.6 : 1,
        boxShadow: isPhone ? "3px 3px 0 var(--kt-ink)" : undefined,
      }}
      onClick={(e) => {
        if (pending || showReject) return;
        if ((e.target as HTMLElement).closest("button, input, textarea, select, a")) return;
        // Never bypass UPI gate or locked OTP via body tap
        if (isUnverifiedUpi && order.status === "placed") return;
        if (order.status === "ready" && order.otp_attempts >= 3) return;
        handle();
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="tabular"
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: codeSize,
              fontWeight: 800,
              color: "var(--kt-ink)",
              letterSpacing: "0.02em",
            }}
          >
            {order.short_code}
          </span>
          {isUnverifiedUpi && (
            <span
              title="Payment unverified — check UPI before cooking or handing over."
              style={{
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#d97706",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: "3px",
                padding: "1px 5px",
              }}
            >
              ⚠ UPI UNVERIFIED
            </span>
          )}
        </div>
        <span
          className="tabular"
          style={{
            fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
            fontSize: isPhone ? "12px" : "10px",
            color: "var(--kt-ink-3)",
            letterSpacing: "0.06em",
          }}
        >
          {formatTimeIST(order.placed_at)}
        </span>
      </div>

      <div
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
          fontSize: isPhone ? "11px" : "10px",
          color: "var(--kt-ink-3)",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {order.order_type === "dine_in" ? (
          <>
            <UtensilsCrossed size={isPhone ? 12 : 9} /> Table {order.table_label}
          </>
        ) : (
          <>
            <ShoppingBag size={isPhone ? 12 : 9} /> Takeaway
          </>
        )}
        {order.customer_name && <> · {order.customer_name}</>}
      </div>

      <div
        className="flex flex-col"
        style={{
          gap: isPhone ? "6px" : "3px",
          fontSize: isPhone ? "15px" : "11.5px",
          color: "var(--kt-ink-2)",
          lineHeight: 1.4,
          fontWeight: isPhone ? 600 : 400,
        }}
      >
        {lines.map((l) => (
          <div key={l.id} className="flex justify-between items-center" style={{ gap: "6px" }}>
            <span className="min-w-0 break-words">
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: isPhone ? "13px" : "10px",
                  fontWeight: 700,
                  color: "var(--kt-ink-3)",
                }}
              >
                {l.qty}×
              </span>{" "}
              {l.name_snapshot}
            </span>
            <VegDot diet={l.diet_snapshot} large={isPhone} />
          </div>
        ))}
      </div>

      <div
        className={cn("flex items-center", isPhone ? "flex-col gap-3" : "justify-between")}
        style={{
          paddingTop: isPhone ? "10px" : "7px",
          borderTop: "1px dashed var(--kt-line)",
        }}
      >
        <div className={cn("flex items-center justify-between w-full", isPhone && "mb-0")}>
          {order.status === "ready" || order.status === "collected" ? (
            <span
              style={{
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: isPhone ? "13px" : "11px",
                color: "var(--kt-ink-2)",
                fontWeight: 600,
              }}
            >
              {formatRupees(order.total_paise)}
              {order.status === "ready" && (
                <span style={{ marginLeft: 8, color: "var(--kt-olive)", fontWeight: 700 }}>
                  · student shows OTP
                </span>
              )}
            </span>
          ) : (
            <span
              className="inline-flex items-center tabular"
              style={{
                gap: "5px",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: isPhone ? "13px" : "10px",
                color: overtime ? "var(--kt-tomato-2)" : "var(--kt-tomato)",
                fontWeight: 700,
                animation: overtime ? "urgent 1s infinite" : "none",
              }}
            >
              {order.status === "preparing" ? "◐ " : "⊙ "}
              {fmtElapsed(elapsed)}
            </span>
          )}

          {!isPhone && (
            <TicketActions
              order={order}
              cta={cta}
              ctaH={ctaH}
              pending={pending}
              isUnverifiedUpi={isUnverifiedUpi}
              isCollected={isCollected}
              showReject={showReject}
              onRejectOpen={() => setShowReject(true)}
              onHandle={handle}
              onReject={onReject}
            />
          )}
        </div>

        {isPhone && (
          <div className="flex items-center gap-2 w-full">
            <TicketActions
              order={order}
              cta={cta}
              ctaH={ctaH}
              pending={pending}
              isUnverifiedUpi={isUnverifiedUpi}
              isCollected={isCollected}
              showReject={showReject}
              onRejectOpen={() => setShowReject(true)}
              onHandle={handle}
              onReject={onReject}
              fullWidth
            />
          </div>
        )}
      </div>

      {showReject && (
        <div
          style={{
            marginTop: "8px",
            paddingTop: "12px",
            borderTop: "1px dashed var(--kt-line)",
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider opacity-60 mb-1">
              Reason (tap to select — big targets for gloves)
            </div>
            {REJECT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedReason(r);
                  setOtherReason("");
                }}
                style={{
                  padding: "10px 14px",
                  minHeight: "48px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  textAlign: "left",
                  background: selectedReason === r ? "var(--kt-tomato)" : "var(--kt-cream-4)",
                  color: selectedReason === r ? "var(--kt-cream)" : "var(--kt-ink-2)",
                  border: `2px solid ${selectedReason === r ? "var(--kt-tomato)" : "var(--kt-line-2)"}`,
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReason("Other (type below)");
              }}
              style={{
                padding: "10px 14px",
                minHeight: "48px",
                borderRadius: "8px",
                fontSize: "14px",
                textAlign: "left",
                background: isOtherSelected ? "var(--kt-tomato)" : "var(--kt-cream-4)",
                color: isOtherSelected ? "var(--kt-cream)" : "var(--kt-ink-2)",
                border: `2px solid ${isOtherSelected ? "var(--kt-tomato)" : "var(--kt-line-2)"}`,
                cursor: "pointer",
              }}
            >
              Other (type below)
            </button>
            {isOtherSelected && (
              <input
                type="text"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Type reason (e.g. student says wrong order)"
                autoFocus
                style={{
                  minHeight: "48px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "15px",
                  background: "var(--kt-paper)",
                  border: "2px solid var(--kt-tomato)",
                  color: "var(--kt-ink)",
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitReject();
                }}
              />
            )}
          </div>
          <div className="flex gap-2" style={{ marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setShowReject(false);
                setSelectedReason("");
                setOtherReason("");
              }}
              disabled={rejecting}
              className="flex-1 transition-colors"
              style={{
                height: "48px",
                borderRadius: "8px",
                border: "2px solid var(--kt-line-2)",
                background: "var(--kt-cream-4)",
                fontSize: "14px",
                fontWeight: 600,
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
              disabled={rejecting || !effectiveReason}
              className="flex-1 transition-colors"
              style={{
                height: "48px",
                borderRadius: "8px",
                background: "var(--kt-tomato)",
                color: "var(--kt-cream)",
                fontSize: "14px",
                fontWeight: 800,
                cursor: rejecting || !effectiveReason ? "not-allowed" : "pointer",
                opacity: rejecting || !effectiveReason ? 0.5 : 1,
                border: "none",
                boxShadow: "0 3px 0 var(--kt-ink)",
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

function TicketActions({
  order,
  cta,
  ctaH,
  pending,
  isUnverifiedUpi,
  isCollected,
  showReject,
  onRejectOpen,
  onHandle,
  onReject,
  fullWidth = false,
}: {
  order: KitchenTicketOrder;
  cta: { label: string; icon: typeof ChefHat } | null;
  ctaH: number;
  pending: boolean;
  isUnverifiedUpi: boolean;
  isCollected: boolean;
  showReject: boolean;
  onRejectOpen: () => void;
  onHandle: () => void;
  onReject?: (reason: string) => Promise<void>;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", fullWidth && "w-full")}>
      {order.status === "placed" && onReject && !showReject && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRejectOpen();
          }}
          title="Reject this order"
          aria-label="Reject order"
          className="inline-flex items-center justify-center transition-colors shrink-0"
          style={{
            height: ctaH,
            width: ctaH,
            borderRadius: "8px",
            border: "2px solid var(--kt-line-2)",
            background: "transparent",
            color: "var(--kt-ink-3)",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>
      )}

      {order.status === "ready" && order.otp_attempts >= 3 && (
        <span
          title="3 wrong OTP attempts — admin must reset this order"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "0 10px",
            height: ctaH,
            borderRadius: "8px",
            background: "#2a160a",
            color: "var(--kt-tomato)",
            border: "2px solid var(--kt-tomato)",
            fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            flex: fullWidth ? 1 : undefined,
            justifyContent: "center",
          }}
        >
          🔒 LOCKED
        </span>
      )}

      {cta && isUnverifiedUpi && order.status === "placed" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (
              window.confirm(
                `⚠ UPI PAYMENT UNVERIFIED\n\nCheck your UPI soundbox or PhonePe/GPay app.\n\nDid you receive ₹${(order.total_paise / 100).toFixed(0)} from the student?\n\nTap OK only if you see the payment.`
              )
            ) {
              onHandle();
            }
          }}
          className="inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.985]"
          style={{
            fontFamily: "var(--font-manrope), ui-sans-serif, system-ui",
            fontSize: fullWidth ? "13px" : "10px",
            fontWeight: 800,
            color: "#92400e",
            background: "#fef3c7",
            padding: "0 12px",
            height: ctaH,
            borderRadius: "8px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
            border: "2px solid #d97706",
            boxShadow: "0 2px 0 #b45309",
            flex: fullWidth ? 1 : undefined,
          }}
        >
          ⚠ Check UPI + START
        </button>
      )}

      {cta &&
        !(isUnverifiedUpi && order.status === "placed") &&
        !(order.status === "ready" && order.otp_attempts >= 3) && (
          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              if (!pending) onHandle();
            }}
            className="inline-flex items-center justify-center gap-2 transition-all active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              fontFamily: "var(--font-manrope), ui-sans-serif, system-ui",
              fontSize: fullWidth ? "15px" : "12px",
              fontWeight: 800,
              color: "var(--kt-cream)",
              background:
                order.status === "preparing"
                  ? "var(--kt-olive)"
                  : order.status === "ready"
                    ? "var(--kt-ink)"
                    : "var(--kt-tomato)",
              padding: "0 14px",
              height: ctaH,
              borderRadius: "8px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: pending ? "not-allowed" : "pointer",
              border: "none",
              boxShadow: "0 3px 0 var(--kt-ink)",
              flex: fullWidth ? 1 : undefined,
              minWidth: fullWidth ? undefined : 100,
            }}
          >
            <cta.icon size={fullWidth ? 18 : 14} /> {pending ? "…" : cta.label}
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
  );
}

function VegDot({ diet, large = false }: { diet: "veg" | "nonveg" | "egg"; large?: boolean }) {
  const color =
    diet === "veg" ? "var(--kt-olive)" : diet === "egg" ? "var(--kt-mustard)" : "var(--kt-tomato)";
  const box = large ? 14 : 10;
  const dot = large ? 7 : 5;

  return (
    <span
      className="shrink-0"
      style={{
        width: box,
        height: box,
        border: `1.4px solid ${color}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: "2px",
      }}
    >
      <span
        style={{
          width: dot,
          height: dot,
          borderRadius: "50%",
          background: color,
          display: "block",
        }}
      />
    </span>
  );
}

export const KitchenTicketCard = memo(TicketCardInner);
