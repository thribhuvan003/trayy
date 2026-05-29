"use client";

import { motion } from "framer-motion";
import { formatRupees } from "@/lib/utils";

export function RevenueChart({ days }: { days: { label: string; revenue: number }[] }) {
  const w = 480;
  const h = 200;
  const pad = { l: 32, r: 16, t: 18, b: 30 };
  const inner = { w: w - pad.l - pad.r, h: h - pad.t - pad.b };
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const step = days.length > 1 ? inner.w / (days.length - 1) : 0;
  const points = days.map((d, i) => ({
    x: pad.l + i * step,
    y: pad.t + inner.h - (d.revenue / max) * inner.h,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${points[points.length - 1]?.x ?? pad.l} ${pad.t + inner.h} L ${points[0]?.x ?? pad.l} ${pad.t + inner.h} Z`;
  const todayIdx = days.length - 1;
  const todayPt = points[todayIdx];

  return (
    <section className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 min-h-[260px] flex flex-col">
      <header className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-graphite-200">Revenue this week</h3>
          <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-graphite-400 mt-0.5">
            Daily total · INR
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-graphite-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-lime" /> Revenue
          </span>
        </div>
      </header>
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-lime)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--admin-lime)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((p, i) => (
            <line
              key={i}
              x1={pad.l}
              x2={w - pad.r}
              y1={pad.t + inner.h * p}
              y2={pad.t + inner.h * p}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="2 4"
            />
          ))}
          <path d={area} fill="url(#revGrad)" />
          <motion.path
            d={line}
            stroke="var(--admin-lime)"
            strokeWidth="1.75"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: [0.2, 0.7, 0.3, 1] }}
          />
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === todayIdx ? 4 : 2.5}
              fill={i === todayIdx ? "var(--admin-bg)" : "var(--admin-lime)"}
              stroke={i === todayIdx ? "var(--admin-lime)" : "transparent"}
              strokeWidth={2}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 + i * 0.05 }}
            />
          ))}
          {days.map((d, i) => (
            <text
              key={i}
              x={pad.l + i * step}
              y={h - pad.b + 16}
              fill="var(--admin-ink-3)"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {d.label}
            </text>
          ))}
          {todayPt && (
            <g>
              <text
                x={todayPt.x}
                y={todayPt.y - 12}
                fill="var(--admin-lime)"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {formatRupees(days[todayIdx]?.revenue ?? 0)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
