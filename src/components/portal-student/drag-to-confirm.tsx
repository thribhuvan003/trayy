"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { Check, ChevronsRight, Loader2 } from "lucide-react";

const THUMB = 56; // px — thumb width
const PAD = 4; // px — track inner padding
const THRESHOLD = 0.85; // fraction of travel needed to confirm

/**
 * Neobrutalist drag-to-confirm slider. Presentational only — it calls the
 * injected `onConfirm` once the thumb is dragged past the threshold. It holds
 * no data, no Supabase, no server actions; the caller owns all of that.
 */
export function DragToConfirm({
  onConfirm,
  disabled = false,
  pending = false,
  label = "Slide to confirm",
  confirmedLabel = "Confirmed",
}: {
  onConfirm: () => void;
  disabled?: boolean;
  pending?: boolean;
  label?: string;
  confirmedLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [maxX, setMaxX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const reduce = useReducedMotion();

  // Measure available travel (track width minus thumb minus padding).
  useEffect(() => {
    const measure = () => {
      const w = trackRef.current?.offsetWidth ?? 0;
      setMaxX(Math.max(0, w - THUMB - PAD * 2));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Fill grows under the thumb; hint label fades as you drag.
  const fillWidth = useTransform(x, (v) => `${v + THUMB + PAD * 2}px`);
  const labelOpacity = useTransform(x, [0, maxX * 0.5 || 1], [1, 0]);

  function settle(toEnd: boolean) {
    animate(x, toEnd ? maxX : 0, { type: "spring", stiffness: 500, damping: 40 });
  }

  function handleDragEnd() {
    if (disabled || confirmed) return;
    if (x.get() >= maxX * THRESHOLD) {
      setConfirmed(true);
      settle(true);
      onConfirm();
    } else {
      settle(false);
    }
  }

  const inactive = disabled || pending || confirmed;

  // Reduced-motion / disabled fallback: a plain neobrutalist button.
  if (reduce) {
    return (
      <button
        type="button"
        disabled={inactive}
        onClick={() => {
          if (inactive) return;
          setConfirmed(true);
          onConfirm();
        }}
        className="ns-press w-full h-14 font-extrabold uppercase tracking-wide disabled:opacity-60"
        style={{
          background: confirmed ? "var(--ns-mint)" : "var(--color-ocean-500)",
          color: "#000",
          fontFamily: "var(--font-title-ns)",
          borderRadius: 12,
        }}
      >
        {pending ? "Confirming…" : confirmed ? confirmedLabel : label}
      </button>
    );
  }

  return (
    <div
      ref={trackRef}
      className="relative w-full select-none overflow-hidden"
      style={{
        height: THUMB + PAD * 2,
        background: "#fff",
        border: "var(--ns-border)",
        borderRadius: 14,
        boxShadow: "var(--ns-shadow)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* Cyber fill that grows behind the thumb */}
      <motion.div
        aria-hidden
        className="absolute inset-y-0 left-0"
        style={{
          width: fillWidth,
          background: confirmed ? "var(--ns-mint)" : "var(--color-ocean-500)",
          borderRight: "3px solid #000",
        }}
      />

      {/* Hint label */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-extrabold uppercase"
        style={{
          opacity: confirmed ? 0 : labelOpacity,
          color: "#000",
          letterSpacing: "0.04em",
          fontFamily: "var(--font-title-ns)",
          paddingLeft: THUMB,
        }}
      >
        {label}
      </motion.span>

      {/* Confirmed / pending overlay text */}
      {(confirmed || pending) && (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-extrabold uppercase"
          style={{ color: "#000", letterSpacing: "0.04em", fontFamily: "var(--font-title-ns)" }}
        >
          {pending && !confirmed ? "Confirming…" : confirmedLabel}
        </span>
      )}

      {/* Draggable thumb */}
      <motion.button
        type="button"
        aria-label={label}
        drag={inactive ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, top: PAD, left: PAD, width: THUMB, height: THUMB }}
        className="absolute flex items-center justify-center"
      >
        <span
          className="flex h-full w-full items-center justify-center"
          style={{
            background: "#000",
            color: "#fff",
            borderRadius: 10,
            cursor: inactive ? "default" : "grab",
          }}
        >
          {pending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : confirmed ? (
            <Check className="h-6 w-6" />
          ) : (
            <ChevronsRight className="h-6 w-6" />
          )}
        </span>
      </motion.button>
    </div>
  );
}
