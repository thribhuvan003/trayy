"use client";

import { useEffect } from "react";
import { motionTokens } from "@/lib/motionTokens";

const HERO_EASE = motionTokens.ease.hero;
const REVEAL_EASE = motionTokens.ease.reveal;
const MAGNET_MAX_PX = 8;

/**
 * GSAP ScrollTrigger for the marketing landing only.
 * Framer-inspired pass: expo hero, nav pill, portal shine, sync sequence, magnetic CTA, orb parallax.
 * No framer-motion on this route. Skips scrub/tilt on coarse pointer + narrow viewport.
 */
export function LandingMotion() {
  useEffect(() => {
    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";

    const root = document.querySelector<HTMLElement>(".tray-landing");
    if (!root) {
      return () => {
        html.style.scrollBehavior = prevScrollBehavior;
      };
    }

    const nav = root.querySelector<HTMLElement>(".tl-nav");
    const navLinksWrap = root.querySelector<HTMLElement>(".tl-nav-links");
    const navPill = root.querySelector<HTMLElement>(".tl-nav-pill");
    const progressBar = root.querySelector<HTMLElement>(".tl-scroll-progress");
    const ambientShift = root.querySelector<HTMLElement>(".tl-ambient-shift");
    const portalCleanups: Array<() => void> = [];
    const btnCleanups: Array<() => void> = [];
    const magneticCleanups: Array<() => void> = [];

    let ctxRevert: (() => void) | undefined;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const markReady = () => {
      root.classList.remove("tl-anim-init");
      root.classList.add("tl-motion-ready");
      if (readyTimer) {
        clearTimeout(readyTimer);
        readyTimer = undefined;
      }
    };

    const cleanup = () => {
      html.style.scrollBehavior = prevScrollBehavior;
      if (readyTimer) clearTimeout(readyTimer);
      ctxRevert?.();
      portalCleanups.forEach((fn) => fn());
      btnCleanups.forEach((fn) => fn());
      magneticCleanups.forEach((fn) => fn());
      nav?.classList.remove("is-scrolled", "is-scrolled-deep");
      navLinksWrap?.classList.remove("has-pill");
      root.querySelectorAll<HTMLElement>(".tl-portal").forEach((p) => {
        p.classList.remove("is-lift", "is-shine");
      });
      markReady();
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      markReady();
      return cleanup;
    }

    root.classList.add("tl-anim-init");
    readyTimer = setTimeout(markReady, 700);

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
        if (cancelled) return;

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });

        const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
        const narrowViewport = window.matchMedia("(max-width: 768px)").matches;
        const lightMotion = coarsePointer || narrowViewport;
        const finePointer = !coarsePointer;

        const moveNavPill = (activeLink: HTMLAnchorElement | null) => {
          if (!navPill || !navLinksWrap || !activeLink) return;
          const wrapRect = navLinksWrap.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          const left = linkRect.left - wrapRect.left;
          navLinksWrap.classList.add("has-pill");
          gsap.to(navPill, {
            x: left,
            width: linkRect.width,
            duration: 0.38,
            ease: "power3.out",
            overwrite: true,
          });
        };

        const ctx = gsap.context(() => {
          if (progressBar) {
            gsap.set(progressBar, { scaleX: 0, transformOrigin: "0% 50%" });
            ScrollTrigger.create({
              start: 0,
              end: "max",
              onUpdate: (self) => {
                gsap.to(progressBar, {
                  scaleX: self.progress,
                  duration: 0.15,
                  ease: "none",
                  overwrite: true,
                });
              },
            });
          }

          if (nav) {
            ScrollTrigger.create({
              start: "top -48",
              onEnter: () => nav.classList.add("is-scrolled"),
              onLeaveBack: () => {
                nav.classList.remove("is-scrolled", "is-scrolled-deep");
              },
            });
            ScrollTrigger.create({
              start: "top -140",
              onEnter: () => nav.classList.add("is-scrolled-deep"),
              onLeaveBack: () => nav.classList.remove("is-scrolled-deep"),
            });
          }

          const navLinks = root.querySelectorAll<HTMLAnchorElement>('.tl-nav-links a[href^="#"]');
          const spySections = ["#system", "#flow"]
            .map((id) => root.querySelector(id))
            .filter(Boolean) as HTMLElement[];

          if (navLinks.length && spySections.length) {
              spySections.forEach((section) => {
                ScrollTrigger.create({
                  trigger: section,
                  start: "top 55%",
                  end: "bottom 45%",
                  onToggle: (self) => {
                    const id = `#${(self.trigger as HTMLElement).id}`;
                    let active: HTMLAnchorElement | null = null;
                    navLinks.forEach((link) => {
                      const on = link.getAttribute("href") === id && self.isActive;
                      link.classList.toggle("is-active", on);
                      if (on) active = link;
                    });
                    if (self.isActive && active) moveNavPill(active);
                  },
                });
              });
            const initial = Array.from(navLinks).find((l) => l.classList.contains("is-active"));
            if (initial) moveNavPill(initial);
          }

          const heroTl = gsap.timeline({
            defaults: { ease: HERO_EASE },
            onComplete: markReady,
          });

          heroTl
            .from(".tray-landing .tl-hero-top", { y: 18, opacity: 0, duration: 0.65 })
            .from(
              ".tray-landing .tl-h1 .tl-word",
              { y: 48, opacity: 0, stagger: 0.055, duration: 0.95 },
              "-=0.38",
            )
            .from(".tray-landing .tl-hero-lede", { y: 22, opacity: 0, duration: 0.78 }, "-=0.52")
            .from(
              ".tray-landing .tl-hero-cta .tl-row .tl-btn",
              { y: 14, opacity: 0, scale: 0.92, stagger: 0.06, duration: 0.62 },
              "-=0.48",
            )
            .from(".tray-landing .tl-note", { opacity: 0, duration: 0.45 }, "-=0.38")
            .from(
              ".tray-landing .tl-hero-stat",
              { y: 24, opacity: 0, stagger: 0.07, duration: 0.68 },
              "-=0.34",
            );

          root.querySelectorAll<HTMLElement>(".tl-hero-stat[data-count]").forEach((stat, i) => {
            const target = Number(stat.dataset.count);
            const numEl = stat.querySelector<HTMLElement>(".tl-stat-num");
            if (!numEl || !Number.isFinite(target)) return;
            const counter = { val: 0 };
            heroTl.to(
              counter,
              {
                val: target,
                duration: 1.05,
                ease: "expo.out",
                onUpdate: () => {
                  numEl.textContent = String(Math.round(counter.val));
                },
              },
              i === 0 ? "-=0.42" : "<0.08",
            );
          });

          if (!lightMotion) {
            const glow = root.querySelector(".tl-hero-glow");
            if (glow) {
              gsap.to(glow, {
                y: 100,
                ease: "none",
                scrollTrigger: {
                  trigger: ".tray-landing .tl-hero",
                  start: "top top",
                  end: "bottom top",
                  scrub: 1.2,
                },
              });
            }

            root.querySelectorAll<HTMLElement>(".tl-orb").forEach((orb, i) => {
              gsap.to(orb, {
                y: i % 2 === 0 ? 120 : -90,
                x: i % 2 === 0 ? 40 : -30,
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  start: "top top",
                  end: "bottom bottom",
                  scrub: 1.4 + i * 0.2,
                },
              });
            });

            if (finePointer && ambientShift) {
              const onAmbientMove = (e: MouseEvent) => {
                const px = (e.clientX / window.innerWidth - 0.5) * 2;
                const py = (e.clientY / window.innerHeight - 0.5) * 2;
                gsap.to(ambientShift, {
                  x: px * 14,
                  y: py * 10,
                  duration: 1.15,
                  ease: "power2.out",
                  overwrite: "auto",
                });
              };
              window.addEventListener("mousemove", onAmbientMove, { passive: true });
              magneticCleanups.push(() => window.removeEventListener("mousemove", onAmbientMove));
            }
          }

          const sectionEnter = (
            trigger: string,
            targets: string,
            vars: gsap.TweenVars,
            start = "top 82%",
          ) => {
            const els = gsap.utils.toArray<HTMLElement>(targets);
            if (!els.length) return;
            gsap.set(els, { ...vars, immediateRender: false });
            ScrollTrigger.create({
              trigger,
              start,
              once: true,
              onEnter: () => {
                gsap.to(els, {
                  ...vars,
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                  rotateX: 0,
                  rotateY: 0,
                  rotate: 0,
                  clipPath: "inset(0% 0% 0% 0%)",
                  duration: vars.duration ?? 0.85,
                  stagger: vars.stagger ?? 0.08,
                  ease: vars.ease ?? REVEAL_EASE,
                  overwrite: "auto",
                });
              },
            });
          };

          sectionEnter("#system", "#system .tl-section-num", { opacity: 0, y: 12, duration: 0.5 });
          sectionEnter(
            "#system",
            "#system .tl-section-head h2",
            { opacity: 0, x: -48, rotateY: 8, duration: 0.9, ease: "power4.out" },
          );
          sectionEnter(
            "#system",
            "#system .tl-section-head .tl-side",
            { opacity: 0, x: 32, duration: 0.75 },
            "top 78%",
          );
          sectionEnter(
            "#system",
            "#system .tl-portal",
            {
              opacity: 0,
              y: 82,
              rotateX: 14,
              transformOrigin: "50% 100%",
              stagger: 0.16,
              duration: 1.05,
              ease: HERO_EASE,
            },
            "top 80%",
          );
          sectionEnter(
            "#system",
            "#system .tl-feat-tag",
            { opacity: 0, scale: 0.92, stagger: 0.04, duration: 0.45 },
            "top 75%",
          );

          sectionEnter(
            ".tl-sync",
            ".tl-sync .tl-section-num, .tl-sync h2, .tl-sync .tl-lede",
            { opacity: 0, y: 28, stagger: 0.1, duration: 0.8 },
          );
          sectionEnter(
            ".tl-sync",
            ".tl-sync .tl-sync-meta .tl-row",
            { opacity: 0, x: -24, stagger: 0.09, duration: 0.65 },
            "top 78%",
          );

          const diagram = root.querySelector(".tl-diagram");
          if (diagram) {
            const nodes = diagram.querySelectorAll<HTMLElement>(".tl-node");
            const arrs = diagram.querySelectorAll<HTMLElement>(".tl-arr");
            gsap.set(diagram, { scale: 0.96, opacity: 0 });
            nodes.forEach((node, i) => {
              gsap.set(node, { opacity: 0, y: 20, scale: 0.94 });
              const dot = node.querySelector(".tl-role");
              if (dot) gsap.set(dot, { scale: 0.85 });
            });
            arrs.forEach((arr) => {
              gsap.set(arr, { opacity: 0 });
              arr.querySelectorAll<HTMLElement>(".tl-line").forEach((line) => {
                gsap.set(line, { scaleX: 0, transformOrigin: "0% 50%" });
              });
            });

            ScrollTrigger.create({
              trigger: diagram,
              start: "top 85%",
              once: true,
              onEnter: () => {
                gsap.fromTo(
                  diagram,
                  { boxShadow: "0 0 0 0 rgba(196, 61, 47, 0)" },
                  {
                    scale: 1,
                    opacity: 1,
                    boxShadow:
                      "0 0 0 1px rgba(196, 61, 47, 0.14), 0 20px 48px rgba(26, 20, 14, 0.08)",
                    duration: 0.75,
                    ease: HERO_EASE,
                  },
                );
                const seq = gsap.timeline({ defaults: { ease: HERO_EASE } });
                nodes.forEach((node, i) => {
                  const offset = i * 0.14;
                  seq.to(
                    node,
                    { opacity: 1, y: 0, scale: 1, duration: 0.55 },
                    offset,
                  );
                  const role = node.querySelector(".tl-role");
                  if (role) {
                    seq.to(role, { scale: 1, duration: 0.45, ease: "back.out(2)" }, offset + 0.08);
                  }
                  const arr = arrs[i];
                  if (arr) {
                    seq.to(arr, { opacity: 1, duration: 0.25 }, offset + 0.1);
                    arr.querySelectorAll<HTMLElement>(".tl-line").forEach((line) => {
                      seq.to(line, { scaleX: 1, duration: 0.4, ease: "power2.out" }, offset + 0.12);
                    });
                    const pulseDot = arr.querySelector<HTMLElement>(".tl-dot");
                    if (pulseDot) {
                      seq.fromTo(
                        pulseDot,
                        { scale: 0.6, opacity: 0.35 },
                        { scale: 1.25, opacity: 1, duration: 0.35, ease: "power2.out" },
                        offset + 0.2,
                      );
                      seq.to(pulseDot, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.55)" }, offset + 0.38);
                    }
                  }
                });
              },
            });
          }

          sectionEnter(
            "#where",
            "#where .tl-line-leave-title, #where .tl-line-leave-lede",
            { opacity: 0, y: 32, stagger: 0.12, duration: 0.75 },
          );
          sectionEnter(
            "#where",
            "#where .tl-line-chip",
            {
              opacity: 0,
              scale: 0.85,
              y: 20,
              stagger: 0.09,
              duration: 0.6,
              ease: "back.out(1.75)",
            },
            "top 80%",
          );

          const pullP = root.querySelector(".tl-pull p");
          if (pullP) {
            const pullVars = narrowViewport
              ? { opacity: 0, y: 32 }
              : { opacity: 0, y: 36, scale: 0.98 };
            gsap.set(pullP, pullVars);
            ScrollTrigger.create({
              trigger: pullP,
              start: "top 80%",
              once: true,
              onEnter: () => {
                gsap.to(pullP, {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 1,
                  ease: HERO_EASE,
                });
              },
            });
          }
          sectionEnter(".tl-pull", ".tl-pull .tl-cite", { opacity: 0, y: 14, duration: 0.5 }, "top 72%");

          sectionEnter(
            "#flow",
            "#flow .tl-section-num, #flow .tl-section-head h2, #flow .tl-section-head .tl-side",
            { opacity: 0, y: 24, stagger: 0.1, duration: 0.75 },
          );
          root.querySelectorAll<HTMLElement>(".tl-flow-step").forEach((step, i) => {
            gsap.set(step, { opacity: 0, y: 40 + i * 4 });
            const num = step.querySelector(".tl-num");
            if (num) gsap.set(num, { rotate: -12, transformOrigin: "50% 100%" });
            ScrollTrigger.create({
              trigger: step,
              start: "top 88%",
              once: true,
              onEnter: () => {
                gsap.to(step, {
                  opacity: 1,
                  y: 0,
                  duration: 0.75,
                  ease: HERO_EASE,
                  delay: i * 0.05,
                });
                if (num) {
                  gsap.to(num, { rotate: 0, duration: 0.95, ease: "back.out(2)" });
                }
              },
            });
          });

          sectionEnter(
            "#stack",
            "#stack .tl-section-num, #stack .tl-section-head h2, #stack .tl-section-head .tl-side",
            { opacity: 0, y: 20, stagger: 0.08, duration: 0.7 },
          );
          sectionEnter(
            "#stack",
            "#stack .tl-stack-card",
            {
              opacity: 0,
              scale: 0.82,
              y: 24,
              stagger: { amount: 0.38, from: "center" },
              duration: 0.7,
              ease: "back.out(1.45)",
            },
            "top 82%",
          );

          if (!lightMotion) {
            root
              .querySelectorAll<HTMLElement>(
                ".tl-section-head h2, .tl-sync-grid h2, .tl-pull p",
              )
              .forEach((heading) => {
                gsap.fromTo(
                  heading,
                  { y: 28 },
                  {
                    y: -12,
                    ease: "none",
                    scrollTrigger: {
                      trigger: heading,
                      start: "top bottom",
                      end: "bottom top",
                      scrub: 1.4,
                    },
                  },
                );
              });
          }

          const closing = root.querySelector(".tl-closing");
          if (closing) {
            gsap.set(closing.querySelector("h2"), { opacity: 0, y: 48, scale: 0.96 });
            gsap.set(closing.querySelector("p"), { opacity: 0, y: 24 });
            ScrollTrigger.create({
              trigger: closing,
              start: "top 78%",
              once: true,
              onEnter: () => {
                const tl = gsap.timeline({ defaults: { ease: HERO_EASE } });
                tl.to(closing.querySelector("h2"), {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  duration: 1,
                }).to(
                  closing.querySelector("p"),
                  { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
                  "-=0.55",
                );
                tl.from(
                  closing.querySelectorAll(".tl-btn"),
                  { opacity: 0, y: 18, stagger: 0.07, duration: 0.55, ease: "power2.out" },
                  "-=0.35",
                );
              },
            });
          }

          sectionEnter(
            ".tl-footer",
            ".tl-footer-row1 > *",
            { opacity: 0, y: 18, stagger: 0.06, duration: 0.6 },
            "top 90%",
          );

          if (finePointer) {
            root.querySelectorAll<HTMLElement>(".tl-portal").forEach((portal) => {
              const chrome = portal.querySelector<HTMLElement>(".tl-browser-chrome");
              const quickY = gsap.quickTo(portal, "y", { duration: 0.35, ease: "power3.out" });
              const onEnter = () => {
                portal.classList.add("is-lift", "is-shine");
                quickY(-10);
                if (chrome) {
                  gsap.to(chrome, {
                    rotateY: 0,
                    rotateX: 0,
                    duration: 0.4,
                    ease: "power2.out",
                  });
                }
              };
              const onMove = (e: MouseEvent) => {
                const rect = portal.getBoundingClientRect();
                const spotX = ((e.clientX - rect.left) / rect.width) * 100;
                const spotY = ((e.clientY - rect.top) / rect.height) * 100;
                portal.style.setProperty("--spot-x", `${spotX}%`);
                portal.style.setProperty("--spot-y", `${spotY}%`);
                if (!chrome) return;
                const px = (e.clientX - rect.left) / rect.width - 0.5;
                const py = (e.clientY - rect.top) / rect.height - 0.5;
                gsap.to(chrome, {
                  rotateY: px * 9,
                  rotateX: -py * 6,
                  duration: 0.35,
                  ease: "power2.out",
                  overwrite: "auto",
                });
              };
              const onLeave = () => {
                portal.classList.remove("is-lift", "is-shine");
                quickY(0);
                if (chrome) {
                  gsap.to(chrome, {
                    rotateY: 0,
                    rotateX: 0,
                    duration: 0.55,
                    ease: "power3.out",
                  });
                }
              };
              portal.addEventListener("mouseenter", onEnter);
              portal.addEventListener("mousemove", onMove);
              portal.addEventListener("mouseleave", onLeave);
              portalCleanups.push(() => {
                portal.removeEventListener("mouseenter", onEnter);
                portal.removeEventListener("mousemove", onMove);
                portal.removeEventListener("mouseleave", onLeave);
                portal.classList.remove("is-lift", "is-shine");
              });
            });

            root.querySelectorAll<HTMLElement>(".tl-btn").forEach((btn) => {
              const onEnter = () =>
                gsap.to(btn, {
                  scale: 1.03,
                  y: -1,
                  boxShadow: btn.classList.contains("tl-btn-pri")
                    ? "inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 10px 28px rgba(26, 20, 14, 0.12)"
                    : "0 6px 18px rgba(26, 20, 14, 0.08)",
                  duration: 0.22,
                  ease: "power2.out",
                });
              const onLeave = () =>
                gsap.to(btn, {
                  scale: 1,
                  y: 0,
                  clearProps: "boxShadow",
                  duration: 0.28,
                  ease: "power2.out",
                });
              const onDown = () => gsap.to(btn, { scale: 0.97, y: 0, duration: 0.08 });
              const onUp = () => gsap.to(btn, { scale: 1.03, y: -1, duration: 0.15 });
              btn.addEventListener("mouseenter", onEnter);
              btn.addEventListener("mouseleave", onLeave);
              btn.addEventListener("mousedown", onDown);
              btn.addEventListener("mouseup", onUp);
              btnCleanups.push(() => {
                btn.removeEventListener("mouseenter", onEnter);
                btn.removeEventListener("mouseleave", onLeave);
                btn.removeEventListener("mousedown", onDown);
                btn.removeEventListener("mouseup", onUp);
              });
            });

            const bindMagnetic = (btn: HTMLElement) => {
              const qx = gsap.quickTo(btn, "x", { duration: 0.38, ease: motionTokens.ease.nav });
              const qy = gsap.quickTo(btn, "y", { duration: 0.38, ease: motionTokens.ease.nav });
              gsap.set(btn, { x: 0, y: 0 });
              const onMagMove = (e: MouseEvent) => {
                const rect = btn.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = ((e.clientX - cx) / rect.width) * MAGNET_MAX_PX * 2;
                const dy = ((e.clientY - cy) / rect.height) * MAGNET_MAX_PX * 2;
                qx(Math.max(-MAGNET_MAX_PX, Math.min(MAGNET_MAX_PX, dx)));
                qy(Math.max(-MAGNET_MAX_PX, Math.min(MAGNET_MAX_PX, dy)));
              };
              const onMagLeave = () => {
                qx(0);
                qy(0);
              };
              btn.addEventListener("mousemove", onMagMove);
              btn.addEventListener("mouseleave", onMagLeave);
              magneticCleanups.push(() => {
                btn.removeEventListener("mousemove", onMagMove);
                btn.removeEventListener("mouseleave", onMagLeave);
                gsap.set(btn, { clearProps: "x,y" });
              });
            };
            root.querySelectorAll<HTMLElement>(".tl-btn-pri[data-magnetic]").forEach(bindMagnetic);
          }
        }, root);

        ctxRevert = () => ctx.revert();

        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
        if (!cancelled) {
          requestAnimationFrame(() => ScrollTrigger.refresh());
          setTimeout(() => ScrollTrigger.refresh(), 150);
        }
      } catch (err) {
        console.error("[LandingMotion] GSAP failed:", err);
        markReady();
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
