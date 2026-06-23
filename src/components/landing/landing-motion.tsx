"use client";

import { useEffect } from "react";
import { triggerDemoEntry } from "@/components/landing/demo-entry-transition";

export function LandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      document.querySelectorAll(".tray-landing [data-reveal]").forEach((el) => {
        el.classList.add("tl-visible");
      });
      return;
    }

    let killed = false;
    let ctx: any = null;
    type LenisLike = {
      on(e: string, cb: () => void): void;
      raf(t: number): void;
      destroy(): void;
      scrollTo(target: any, opts?: any): void;
    };
    let lenisInstance: LenisLike | null = null;
    const roleCardHandlers: Array<[HTMLElement, (e: MouseEvent) => void]> = [];

    const initAnimations = () => {
      if (killed) return;

      (async () => {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (killed) return;
        gsap.registerPlugin(ScrollTrigger);

        // ── Lenis smooth scroll ──────────────────────────────────────────
        try {
          const LenisModule = await import("lenis");
          if (!killed) {
            const Lenis = (
              (LenisModule as Record<string, unknown>).default ?? LenisModule
            ) as new (opts: Record<string, unknown>) => LenisLike;
            lenisInstance = new Lenis({
              duration: 1.1,
              easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              smoothWheel: true,
              wheelMultiplier: 0.85,
            });
            lenisInstance.on("scroll", ScrollTrigger.update);
            const li = lenisInstance;
            gsap.ticker.add((time: number) => { li.raf(time * 1000); });
            gsap.ticker.lagSmoothing(0);
          }
        } catch { /* native scroll fallback */ }

        if (killed) return;

        ctx = gsap.context(() => {
          const root = document.querySelector<HTMLElement>(".tray-landing");
          if (!root) return;

          const bar = root.querySelector<HTMLElement>(".tl-progress-bar");
          if (bar) {
            gsap.to(bar, {
              width: "100%",
              ease: "none",
              scrollTrigger: {
                trigger: document.documentElement,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.2,
              },
            });
          }

          gsap.from(".tray-landing .tl-nav-inner > *", {
            y: -12,
            opacity: 0,
            stagger: 0.04,
            duration: 0.32,
            ease: "power2.out",
          });

          const footerMark = root.querySelector<HTMLElement>("footer .tl-footer-mark");
          if (footerMark) {
            gsap.from(footerMark, {
              scrollTrigger: { trigger: "footer", start: "top 95%" },
              opacity: 0,
              y: 12,
              duration: 0.3,
              ease: "power2.out",
            });
          }
          const footerLinks = root.querySelectorAll<HTMLElement>("footer li, footer .tl-footer-link-item");
          if (footerLinks.length) {
            gsap.from(footerLinks, {
              scrollTrigger: { trigger: "footer", start: "top 92%" },
              y: 10,
              opacity: 0,
              stagger: 0.03,
              duration: 0.22,
              ease: "power2.out",
            });
          }
        });

        const ROLE_LABELS: Record<string, string> = {
          student: "Student portal",
          kitchen: "Kitchen view",
          admin: "Admin console",
        };
        document.querySelectorAll<HTMLAnchorElement>(".tl-role-card[data-r]").forEach((card) => {
          const r = card.dataset.r ?? "";
          const label = ROLE_LABELS[r];
          if (!label || !card.href || card.tagName !== "A") return;
          const href = card.href;
          const handler = (e: MouseEvent) => { e.preventDefault(); triggerDemoEntry(href, label); };
          card.addEventListener("click", handler as EventListener);
          roleCardHandlers.push([card as HTMLElement, handler as (e: MouseEvent) => void]);
        });

      })();
    };

    const handleAnchorClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (href?.startsWith("#")) {
        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          if (lenisInstance) {
            (lenisInstance as any).scrollTo(targetEl, { offset: -72, duration: 1.1, lock: false });
          } else {
            targetEl.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    };
    document.addEventListener("click", handleAnchorClick);

    let introListener: (() => void) | null = null;
    if ((window as any).__trayIntroStarted) {
      initAnimations();
    } else {
      introListener = () => { initAnimations(); };
      window.addEventListener("tray-intro-start", introListener);
    }

    return () => {
      killed = true;
      document.removeEventListener("click", handleAnchorClick);
      if (introListener) window.removeEventListener("tray-intro-start", introListener);
      roleCardHandlers.forEach(([el, fn]) => el.removeEventListener("click", fn as EventListener));
      if (lenisInstance) lenisInstance.destroy();
      if (ctx) ctx.revert();
    };
  }, []);

  return null;
}
