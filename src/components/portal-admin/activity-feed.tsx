"use client";

import { motion, AnimatePresence } from "framer-motion";
import { formatTimeIST } from "@/lib/utils";

type Log = {
  id: string;
  order_id: string;
  to_status: string;
  from_status: string | null;
  created_at: string;
  note: string | null;
};

const TONE: Record<string, string> = {
  placed: "bg-ocean-500",
  preparing: "bg-amber-400",
  ready: "bg-lime",
  collected: "bg-emerald-400",
  rejected: "bg-rose-400",
  expired: "bg-rose-400",
  pending_payment: "bg-graphite-400",
};

export function ActivityFeed({ logs }: { logs: Log[] }) {
  return (
    <section className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 min-h-[260px]">
      <header className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-graphite-200">Live activity</h3>
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-graphite-400 mt-0.5">
            Real-time events · today
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full border border-emerald-400/30 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </header>
      {logs.length === 0 ? (
        <div className="text-[12px] text-graphite-400 text-center py-8">No activity yet today.</div>
      ) : (
        <ul className="flex flex-col gap-1 max-h-[260px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {logs.slice(0, 8).map((l) => (
              <motion.li
                key={l.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35, ease: [0.34, 1.26, 0.64, 1] }}
                className="flex items-center gap-3 text-[11.5px] font-mono py-1.5 px-2 rounded-md hover:bg-graphite-200/[0.04]"
              >
                <span className="text-graphite-400 w-[58px] tabular shrink-0">
                  {formatTimeIST(l.created_at)}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${TONE[l.to_status] ?? "bg-graphite-400"}`} />
                <span className="flex-1 text-graphite-300">
                  <span className="text-graphite-200 font-semibold">{(l.order_id ?? "").slice(0, 6)}</span>{" "}
                  · {l.from_status ?? "—"} → <span className="text-graphite-200">{l.to_status ?? "—"}</span>
                  {(l.note ?? null) && <span className="text-graphite-400"> · {l.note}</span>}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
