"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  prefersReducedMotion,
  registerTrayGsap,
} from "@/lib/motion/tray-motion";

const portals = [
  {
    index: "01",
    eyebrow: "STUDENT APP",
    accentColor: "#5cb1ff",
    title: "Order from any canteen.",
    description:
      "Choose canteen, browse menu, pay by UPI, track your order live, collect with a 4-digit OTP.",
    previewSrc: "/demo/student.html",
    deviceTag: "DESKTOP • STUDENT",
    portalKey: "student" as const,
  },
  {
    index: "02",
    eyebrow: "KITCHEN VIEW",
    accentColor: "#ef5749",
    title: "Run the live queue.",
    description:
      "New tickets land instantly, prep timers count down, OTP handover clears the order — no paper, no shouting.",
    previewSrc: "/demo/kitchen.html",
    deviceTag: "TABLET • KITCHEN",
    portalKey: "kitchen" as const,
  },
  {
    index: "03",
    eyebrow: "ADMIN CONSOLE",
    accentColor: "#cdfa50",
    title: "See the whole operation.",
    description:
      "Live orders, daily revenue, menu edits, staff access, full audit log — one screen, every metric.",
    previewSrc: "/demo/admin.html",
    deviceTag: "DESKTOP • ADMIN",
    portalKey: "admin" as const,
  },
] as const;

interface InteractivePortalCardProps {
  portal: typeof portals[number];
  idx: number;
  portalRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

function InteractivePortalCard({ portal, idx, portalRefs }: InteractivePortalCardProps) {
  const [mounted, setMounted] = React.useState(false);
  const [iframeLoaded, setIframeLoaded] = React.useState(true);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== "object") return;

      if (portal.portalKey === "student" && data.type === "student_order_placed") {
        setSyncMessage(`Pushed Order #${data.orderId} to Kitchen via LocalStorage`);
        const tid = setTimeout(() => setSyncMessage(null), 3800);
        return () => clearTimeout(tid);
      }
      if (portal.portalKey === "kitchen" && data.type === "kitchen_order_received") {
        setSyncMessage(`Incoming Order #${data.orderId} detected (0ms delay)`);
        const tid = setTimeout(() => setSyncMessage(null), 3800);
        return () => clearTimeout(tid);
      }
      if (portal.portalKey === "admin" && data.type === "admin_revenue_updated") {
        setSyncMessage(`Revenue updated +₹${data.total} (Sync Complete)`);
        const tid = setTimeout(() => setSyncMessage(null), 3800);
        return () => clearTimeout(tid);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [portal.portalKey]);

  const containerBg = portal.portalKey === "admin" ? "#1A1A19" : "#F4EFE6";

  const isReducedMotion = useReducedMotion();
  const shouldAnimate = mounted && !isReducedMotion;

  const cardRef = useRef<HTMLDivElement>(null);

  const hoverProgress = useMotionValue(0);

  const springConfig = { stiffness: 120, damping: 20, mass: 0.6 };

  const scale = useSpring(useTransform(hoverProgress, [0, 1], [1, 1.025]), springConfig);
  const shadow = useTransform(
    hoverProgress,
    [0, 1],
    [
      "0px 1px 3px rgba(26, 26, 25, 0.05), 0px 1px 2px rgba(26, 26, 25, 0.03)",
      "0px 25px 60px rgba(26, 26, 25, 0.12)"
    ]
  );

  const handleMouseEnter = () => {
    if (isReducedMotion) return;
    hoverProgress.set(1);
  };

  const handleMouseLeave = () => {
    hoverProgress.set(0);
  };

  const bgGlow = useTransform(
    hoverProgress,
    [0, 1],
    [
      "rgba(255, 255, 255, 1)",
      portal.portalKey === "student"
        ? "rgba(244, 250, 255, 1)"
        : portal.portalKey === "kitchen"
        ? "rgba(255, 245, 245, 1)"
        : "rgba(253, 255, 240, 1)"
    ]
  );

  const borderColorGlow = useTransform(
    hoverProgress,
    [0, 1],
    [
      "var(--tray-border, rgba(26, 26, 25, 0.12))",
      portal.portalKey === "student"
        ? "rgba(92, 177, 255, 0.35)"
        : portal.portalKey === "kitchen"
        ? "rgba(239, 87, 73, 0.3)"
        : "rgba(205, 250, 80, 0.45)"
    ]
  );

  const style = shouldAnimate
    ? {
        scale,
        boxShadow: shadow,
        backgroundColor: bgGlow,
        borderColor: borderColorGlow,
      }
    : {};

  return (
    <div
      className="block h-full flex-1 cursor-pointer"
      onClick={() => window.open(portal.previewSrc, "_blank", "noopener,noreferrer")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.open(portal.previewSrc, "_blank", "noopener,noreferrer");
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open ${portal.title} demo`}
      style={{ textDecoration: "none" }}
    >
    <motion.article
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-portal-card
      className="motion-card group relative flex flex-col select-none rounded-[18px] overflow-hidden border border-[var(--tray-border,rgba(26,26,25,0.12))] bg-white h-full flex-1 transition-colors duration-300 cursor-pointer"
      style={style}
    >
      {/* Portal Head — eyebrow + title */}
      <motion.div
        className="flex flex-col gap-2.5 z-10"
        style={{
          padding: "24px 24px 20px",
          borderBottom: "1px solid var(--tray-border, rgba(26, 26, 25, 0.12))",
        }}
      >
        <div className="flex justify-between items-center text-[10.5px] font-medium tracking-[0.14em]">
          <span className="flex items-center gap-2" style={{ fontFamily: "var(--font-geist-mono, monospace)", color: "var(--tray-muted, #78716C)" }}>
            {portal.eyebrow}
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] leading-none"
              style={{ background: "rgba(26,26,25,0.06)", color: "var(--tray-muted, #78716C)", letterSpacing: "0.1em" }}
            >
              Demo
            </span>
          </span>
          <span className="flex items-center gap-1.5 font-bold" style={{ fontFamily: "var(--font-geist-mono, monospace)", color: portal.accentColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: portal.accentColor, boxShadow: `0 0 8px ${portal.accentColor}` }} />
            {portal.index}
          </span>
        </div>
        <h3
          className="text-[clamp(1.35rem,3vw,2rem)] tracking-[-0.025em] leading-[1.08] m-0 font-normal italic"
          style={{
            fontFamily: "var(--font-instrument-serif, 'Instrument Serif', serif)",
            color: "var(--tray-ink, #1A1A19)",
          }}
        >
          {portal.title}
        </h3>
      </motion.div>

      {/* Portal Frame — iframe preview */}
      <motion.div className="z-10">
        <div
          ref={(el) => {
            portalRefs.current[idx] = el;
          }}
          className="relative overflow-hidden h-[300px] sm:h-[380px] md:h-[480px] transition-all duration-300"
          style={{
            background: containerBg,
            borderBottom: "1px solid var(--tray-border, rgba(26, 26, 25, 0.12))",
            boxShadow: syncMessage
              ? `inset 0 0 0 2px ${portal.accentColor}`
              : "none",
          }}
        >
          {/* Real-time Sync Pipeline Banner Overlay */}
          {syncMessage && (
            <div
              className="absolute top-3 left-3 right-3 py-2 px-3.5 rounded-lg z-40 text-xs font-semibold flex items-center gap-2 shadow-lg select-none pointer-events-none animate-bounce"
              style={{
                background: portal.accentColor === "#cdfa50" ? "#cdfa50" : portal.accentColor,
                color: portal.accentColor === "#cdfa50" ? "#1A1A19" : "#ffffff",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
              </span>
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Premium skeleton loader placeholder */}
          {!iframeLoaded && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none transition-opacity duration-300"
              style={{ background: containerBg }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 animate-spin"
                style={{
                  borderColor: portal.portalKey === "admin" ? "rgba(255,255,255,0.12)" : "rgba(26,26,25,0.08)",
                  borderTopColor: portal.portalKey === "admin" ? "#cdfa50" : "#334155",
                }}
              />
              <span
                className="text-[9px] tracking-[0.16em] uppercase font-mono mt-3"
                style={{ color: portal.portalKey === "admin" ? "rgba(255,255,255,0.35)" : "rgba(26,26,25,0.4)" }}
              >
                Spinning up portal...
              </span>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={portal.previewSrc}
            title={`${portal.title} Live Preview`}
            loading="eager"
            sandbox="allow-scripts allow-same-origin"
            scrolling="no"
            tabIndex={-1}
            aria-hidden={true}
            onLoad={() => setIframeLoaded(true)}
            className="border-0 origin-top-left absolute top-0 left-0 pointer-events-none"
          />

          {/* Bottom fade overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-20"
            style={{
              background: `linear-gradient(to bottom, transparent, ${containerBg})`,
            }}
          />
        </div>
      </motion.div>

      {/* Portal Body — description + footer */}
      <motion.div
        className="flex flex-col gap-4 flex-1 z-10"
        style={{ padding: "20px 24px 24px" }}
      >
        <p
          className="text-[13.5px] leading-relaxed m-0 opacity-80"
          style={{
            color: "var(--tray-muted, #78716C)",
            maxWidth: "34ch",
            fontFamily: "var(--font-inter, var(--font-geist, sans-serif))",
          }}
        >
          {portal.description}
        </p>

        {/* Footer row */}
        <div className="flex justify-between items-center mt-auto pt-4" style={{ borderTop: "1px solid var(--tray-border, rgba(26, 26, 25, 0.12))" }}>
          <span className="text-[10px] font-medium tracking-[0.12em]" style={{ fontFamily: "var(--font-geist-mono, monospace)", color: "var(--tray-muted, #78716C)" }}>
            {portal.deviceTag}
          </span>
          <a
            href={portal.previewSrc}
            className="group/btn flex items-center gap-1 text-[11px] font-semibold tracking-[0.08em] uppercase transition-all duration-200 hover:opacity-85"
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              color: portal.accentColor,
            }}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            LAUNCH DEMO <span className="inline-block transition-transform duration-200 group-hover/btn:translate-x-0.75">→</span>
          </a>
        </div>
      </motion.div>
    </motion.article>
    </div>
  );
}

export function PiranhaPortalsSection() {
  const rootRef = useRef<HTMLElement>(null);
  const portalRefs = useRef<(HTMLDivElement | null)[]>([]);

  React.useEffect(() => {
    function resizeIframes() {
      portalRefs.current.forEach((frame, idx) => {
        if (!frame) return;
        const iframe = frame.querySelector("iframe");
        if (!iframe) return;
        const parentWidth = frame.clientWidth;
        const parentHeight = frame.clientHeight;
        if (parentWidth === 0) return;

        const portalKey = portals[idx]?.portalKey;
        let virtualWidth = 1024;
        let scrollPx = 0;

        if (portalKey === "kitchen") {
          virtualWidth = 980;
          scrollPx = 0;
        } else if (portalKey === "admin") {
          virtualWidth = 1300;
          scrollPx = 0;
        }

        const virtualHeight = parentHeight * (virtualWidth / parentWidth) + scrollPx;
        iframe.style.width = `${virtualWidth}px`;
        iframe.style.height = `${virtualHeight}px`;
        const scale = parentWidth / virtualWidth;
        iframe.style.transform = `scale(${scale}) translateY(-${scrollPx}px)`;
        iframe.style.transformOrigin = "0 0";
      });
    }

    resizeIframes();
    window.addEventListener("resize", resizeIframes);
    const interval = setInterval(resizeIframes, 1000);

    return () => {
      window.removeEventListener("resize", resizeIframes);
      clearInterval(interval);
    };
  }, []);

  useGSAP(
    () => {
      registerTrayGsap();
      if (prefersReducedMotion()) return;

      const root = rootRef.current;
      if (!root) return;

      const heading = root.querySelector("[data-portals-heading]") as HTMLElement;

      if (heading) {
        gsap.fromTo(
          heading.querySelectorAll(".split-word > span"),
          { yPercent: 105, rotate: 1.5, opacity: 0 },
          {
            yPercent: 0,
            rotate: 0,
            opacity: 1,
            duration: 1.05,
            stagger: 0.04,
            ease: "power4.out",
            scrollTrigger: { trigger: heading, start: "top 80%" },
          }
        );
      }

      const cards = root.querySelectorAll("[data-portal-card]");
      if (cards.length) {
        gsap.fromTo(
          cards,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: root, start: "top 75%" },
          }
        );
      }
    },
    { scope: rootRef }
  );

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden px-5 py-[var(--section-y)] sm:px-8 lg:px-10 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-[var(--section-y-lg)]"
      style={{ background: "var(--tray-bg, #F4EFE6)", color: "var(--tray-ink, #1A1A19)" }}
    >
      {/* Dot-grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:18px_18px]" />

      <div className="relative z-10 mx-auto max-w-7xl w-full flex flex-col gap-16">
        {/* Heading panel */}
        <div className="max-w-4xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <p className="text-[0.72rem] font-code font-medium uppercase tracking-[0.24em] opacity-40">
              01 / The system
            </p>
          </div>

          <h2
            data-portals-heading
            className="leading-[0.9] tracking-[-0.03em] uppercase flex flex-col gap-1"
            style={{
              fontFamily: "var(--font-barlow)",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 6.5vw, 6.2rem)",
              color: "var(--tray-ink, #1A1A19)",
            }}
          >
            <span className="split-word inline-block overflow-hidden">
              <span className="inline-block">Three portals,</span>
            </span>
            <span className="split-word inline-block overflow-hidden">
              <span className="inline-block">one source of</span>
            </span>
            <span className="split-word inline-block overflow-hidden">
              <span className="inline-block">truth.</span>
            </span>
          </h2>

          <p
            className="mt-7 max-w-3xl text-[1.1rem] leading-8 opacity-70"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            One database, three purpose-built views. What a student orders is what the
            kitchen prepares, which is what the admin monitors. No lag, no re-sync,
            no mystery. Open any portal below — fully live, no sign-up.
          </p>
        </div>

        {/* 3-Column Portal Grid */}
        <div
          id="portals"
          className="grid grid-cols-1 lg:grid-cols-3 gap-[18px] mt-14 w-full scroll-mt-24"
          style={{ perspective: "1200px" }}
        >
          {portals.map((portal, idx) => (
            <InteractivePortalCard
              key={portal.index}
              portal={portal}
              idx={idx}
              portalRefs={portalRefs}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
