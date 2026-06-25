"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SectionReveal, RevealItem } from "@/lib/motion/tray-framer";

const HEADING_WORDS: { text: string; accent?: boolean }[] = [
  { text: "One" },
  { text: "campus." },
  { text: "Four" },
  { text: "roles." },
  { text: "No", accent: true },
  { text: "overlap.", accent: true },
];

const headingContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const headingWord = {
  hidden: { y: "115%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.58, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const CANTEENS = [
  {
    id: 0,
    name: "Main Canteen",
    mark: "MC",
    tag: "Ground floor · North block",
    badge: "Open",
  },
  {
    id: 1,
    name: "Hostel Mess",
    mark: "HM",
    tag: "Residential block",
    badge: "Open",
  },
  {
    id: 2,
    name: "North Block",
    mark: "NB",
    tag: "Academic wing",
    badge: "Open",
  },
  {
    id: 3,
    name: "Night Canteen",
    mark: "NC",
    tag: "Till 11 pm",
    badge: "Late",
  },
] as const;

const ROLES = [
  {
    id: 0,
    role: "Student",
    scope: "All active canteens",
    color: "#2E80EF",
    desc: "Browse every open counter, pay by UPI, track prep, collect with a four-digit code.",
  },
  {
    id: 1,
    role: "Kitchen staff",
    scope: "Assigned canteen only",
    color: "#B8531A",
    desc: "One live queue for their counter — no tickets from other outlets.",
  },
  {
    id: 2,
    role: "Canteen admin",
    scope: "One canteen — full control",
    color: "#16A34A",
    desc: "Menus, pricing, staff, and daily sales for a single outlet.",
  },
  {
    id: 3,
    role: "Campus admin",
    scope: "Whole campus — analytics",
    color: "#D97706",
    desc: "Cross-counter revenue, permissions, and performance in one view.",
  },
] as const;

const ROLE_ACCESS_MAP: Record<number, readonly number[]> = {
  0: [0, 1, 2, 3],
  1: [0],
  2: [1],
  3: [0, 1, 2, 3],
} as const;

const CANTEEN_ACCESS_MAP: Record<number, readonly number[]> = {
  0: [0, 1, 2, 3],
  1: [0, 2, 3],
  2: [0, 3],
  3: [0, 3],
} as const;

type LinkPath = {
  key: string;
  d: string;
  color: string;
};

function getAnchor(
  el: HTMLElement,
  container: HTMLElement,
  side: "right" | "left",
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: side === "right" ? rect.right - containerRect.left : rect.left - containerRect.left,
    y: rect.top - containerRect.top + rect.height / 2,
  };
}

function buildCurve(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

export function CampusModelSection({ campusName }: { campusName?: string | null }) {
  const [hoveredRole, setHoveredRole] = useState<number | null>(null);
  const [hoveredCanteen, setHoveredCanteen] = useState<number | null>(null);
  const [linkPaths, setLinkPaths] = useState<LinkPath[]>([]);

  const prefersReducedMotion = useReducedMotion();

  const mapRef = useRef<HTMLDivElement>(null);
  const canteenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const roleRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isAnyHovered = hoveredRole !== null || hoveredCanteen !== null;

  const isCanteenActive = (cIdx: number) => {
    if (hoveredCanteen === cIdx) return true;
    if (hoveredRole !== null) return ROLE_ACCESS_MAP[hoveredRole].includes(cIdx);
    return !isAnyHovered;
  };

  const isCanteenDimmed = (cIdx: number) => {
    if (hoveredCanteen !== null && hoveredCanteen !== cIdx) return true;
    if (hoveredRole !== null && !ROLE_ACCESS_MAP[hoveredRole].includes(cIdx)) return true;
    return false;
  };

  const isRoleActive = (rIdx: number) => {
    if (hoveredRole === rIdx) return true;
    if (hoveredCanteen !== null) return CANTEEN_ACCESS_MAP[hoveredCanteen].includes(rIdx);
    return !isAnyHovered;
  };

  const isRoleDimmed = (rIdx: number) => {
    if (hoveredRole !== null && hoveredRole !== rIdx) return true;
    if (hoveredCanteen !== null && !CANTEEN_ACCESS_MAP[hoveredCanteen].includes(rIdx)) return true;
    return false;
  };

  const recomputeLinks = useCallback(() => {
    const container = mapRef.current;
    if (!container || !isAnyHovered) {
      setLinkPaths([]);
      return;
    }

    const paths: LinkPath[] = [];

    if (hoveredRole !== null) {
      const roleEl = roleRefs.current[hoveredRole];
      if (!roleEl) return;
      const to = getAnchor(roleEl, container, "left");
      ROLE_ACCESS_MAP[hoveredRole].forEach((cIdx) => {
        const canteenEl = canteenRefs.current[cIdx];
        if (!canteenEl) return;
        const from = getAnchor(canteenEl, container, "right");
        paths.push({
          key: `c${cIdx}-r${hoveredRole}`,
          d: buildCurve(from, to),
          color: ROLES[hoveredRole].color,
        });
      });
    } else if (hoveredCanteen !== null) {
      const canteenEl = canteenRefs.current[hoveredCanteen];
      if (!canteenEl) return;
      const from = getAnchor(canteenEl, container, "right");
      CANTEEN_ACCESS_MAP[hoveredCanteen].forEach((rIdx) => {
        const roleEl = roleRefs.current[rIdx];
        if (!roleEl) return;
        const to = getAnchor(roleEl, container, "left");
        paths.push({
          key: `c${hoveredCanteen}-r${rIdx}`,
          d: buildCurve(from, to),
          color: ROLES[rIdx].color,
        });
      });
    }

    setLinkPaths(paths);
  }, [hoveredCanteen, hoveredRole, isAnyHovered]);

  useLayoutEffect(() => {
    recomputeLinks();
  }, [recomputeLinks]);

  useLayoutEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => recomputeLinks());
    observer.observe(container);
    window.addEventListener("resize", recomputeLinks);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recomputeLinks);
    };
  }, [recomputeLinks]);

  return (
    <SectionReveal as="div" id="campus" className="px-5 py-[var(--section-y)] sm:px-8 lg:px-10 lg:py-[var(--section-y-lg)]">
      <motion.div className="mx-auto max-w-7xl">
        <div className="mb-14 max-w-3xl">
          <RevealItem>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[var(--tray-border-strong)]" aria-hidden />
              <p className="font-code text-[0.68rem] tracking-[0.08em] text-[var(--tray-muted)]">
                Campus model
              </p>
            </div>
          </RevealItem>

          <RevealItem>
            {prefersReducedMotion ? (
              <h2
                className="mt-5 font-editorial text-[clamp(2.4rem,5vw,4rem)] font-normal leading-[1.02] tracking-[-0.03em] text-[var(--tray-ink)]"
                style={{ textWrap: "balance" }}
              >
                One campus. Four roles.{" "}
                <span className="italic text-[var(--tray-clay)]">No overlap.</span>
              </h2>
            ) : (
              <motion.h2
                className="mt-5 flex flex-wrap gap-x-[0.28em] font-editorial text-[clamp(2.4rem,5vw,4rem)] font-normal leading-[1.02] tracking-[-0.03em] text-[var(--tray-ink)]"
                variants={headingContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
              >
                {HEADING_WORDS.map((word, i) => (
                  <span
                    key={`${word.text}-${i}`}
                    className="inline-flex overflow-hidden pb-[0.04em]"
                  >
                    <motion.span
                      className={
                        word.accent
                          ? "inline-block italic text-[var(--tray-clay)]"
                          : "inline-block"
                      }
                      variants={headingWord}
                    >
                      {word.text}
                    </motion.span>
                  </span>
                ))}
              </motion.h2>
            )}
          </RevealItem>

          <RevealItem>
            <p className="mt-5 max-w-xl text-[0.98rem] leading-[1.65] text-[var(--tray-muted)]">
              Students reach every open counter. Kitchen staff stay inside their queue. Admins
              only see their scope — hover a counter or role to trace the link.
            </p>
          </RevealItem>
        </div>

        <div
          ref={mapRef}
          className="relative grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16"
        >
          <svg
            className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full lg:block"
            aria-hidden
          >
            {linkPaths.map((path, i) => (
              <motion.path
                key={path.key}
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth={1.5}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{
                  pathLength: { duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 },
                  opacity: { duration: 0.2 },
                }}
              />
            ))}
          </svg>

          <div className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[var(--tray-border)] pb-3">
              <span className="font-code text-[0.68rem] tracking-[0.06em] text-[var(--tray-muted)]">
                {campusName || "Aditya Engineering College"}
              </span>
              <span className="font-code text-[0.62rem] tracking-[0.06em] text-[var(--tray-muted)]">
                {CANTEENS.length} counters
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CANTEENS.map((c) => {
                const active = isCanteenActive(c.id);
                const dimmed = isCanteenDimmed(c.id);
                const linkColor =
                  hoveredRole !== null
                    ? ROLES[hoveredRole].color
                    : hoveredCanteen === c.id
                      ? "var(--tray-ink)"
                      : undefined;

                return (
                  <motion.div
                    key={c.name}
                    ref={(el) => {
                      canteenRefs.current[c.id] = el;
                    }}
                    onMouseEnter={() => setHoveredCanteen(c.id)}
                    onMouseLeave={() => setHoveredCanteen(null)}
                    animate={{
                      y: active && isAnyHovered ? -3 : 0,
                      opacity: dimmed ? 0.32 : 1,
                      borderColor:
                        active && isAnyHovered
                          ? (linkColor ?? "var(--tray-ink)")
                          : "var(--tray-border)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="relative flex min-h-[132px] cursor-pointer flex-col justify-between rounded-lg border bg-[var(--tray-surface-strong)] p-4 select-none"
                    style={{ borderStyle: "solid", borderWidth: "1px" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-code text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--tray-clay)]">
                        {c.mark}
                      </div>
                      <span
                        className="font-code text-[0.58rem] tracking-[0.08em] text-[var(--tray-muted)]"
                        style={{
                          color: active && isAnyHovered ? (linkColor ?? "var(--tray-ink)") : undefined,
                        }}
                      >
                        {c.badge}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-ui text-[0.98rem] font-semibold tracking-tight text-[var(--tray-ink)]">
                        {c.name}
                      </h3>
                      <p className="mt-1 font-code text-[0.62rem] tracking-[0.04em] text-[var(--tray-muted)]">
                        {c.tag}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="border-b border-dashed border-[var(--tray-border)] pb-3">
              <span className="font-code text-[0.68rem] tracking-[0.06em] text-[var(--tray-muted)]">
                Role boundaries
              </span>
            </div>

            {ROLES.map((r) => {
              const active = isRoleActive(r.id);
              const dimmed = isRoleDimmed(r.id);

              return (
                <RevealItem key={r.role} variant="card">
                  <motion.div
                    ref={(el) => {
                      roleRefs.current[r.id] = el;
                    }}
                    onMouseEnter={() => setHoveredRole(r.id)}
                    onMouseLeave={() => setHoveredRole(null)}
                    animate={{
                      x: active && isAnyHovered ? 4 : 0,
                      opacity: dimmed ? 0.32 : 1,
                      borderColor:
                        active && isAnyHovered ? r.color : "var(--tray-border)",
                      backgroundColor:
                        active && isAnyHovered
                          ? `color-mix(in srgb, ${r.color} 6%, var(--tray-surface-strong))`
                          : "var(--tray-surface-strong)",
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="relative cursor-pointer overflow-hidden rounded-lg border p-5 select-none"
                    style={{ borderStyle: "solid", borderWidth: "1px" }}
                  >
                    <div
                      className="absolute bottom-0 left-0 top-0 w-[3px]"
                      style={{
                        backgroundColor: r.color,
                        opacity: active && isAnyHovered ? 1 : 0.18,
                        transition: "opacity 0.25s ease",
                      }}
                    />

                    <div className="flex flex-col gap-2 pl-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-ui text-[0.95rem] font-semibold tracking-tight text-[var(--tray-ink)]">
                          {r.role}
                        </span>
                        <span
                          className="font-code text-[0.6rem] tracking-[0.04em]"
                          style={{
                            color: active && isAnyHovered ? r.color : "var(--tray-muted)",
                          }}
                        >
                          {r.scope}
                        </span>
                      </div>
                      <p className="text-[0.88rem] leading-[1.58] text-[var(--tray-muted)]">
                        {r.desc}
                      </p>
                    </div>
                  </motion.div>
                </RevealItem>
              );
            })}
          </div>
        </div>

        <RevealItem>
          <p className="mt-8 font-code text-[0.62rem] tracking-[0.04em] text-[var(--tray-muted)] lg:mt-10">
            {isAnyHovered
              ? "Connected paths show who can reach which counter."
              : "Hover any counter or role to draw the access map."}
          </p>
        </RevealItem>
      </motion.div>
    </SectionReveal>
  );
}