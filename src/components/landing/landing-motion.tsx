"use client";

import { useEffect } from "react";
import { triggerDemoEntry } from "@/components/landing/demo-entry-transition";

/**
 * LandingMotion — GSAP + Lenis scroll engine for the Tray landing page.
 *
 * CONFLICT RULES (strictly enforced):
 *  - PiranhaPortalsSection owns: [data-portal-card] entrance, [data-portals-heading] word reveal.
 *    → landing-motion ONLY adds mouse-tilt (event listeners, no scroll conflict).
 *  - TrustSection owns: motion.div card entrance (Framer whileInView opacity/y/scale).
 *    → landing-motion targets the plain <h2>, <p>, and <svg> icons only.
 *  - HoverCard (used in Stack) owns: motion.div whileHover 3D tilt.
 *    → landing-motion adds entrance animation only (one-shot from, finishes before hover).
 *  - CampusModelSection: canteen cards are motion.div animated by Framer.
 *    → landing-motion targets the plain outer .grid wrapper only.
 *  - SyncPipelineVisual: Framer Motion internally.
 *    → landing-motion targets the section h2 and p only.
 *  - RevealItem / SectionReveal: animate the motion.div wrapper — children (h2, p) are plain.
 *    → landing-motion animating h2/p directly is safe (no overlap with Framer).
 */
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
    const tiltCleanups: Array<() => void> = [];
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
              duration: 1.6,
              easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              smoothWheel: true,
              wheelMultiplier: 0.72,
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

          // ── SCROLL PROGRESS BAR ───────────────────────────────────────
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

          const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

          // ═══════════════════════════════════════════════════════════════
          // 1. HERO — clip-path curtain word reveal
          // ═══════════════════════════════════════════════════════════════
          gsap.from(".tray-landing .tl-h1 .tl-word", {
            clipPath: "inset(100% 0% 0% 0%)",
            y: 24,
            opacity: 0,
            stagger: 0.09,
            duration: 1.05,
            ease: "power4.out",
            delay: 0.1,
          });

          gsap.from(".tray-landing .tl-nav-inner > *", {
            y: -28,
            opacity: 0,
            stagger: 0.06,
            duration: 0.7,
            ease: "power3.out",
          });

          const blobA = root.querySelector("[data-blob-a]") as HTMLElement | null;
          const blobB = root.querySelector("[data-blob-b]") as HTMLElement | null;
          if (blobA) {
            gsap.to(blobA, {
              yPercent: -30, xPercent: 12, ease: "none",
              scrollTrigger: { trigger: root, start: "top top", end: "80% top", scrub: 1.4 },
            });
          }
          if (blobB) {
            gsap.to(blobB, {
              yPercent: 22, xPercent: -12, ease: "none",
              scrollTrigger: { trigger: root, start: "top top", end: "80% top", scrub: 1.2 },
            });
          }

          // ═══════════════════════════════════════════════════════════════
          // 2. CAMPUS TICKER — velocity skew + enter from opposite edges
          // ═══════════════════════════════════════════════════════════════
          const tickerWrappers = root.querySelectorAll<HTMLElement>("[data-ticker-wrapper]");

          ScrollTrigger.create({
            trigger: "[data-ticker-wrapper]",
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              if (killed) return;
              const v = self.getVelocity();
              const skew = gsap.utils.clamp(-9, 9, v * 0.004);
              tickerWrappers.forEach((w, i) => {
                gsap.to(w, { skewX: i % 2 === 0 ? skew : -skew, duration: 0.4, ease: "power2.out", overwrite: "auto" });
              });
            },
          });

          tickerWrappers.forEach((wrapper, i) => {
            gsap.from(wrapper, {
              scrollTrigger: { trigger: wrapper, start: "top 102%" },
              x: i % 2 === 0 ? -55 : 55,
              opacity: 0, duration: 1.2, ease: "power4.out",
            });
          });

          // ═══════════════════════════════════════════════════════════════
          // 3. PORTALS — heading parallax + mouse tilt only
          // ═══════════════════════════════════════════════════════════════
          const portalSection = root.querySelector<HTMLElement>("#portals");
          if (portalSection) {
            const portalH2 = portalSection.querySelector<HTMLElement>("h2");
            if (portalH2) {
              gsap.to(portalH2, {
                y: -50, ease: "none",
                scrollTrigger: { trigger: portalSection, start: "top bottom", end: "bottom top", scrub: 2 },
              });
            }

            root.querySelectorAll<HTMLElement>("[data-portal-card]").forEach((card) => {
              const onMove = (e: MouseEvent) => {
                const r = card.getBoundingClientRect();
                const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
                const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
                gsap.to(card, { rotateY: nx * 8, rotateX: -ny * 6, scale: 1.025, transformPerspective: 900, duration: 0.4, ease: "power2.out" });
              };
              const onLeave = () => {
                gsap.to(card, { rotateX: 0, rotateY: 0, scale: 1, duration: 0.65, ease: "power3.out" });
              };
              card.addEventListener("mousemove", onMove);
              card.addEventListener("mouseleave", onLeave);
              tiltCleanups.push(() => {
                card.removeEventListener("mousemove", onMove);
                card.removeEventListener("mouseleave", onLeave);
              });
            });
          }

          // ═══════════════════════════════════════════════════════════════
          // 4. TRUST — h2 parallax + svg icon spin
          // ═══════════════════════════════════════════════════════════════
          const trustSection = root.querySelector<HTMLElement>("#trust");
          if (trustSection) {
            const trustH2 = trustSection.querySelector<HTMLElement>("h2");
            if (trustH2) {
              gsap.to(trustH2, {
                y: -38, ease: "none",
                scrollTrigger: { trigger: trustSection, start: "top bottom", end: "bottom top", scrub: 2 },
              });
            }
            const icons = trustSection.querySelectorAll<SVGElement>("svg");
            gsap.from(icons, {
              scrollTrigger: { trigger: trustSection, start: "top 72%" },
              rotate: -110, scale: 0.2, opacity: 0,
              stagger: 0.15, duration: 1.0, ease: "back.out(2.5)",
            });
          }

          // ═══════════════════════════════════════════════════════════════
          // 5. CAMPUS MODEL — iris expand + h2 parallax
          // ═══════════════════════════════════════════════════════════════
          const campusSection = root.querySelector<HTMLElement>("#campus");
          if (campusSection) {
            const campusGrid = campusSection.querySelector<HTMLElement>(".grid");
            if (campusGrid) {
              gsap.fromTo(campusGrid,
                { clipPath: "circle(0% at 50% 50%)", opacity: 0 },
                { clipPath: "circle(100% at 50% 50%)", opacity: 1, duration: 1.5, ease: "power3.inOut", scrollTrigger: { trigger: campusSection, start: "top 80%" } }
              );
            }
            const campusH2 = campusSection.querySelector<HTMLElement>("h2");
            if (campusH2) {
              gsap.to(campusH2, { y: -42, ease: "none", scrollTrigger: { trigger: campusSection, start: "top bottom", end: "bottom top", scrub: 1.8 } });
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // 6. REALTIME SYNC — h2 scale-blur entrance
          // ═══════════════════════════════════════════════════════════════
          const syncSection = root.querySelector<HTMLElement>("#sync");
          if (syncSection) {
            const syncH2 = syncSection.querySelector<HTMLElement>("h2");
            if (syncH2) {
              gsap.fromTo(syncH2,
                { scale: 1.08, opacity: 0, filter: "blur(8px)" },
                { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: syncSection, start: "top 80%" } }
              );
              gsap.to(syncH2, { y: -35, ease: "none", scrollTrigger: { trigger: syncSection, start: "top bottom", end: "bottom top", scrub: 2 } });
            }
            const syncLede = syncSection.querySelector<HTMLElement>("p");
            if (syncLede) {
              gsap.from(syncLede, {
                scrollTrigger: { trigger: syncSection, start: "top 76%" },
                opacity: 0, y: 18, filter: "blur(8px)", duration: 1.0, ease: "power3.out", delay: 0.25,
              });
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // 7. KITCHEN QUOTE — clip-path wipe
          // ═══════════════════════════════════════════════════════════════
          const quoteSection = Array.from(root.querySelectorAll<HTMLElement>("section"))
            .find((s) => (s.getAttribute("style") ?? "").includes("tray-ink"));
          const quote = root.querySelector<HTMLElement>(".tray-landing blockquote");

          if (quoteSection && quote) {
            gsap.fromTo(quote,
              { clipPath: "inset(100% 0% 0% 0%)", y: 40 },
              { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.45, ease: "power4.out", scrollTrigger: { trigger: quoteSection, start: "top 82%" } }
            );
            gsap.to(quote, { scale: 1.04, ease: "none", scrollTrigger: { trigger: quoteSection, start: "top top", end: "bottom top", scrub: 1.6 } });
            const quoteEyebrow = quoteSection.querySelector<HTMLElement>("p");
            if (quoteEyebrow) gsap.from(quoteEyebrow, { scrollTrigger: { trigger: quoteSection, start: "top 85%" }, x: -28, opacity: 0, duration: 0.8, ease: "power3.out" });
            const quoteCite = quoteSection.querySelector<HTMLElement>("footer");
            if (quoteCite) gsap.from(quoteCite, { scrollTrigger: { trigger: quoteSection, start: "top 78%" }, x: 28, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.3 });
          }

          // ═══════════════════════════════════════════════════════════════
          // 8. FLOW (#flow) — card-deal flip + horizontal marquee (desktop)
          // ═══════════════════════════════════════════════════════════════
          const flowSection = root.querySelector<HTMLElement>("#flow");
          if (flowSection) {
            const flowH2 = flowSection.querySelector<HTMLElement>("h2");
            if (flowH2) {
              gsap.from(flowH2, {
                scrollTrigger: { trigger: flowSection, start: "top 82%" },
                clipPath: "inset(0% 100% 0% 0%)", opacity: 0, duration: 1.1, ease: "power4.inOut",
              });
              gsap.to(flowH2, { y: -38, ease: "none", scrollTrigger: { trigger: flowSection, start: "top bottom", end: "bottom top", scrub: 2 } });
            }

            if (isDesktop && !reduced) {
              const track = flowSection.querySelector<HTMLElement>(".tl-flow-track-horizontal");
              if (track) {
                // Entrance reveal on scroll
                gsap.set(track, { opacity: 0, y: 50 });
                gsap.to(track, {
                  opacity: 1,
                  y: 0,
                  duration: 1.25,
                  ease: "power4.out",
                  scrollTrigger: {
                    trigger: flowSection,
                    start: "top 80%",
                  }
                });

                const halfWidth = track.scrollWidth / 2;
                const tween = gsap.to(track, { x: -halfWidth, duration: 35, ease: "none", repeat: -1 });
                const onMouseEnter = () => gsap.to(tween, { timeScale: 0, duration: 0.5, ease: "power2.out" });
                const onMouseLeave = () => gsap.to(tween, { timeScale: 1, duration: 0.5, ease: "power2.out" });
                track.addEventListener("mouseenter", onMouseEnter);
                track.addEventListener("mouseleave", onMouseLeave);
                tiltCleanups.push(() => {
                  track.removeEventListener("mouseenter", onMouseEnter);
                  track.removeEventListener("mouseleave", onMouseLeave);
                });
              }
            } else {
              const flowCards = flowSection.querySelectorAll<HTMLElement>(".mt-14 > div");
              if (flowCards.length) {
                gsap.fromTo(flowCards,
                  { rotateY: -50, x: 70, opacity: 0, transformPerspective: 1200 },
                  { scrollTrigger: { trigger: flowSection, start: "top 88%" }, rotateY: 0, x: 0, opacity: 1, stagger: 0.1, duration: 1.25, ease: "power4.out", clearProps: "rotateY,x,opacity,transformPerspective" }
                );
              }
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // 9. STACK (#stack) — center-out pop entrance
          // ═══════════════════════════════════════════════════════════════
          const stackSection = root.querySelector<HTMLElement>("#stack");
          if (stackSection) {
            const stackH2 = stackSection.querySelector<HTMLElement>("h2");
            if (stackH2) {
              gsap.from(stackH2, { scrollTrigger: { trigger: stackSection, start: "top 82%" }, y: 50, opacity: 0, clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "power4.out" });
              gsap.to(stackH2, { y: -36, ease: "none", scrollTrigger: { trigger: stackSection, start: "top bottom", end: "bottom top", scrub: 2 } });
            }
            const stackLede = stackSection.querySelector<HTMLElement>("p");
            if (stackLede) gsap.from(stackLede, { scrollTrigger: { trigger: stackSection, start: "top 78%" }, opacity: 0, y: 16, duration: 0.85, ease: "power3.out", delay: 0.1 });
            // Per-card scroll reveal: each card pops in as it enters the viewport.
            // once:true keeps the card visible after reveal (no reverse on scroll-up).
            const techCards = stackSection.querySelectorAll<HTMLElement>("[data-stack-card]");
            techCards.forEach((card, i) => {
              gsap.fromTo(
                card,
                { y: 32, opacity: 0, scale: 0.9 },
                {
                  y: 0, opacity: 1, scale: 1,
                  duration: 0.55,
                  delay: (i % 4) * 0.06, // slight stagger within each row
                  ease: "back.out(1.4)",
                  clearProps: "transform,opacity",
                  scrollTrigger: {
                    trigger: card,
                    start: "top 88%",
                    once: true, // stays visible after reveal — no re-hide on scroll-up
                  },
                }
              );
            });
          }

          // ═══════════════════════════════════════════════════════════════
          // 10. REALTIME STRIP — number count-up
          // ═══════════════════════════════════════════════════════════════
          const bigNumWrapper = root.querySelector("[data-realtime-counter='wrapper']") as HTMLElement ?? null;
          const bigNumVal = bigNumWrapper?.querySelector("[data-realtime-value='true']") as HTMLElement ?? null;
          if (bigNumWrapper && bigNumVal) {
            const obj = { val: 0 };
            const trigger = bigNumWrapper.closest("[class*='rounded']") as HTMLElement ?? bigNumWrapper;
            gsap.to(obj, {
              val: 240, duration: 1.5, ease: "power3.out",
              scrollTrigger: { trigger, start: "top 85%", once: true },
              onUpdate: () => { bigNumVal.textContent = `${Math.round(obj.val)}`; },
              onComplete: () => { bigNumVal.textContent = "240"; },
            });
          }

          // ═══════════════════════════════════════════════════════════════
          // 11. CLOSING CTA — letter-spacing stamp
          // ═══════════════════════════════════════════════════════════════
          const closingSection = root.querySelector<HTMLElement>("#closing");
          if (closingSection) {
            const closingH2 = closingSection.querySelector<HTMLElement>("h2");
            if (closingH2) {
              gsap.fromTo(closingH2,
                { letterSpacing: "0.2em", scale: 0.9, filter: "blur(10px)", opacity: 0 },
                { letterSpacing: "-0.02em", scale: 1, filter: "blur(0px)", opacity: 1, duration: 1.55, ease: "power4.out", scrollTrigger: { trigger: closingSection, start: "top 82%" } }
              );
              gsap.to(closingH2, { y: -28, ease: "none", scrollTrigger: { trigger: closingSection, start: "top bottom", end: "bottom top", scrub: 2.5 } });
            }
            const closingGlow = closingSection.querySelector<HTMLElement>("[class*='blur-3xl']");
            if (closingGlow) {
              gsap.fromTo(closingGlow,
                { scale: 0.2, opacity: 0 },
                { scale: 1, opacity: 1, duration: 2.0, ease: "power3.out", scrollTrigger: { trigger: closingSection, start: "top 88%" } }
              );
            }
            const closingP = closingSection.querySelector<HTMLElement>("p");
            if (closingP) gsap.from(closingP, { scrollTrigger: { trigger: closingSection, start: "top 80%" }, opacity: 0, y: 20, filter: "blur(6px)", duration: 0.95, ease: "power3.out", delay: 0.2 });
            const closingCTAs = closingSection.querySelectorAll<HTMLElement>("a");
            if (closingCTAs.length) gsap.from(closingCTAs, { scrollTrigger: { trigger: closingSection, start: "top 78%" }, y: 38, opacity: 0, scale: 0.94, stagger: 0.12, duration: 0.95, ease: "back.out(1.6)", delay: 0.35 });
          }

          // ═══════════════════════════════════════════════════════════════
          // 12. FOOTER — watermark parallax + link wave-in
          // ═══════════════════════════════════════════════════════════════
          const footerMark = root.querySelector<HTMLElement>("footer .tl-footer-mark");
          if (footerMark) gsap.from(footerMark, { scrollTrigger: { trigger: "footer", start: "top 95%" }, opacity: 0, scale: 0.94, duration: 1.5, ease: "power3.out" });
          const footerLinks = root.querySelectorAll<HTMLElement>("footer li, footer .tl-footer-link-item");
          if (footerLinks.length) gsap.from(footerLinks, { scrollTrigger: { trigger: "footer", start: "top 92%" }, y: 20, opacity: 0, stagger: 0.04, duration: 0.8, ease: "power3.out" });

          // ═══════════════════════════════════════════════════════════════
          // 13. MAGNETIC BUTTONS
          // ═══════════════════════════════════════════════════════════════
          root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((btn) => {
            const innerText = btn.querySelector("span, .liquid-btn-text") as HTMLElement | null;
            const onMove = (e: MouseEvent) => {
              const r = btn.getBoundingClientRect();
              const dx = (e.clientX - (r.left + r.width / 2)) * 0.28;
              const dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
              gsap.to(btn, { x: dx, y: dy, duration: 0.42, ease: "power2.out" });
              if (innerText) gsap.to(innerText, { x: dx * 0.15, y: dy * 0.15, duration: 0.42, ease: "power2.out" });
            };
            const onLeave = () => {
              gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
              if (innerText) gsap.to(innerText, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
            };
            btn.addEventListener("mousemove", onMove);
            btn.addEventListener("mouseleave", onLeave);
            tiltCleanups.push(() => {
              btn.removeEventListener("mousemove", onMove);
              btn.removeEventListener("mouseleave", onLeave);
            });
          });

          // ═══════════════════════════════════════════════════════════════
          // 14. SECTION EYEBROW DIVIDER LINE DRAW
          // ═══════════════════════════════════════════════════════════════
          root.querySelectorAll<HTMLElement>(
            "#portals .font-code, #campus .font-code, #sync .font-code, #trust .font-code, #flow .font-code, #stack .font-code, #closing .font-code"
          ).forEach((eyebrow) => {
            const parent = eyebrow.parentElement;
            if (!parent || parent.querySelector(".tl-divider-line")) return;
            const line = document.createElement("div");
            line.className = "tl-divider-line";
            line.style.cssText = "height:1px;background:currentColor;width:0%;opacity:0.13;margin-top:10px;transform-origin:left;will-change:width;";
            parent.appendChild(line);
            gsap.to(line, { width: "100%", duration: 1.5, ease: "power3.inOut", scrollTrigger: { trigger: parent, start: "top 88%", once: true } });
          });

          // ═══════════════════════════════════════════════════════════════
          // 15. NAV SLIDING PILL + SCROLL SPY
          // ═══════════════════════════════════════════════════════════════
          const nav = root.querySelector<HTMLElement>("nav[aria-label='Main navigation']");
          const pill = nav?.querySelector<HTMLElement>(".tl-nav-pill");
          const links = nav?.querySelectorAll<HTMLAnchorElement>("a");

          if (nav && pill && links?.length) {
            let activeLink: HTMLAnchorElement | null = null;
            const updatePill = (link: HTMLAnchorElement) => {
              gsap.to(pill, { x: link.offsetLeft, width: link.offsetWidth, opacity: 1, duration: 0.35, ease: "power2.out", overwrite: "auto" });
            };
            const hidePill = () => {
              if (activeLink) { updatePill(activeLink); }
              else gsap.to(pill, { opacity: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
            };
            links.forEach((link) => link.addEventListener("mouseenter", () => updatePill(link)));
            nav.addEventListener("mouseleave", hidePill);
            ["#portals", "#campus", "#stack"].forEach((id) => {
              const sec = root.querySelector(id);
              if (!sec) return;
              const targetLink = Array.from(links).find((l) => l.getAttribute("href") === id);
              if (!targetLink) return;
              ScrollTrigger.create({
                trigger: sec, start: "top 40%", end: "bottom 40%",
                onToggle: (self) => {
                  if (self.isActive && !killed) { activeLink = targetLink; updatePill(targetLink); }
                  else if (!self.isActive && activeLink === targetLink && !killed) { activeLink = null; hidePill(); }
                },
              });
            });
          }

        }); // end gsap.context

        // ── Demo role card click transitions ─────────────────────────────
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

    // ── Smooth anchor scroll ──────────────────────────────────────────────
    const handleAnchorClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (href?.startsWith("#")) {
        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          if (lenisInstance) {
            (lenisInstance as any).scrollTo(targetEl, { offset: -40, duration: 1.5 });
          } else {
            targetEl.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    };
    document.addEventListener("click", handleAnchorClick);

    // ── Coordinate with LandingIntro preloader ────────────────────────────
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
      tiltCleanups.forEach((fn) => fn());
      roleCardHandlers.forEach(([el, fn]) => el.removeEventListener("click", fn as EventListener));
      if (lenisInstance) lenisInstance.destroy();
      if (ctx) ctx.revert();
    };
  }, []);

  return null;
}
