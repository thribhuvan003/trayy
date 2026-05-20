"use client";

import { useEffect } from "react";
import { motionTokens } from "@/lib/motionTokens";

const HERO_EASE = motionTokens.ease.hero;
const REVEAL_EASE = motionTokens.ease.reveal;
const MAGNET_MAX_PX = 8;

type GsapAPI = (typeof import("gsap"))["gsap"];

/** Sections that participate in same-page hash nav + arrival (see scroll-margin in landing-page). */
const LANDING_HASH_IDS = new Set(["system", "sync", "pull", "where", "flow", "stack"]);

/** Matches `--tl-scroll-anchor` in landing-page SCOPED_CSS (+ small breathing room). */
const SCROLL_ANCHOR_MIN_PX = 96;

/** Selectors GSAP may pre-offset before scroll reveal; snap on hash arrival. */
const SECTION_REVEAL_SNAP_SELECTOR = [
  ".tl-section-num",
  ".tl-section-head",
  ".tl-section-head h2",
  ".tl-section-head .tl-side",
  ".tl-portal-phase-strip",
  ".tl-portal",
  ".tl-sync-copy",
  ".tl-diagram",
  ".tl-sync-grid > *",
  ".tl-diagram .tl-node",
  ".tl-diagram .tl-arr",
  ".tl-line-leave-grid > *",
  ".tl-line-chip",
  ".tl-pull-quote p",
  ".tl-cite",
  ".tl-flow-step",
  ".tl-stack-card",
  ".tl-feat-tag",
  ".tl-closing h2",
  ".tl-closing p",
  ".tl-closing .tl-btn",
].join(",");

function getScrollAnchorOffset(root: HTMLElement): number {
  const nav = root.querySelector<HTMLElement>(".tl-nav");
  const measured = nav?.getBoundingClientRect().height ?? SCROLL_ANCHOR_MIN_PX;
  return Math.max(SCROLL_ANCHOR_MIN_PX, Math.round(measured + 6));
}

function scrollLandingSectionTo(
  target: HTMLElement,
  root: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const offset = getScrollAnchorOffset(root);
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior });
}

function snapSectionRevealState(gsap: GsapAPI, section: HTMLElement) {
  gsap.killTweensOf(section);
  const ring = section.querySelector(".tl-arrival-ring");
  if (ring) gsap.killTweensOf(ring);
  const nodes = section.querySelectorAll<HTMLElement>(SECTION_REVEAL_SNAP_SELECTOR);
  if (nodes.length) gsap.killTweensOf(nodes);
  innerArrivalTargets(section).forEach((el) => gsap.killTweensOf(el));
  gsap.set(section, { clearProps: "transform,scale" });
  if (nodes.length) {
    gsap.set(nodes, {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      rotateX: 0,
      skewX: 0,
      clipPath: "inset(0% 0% 0% 0%)",
      filter: "none",
      clearProps: "transform",
    });
  }
}

function withRevealCleanup(
  gsap: GsapAPI,
  targets: gsap.TweenTarget,
  vars: gsap.TweenVars,
) {
  const userComplete = vars.onComplete;
  return gsap.to(targets, {
    ...vars,
    onComplete: function (this: gsap.core.Tween) {
      gsap.set(targets, { clearProps: "transform,clipPath,filter" });
      userComplete?.call(this);
    },
  });
}

function landingHashTarget(root: HTMLElement, rawHref: string | null): HTMLElement | null {
  if (!rawHref || !rawHref.startsWith("#") || rawHref === "#" || rawHref === "#main") return null;
  const id = rawHref.slice(1);
  if (!LANDING_HASH_IDS.has(id)) return null;
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement) || !root.contains(el)) return null;
  return el;
}

function ensureArrivalRing(section: HTMLElement): HTMLElement {
  const existing = section.querySelector(":scope > .tl-arrival-ring");
  if (existing instanceof HTMLElement) return existing;
  const ring = document.createElement("div");
  ring.className = "tl-arrival-ring";
  ring.setAttribute("aria-hidden", "true");
  section.prepend(ring);
  return ring;
}

function innerArrivalTargets(section: HTMLElement): HTMLElement[] {
  const id = section.id;
  let sel = "";
  if (id === "system") sel = ":scope .tl-portal";
  else if (id === "flow") sel = ":scope .tl-flow-step";
  else if (id === "stack") sel = ":scope .tl-stack-card";
  if (!sel) return [];
  return Array.from(section.querySelectorAll<HTMLElement>(sel));
}

function playLandingArrival(gsap: GsapAPI, section: HTMLElement, mode: "full" | "soft") {
  snapSectionRevealState(gsap, section);
  const ring = ensureArrivalRing(section);
  gsap.killTweensOf(ring);

  const inner = mode === "full" ? innerArrivalTargets(section) : [];
  inner.forEach((el) => gsap.killTweensOf(el));

  const ringIn = mode === "soft" ? 0.1 : 0.14;
  const ringOut = mode === "soft" ? 0.22 : 0.3;
  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: () => {
      gsap.set(ring, { clearProps: "transform" });
      if (inner.length) gsap.set(inner, { clearProps: "transform" });
    },
  });

  tl.fromTo(ring, { opacity: 0, scale: 0.992 }, { opacity: 1, scale: 1, duration: ringIn }, 0).to(
    ring,
    { opacity: 0, scale: 1, duration: ringOut, ease: "power2.inOut" },
    ringIn * 0.35,
  );

  if (inner.length) {
    tl.fromTo(
      inner,
      { y: 8 },
      {
        y: 0,
        duration: 0.22,
        stagger: 0.04,
        ease: "power2.out",
        overwrite: "auto",
      },
      0.04,
    );
  }
}

function reducedMotionArrivalFlash(target: HTMLElement) {
  const anim = target.animate([{ opacity: 0.92 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
  anim.onfinish = () => anim.cancel();
}

function installLandingHashNav(
  root: HTMLElement,
  gsap: GsapAPI | null,
  opts: { reduced: boolean; isCancelled: () => boolean },
): () => void {
  let settleCtl: AbortController | null = null;
  let settleTimer: number | undefined;

  const cancelPendingSettle = () => {
    settleCtl?.abort();
    settleCtl = null;
    if (settleTimer !== undefined) {
      window.clearTimeout(settleTimer);
      settleTimer = undefined;
    }
  };

  const scheduleAfterScroll = (target: HTMLElement, mode: "full" | "soft") => {
    cancelPendingSettle();
    settleCtl = new AbortController();
    const { signal } = settleCtl;
    let done = false;
    const run = () => {
      if (done || signal.aborted || opts.isCancelled()) return;
      done = true;
      cancelPendingSettle();
      if (opts.reduced) reducedMotionArrivalFlash(target);
      else if (gsap) playLandingArrival(gsap, target, mode);
    };
    window.addEventListener("scrollend", run, { signal, once: true });
    settleTimer = window.setTimeout(run, 640);
  };

  const onClickCapture = (e: MouseEvent) => {
    if (opts.isCancelled()) return;
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
    if (!a || !(a instanceof HTMLAnchorElement)) return;
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!root.contains(a)) return;

    const href = a.getAttribute("href");
    const target = landingHashTarget(root, href);
    if (!target) return;

    e.preventDefault();
    window.history.pushState(null, "", href);
    if (gsap) snapSectionRevealState(gsap, target);
    scrollLandingSectionTo(target, root, "smooth");
    scheduleAfterScroll(target, "full");
  };

  root.addEventListener("click", onClickCapture, { capture: true });

  return () => {
    cancelPendingSettle();
    root.removeEventListener("click", onClickCapture, { capture: true });
  };
}

function scheduleInitialHashArrival(
  root: HTMLElement,
  gsap: GsapAPI | null,
  opts: { reduced: boolean; isCancelled: () => boolean },
): () => void {
  const hash = window.location.hash;
  if (!hash) return () => {};
  const target = landingHashTarget(root, hash);
  if (!target) return () => {};

  if (gsap) snapSectionRevealState(gsap, target);
  scrollLandingSectionTo(target, root, "auto");

  let played = false;
  const tryPlay = () => {
    if (opts.isCancelled() || played) return;
    const r = target.getBoundingClientRect();
    const visible = r.top < window.innerHeight - 48 && r.bottom > 96;
    if (!visible) return;
    played = true;
    if (opts.reduced) reducedMotionArrivalFlash(target);
    else if (gsap) playLandingArrival(gsap, target, "soft");
  };

  const onScrollEnd = () => tryPlay();
  window.addEventListener("scrollend", onScrollEnd, { once: true });
  const tEarly = window.setTimeout(tryPlay, 220);
  const tLate = window.setTimeout(() => {
    tryPlay();
    window.removeEventListener("scrollend", onScrollEnd);
  }, 900);

  return () => {
    window.removeEventListener("scrollend", onScrollEnd);
    window.clearTimeout(tEarly);
    window.clearTimeout(tLate);
  };
}


/**
 * GSAP ScrollTrigger for the marketing landing only.
 * Framer-inspired pass: expo hero, nav pill, portal lift/tilt, sync sequence, magnetic CTA, orb parallax.
 * No framer-motion on this route. Skips scrub/tilt on coarse pointer + narrow viewport.
 */
export function LandingMotion() {
  useEffect(() => {
    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    const prevScrollPaddingTop = html.style.scrollPaddingTop;
    html.style.scrollBehavior = "smooth";

    const root = document.querySelector<HTMLElement>(".tray-landing");
    if (!root) {
      return () => {
        html.style.scrollBehavior = prevScrollBehavior;
        html.style.scrollPaddingTop = prevScrollPaddingTop;
      };
    }

    html.style.scrollPaddingTop = `${getScrollAnchorOffset(root)}px`;

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
    let hashNavCleanup: (() => void) | undefined;
    let initialHashCleanup: (() => void) | undefined;
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
      html.style.scrollPaddingTop = prevScrollPaddingTop;
      if (readyTimer) clearTimeout(readyTimer);
      hashNavCleanup?.();
      hashNavCleanup = undefined;
      initialHashCleanup?.();
      initialHashCleanup = undefined;
      ctxRevert?.();
      portalCleanups.forEach((fn) => fn());
      btnCleanups.forEach((fn) => fn());
      magneticCleanups.forEach((fn) => fn());
      nav?.classList.remove("is-scrolled", "is-scrolled-deep");
      navLinksWrap?.classList.remove("has-pill");
      root.querySelectorAll<HTMLElement>(".tl-portal").forEach((p) => {
        p.classList.remove("is-lift");
      });
      markReady();
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      markReady();
      (async () => {
        try {
          const [{ gsap }, { ScrollTrigger }] = await Promise.all([
            import("gsap"),
            import("gsap/ScrollTrigger"),
          ]);
          if (cancelled) return;
          gsap.registerPlugin(ScrollTrigger);
          ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });

          const prmCtx = gsap.context(() => {
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
            const moveNavPill = (activeLink: HTMLAnchorElement | null) => {
              if (!navPill || !navLinksWrap || !activeLink) return;
              const wrapRect = navLinksWrap.getBoundingClientRect();
              const linkRect = activeLink.getBoundingClientRect();
              const left = linkRect.left - wrapRect.left;
              navLinksWrap.classList.add("has-pill");
              gsap.set(navPill, { width: linkRect.width });
              gsap.to(navPill, {
                x: left,
                opacity: 1,
                duration: 0.38,
                ease: "power3.out",
                overwrite: true,
              });
            };
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

            const fadeSections = [
              "#system",
              "#sync",
              "#where",
              "#pull",
              "#flow",
              "#stack",
              ".tl-closing",
              ".tl-footer",
            ] as const;
            fadeSections.forEach((sel) => {
              const el = root.querySelector<HTMLElement>(sel);
              if (!el) return;
              gsap.set(el, { autoAlpha: 0 });
              ScrollTrigger.create({
                trigger: el,
                start: "top 90%",
                once: true,
                onEnter: () => {
                  gsap.to(el, { autoAlpha: 1, duration: 0.42, ease: "power1.out" });
                },
              });
            });
          }, root);

          if (cancelled) return;
          ctxRevert = () => prmCtx.revert();

          if (document.fonts?.ready) {
            await document.fonts.ready;
          }
          if (!cancelled) {
            requestAnimationFrame(() => ScrollTrigger.refresh());
            setTimeout(() => ScrollTrigger.refresh(), 150);
            hashNavCleanup = installLandingHashNav(root, gsap, {
              reduced: true,
              isCancelled: () => cancelled,
            });
            initialHashCleanup = scheduleInitialHashArrival(root, gsap, {
              reduced: true,
              isCancelled: () => cancelled,
            });
          }
        } catch (err) {
          console.error("[LandingMotion] GSAP (reduced) failed:", err);
        }
      })();
      return () => {
        cancelled = true;
        cleanup();
      };
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
          gsap.set(navPill, { width: linkRect.width });
          gsap.to(navPill, {
            x: left,
            opacity: 1,
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
              {
                y: 40,
                opacity: 0,
                clipPath: "inset(100% 0% 0% 0%)",
                stagger: { each: 0.048, from: "start" },
                duration: 0.88,
                ease: "power3.out",
              },
              "-=0.38",
            )
            .from(".tray-landing .tl-hero-lede", { y: 22, opacity: 0, duration: 0.78 }, "-=0.52")
            .from(
              ".tray-landing .tl-hero-cta .tl-row .tl-btn",
              { y: 14, opacity: 0, stagger: 0.07, duration: 0.62, ease: "power3.out" },
              "-=0.48",
            )
            .from(".tray-landing .tl-note", { opacity: 0, duration: 0.45 }, "-=0.38")
            .from(".tray-landing .tl-trust", { opacity: 0, y: 6, duration: 0.42 }, "-=0.28")
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

          const ticker = root.querySelector<HTMLElement>(".tl-ticker[data-tl-scroll='1']");
          const tickerItems = ticker?.querySelectorAll<HTMLElement>(".tl-ticker-item");
          if (ticker && tickerItems?.length) {
            ScrollTrigger.create({
              trigger: ticker,
              start: "top 88%",
              once: true,
              onEnter: () => {
                gsap.to(tickerItems, {
                  opacity: 1,
                  y: 0,
                  stagger: { each: 0.032, from: "center" },
                  duration: 0.68,
                  ease: REVEAL_EASE,
                  overwrite: "auto",
                  onComplete: () => {
                    ticker.classList.add("tl-ticker-revealed");
                    gsap.set(tickerItems, { clearProps: "transform" });
                  },
                });
              },
            });
          }

          if (!lightMotion) {
            const glow = root.querySelector(".tl-hero-glow");
            if (glow) {
              gsap.to(glow, {
                y: 72,
                ease: "none",
                scrollTrigger: {
                  trigger: ".tray-landing .tl-hero",
                  start: "top top",
                  end: "bottom top",
                  scrub: 0.95,
                },
              });
            }

            const heroRibbon = root.querySelector<HTMLElement>(".tl-hero-ribbon");
            const syncRibbon = root.querySelector<HTMLElement>(".tl-queue-ribbon");
            [heroRibbon, syncRibbon].forEach((ribbon) => {
              if (!ribbon) return;
              gsap.fromTo(
                ribbon,
                { x: -28, opacity: 0.35 },
                {
                  x: 24,
                  opacity: 0.75,
                  ease: "none",
                  scrollTrigger: {
                    trigger: ribbon.closest(".tl-hero, .tl-sync") ?? ribbon,
                    start: "top 90%",
                    end: "bottom 20%",
                    scrub: 1,
                  },
                },
              );
            });

            const heroStats = root.querySelector<HTMLElement>(".tl-hero-stats");
            if (heroStats) {
              gsap.to(heroStats, {
                y: -32,
                ease: "none",
                scrollTrigger: {
                  trigger: ".tray-landing .tl-hero",
                  start: "top top",
                  end: "bottom top",
                  scrub: 0.72,
                },
              });
            }

            root.querySelectorAll<HTMLElement>(".tl-orb").forEach((orb, i) => {
              gsap.to(orb, {
                y: i % 2 === 0 ? 72 : -56,
                x: i % 2 === 0 ? 28 : -22,
                ease: "none",
                scrollTrigger: {
                  trigger: root,
                  start: "top top",
                  end: "bottom bottom",
                  scrub: 1.1 + i * 0.15,
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

          // Below-fold: distinct scroll enters (A–F cycle; adjacent sections use different primaries).
          const clipBottom = "inset(86% 0% 0% 0%)";
          const clipOpen = "inset(0% 0% 0% 0%)";

          const systemReveal = gsap.utils.toArray<HTMLElement>(
            "#system .tl-section-num, #system .tl-section-head, #system .tl-portal-phase-strip, #system .tl-portal",
          );
          if (systemReveal.length) {
            gsap.set(systemReveal, {
              opacity: 0.55,
              clipPath: clipBottom,
              transformOrigin: "50% 0%",
            });
            ScrollTrigger.create({
              trigger: "#system",
              start: "top 82%",
              once: true,
              onEnter: () => {
                withRevealCleanup(gsap, systemReveal, {
                  opacity: 1,
                  clipPath: clipOpen,
                  duration: 0.82,
                  stagger: 0.11,
                  ease: "power3.out",
                });
              },
            });
          }

          const systemTags = gsap.utils.toArray<HTMLElement>("#system .tl-feat-tag");
          if (systemTags.length) {
            gsap.set(systemTags, { opacity: 0, y: 10 });
            ScrollTrigger.create({
              trigger: "#system",
              start: "top 74%",
              once: true,
              onEnter: () =>
                withRevealCleanup(gsap, systemTags, {
                  opacity: 1,
                  y: 0,
                  stagger: 0.045,
                  duration: 0.44,
                  ease: "power2.out",
                }),
            });
          }

          const syncSection = root.querySelector<HTMLElement>(".tl-sync");
          const syncNum = syncSection?.querySelector<HTMLElement>(".tl-section-num");
          const syncHead = syncSection?.querySelector<HTMLElement>(".tl-sync-copy");
          const syncDiagram = syncSection?.querySelector<HTMLElement>(".tl-diagram");
          const syncReveal = [syncNum, syncHead, syncDiagram].filter(Boolean) as HTMLElement[];
          if (syncSection && syncReveal.length) {
            gsap.set(syncReveal, { opacity: 0, y: 16 });
            const diagramBits = syncDiagram
              ? (gsap.utils.toArray(
                  syncDiagram.querySelectorAll<HTMLElement>(".tl-node, .tl-arr"),
                ) as HTMLElement[])
              : [];
            if (diagramBits.length) gsap.set(diagramBits, { opacity: 0, y: 14 });
            ScrollTrigger.create({
              trigger: syncSection,
              start: "top 84%",
              once: true,
              onEnter: () => {
                const tl = gsap.timeline({
                  defaults: { ease: REVEAL_EASE },
                  onComplete: () => {
                    gsap.set(syncReveal, { clearProps: "transform" });
                    if (diagramBits.length) gsap.set(diagramBits, { clearProps: "transform" });
                  },
                });
                tl.to(syncReveal, { opacity: 1, y: 0, stagger: 0.08, duration: 0.68 });
                if (diagramBits.length) {
                  tl.to(
                    diagramBits,
                    { opacity: 1, y: 0, stagger: 0.08, duration: 0.55 },
                    "-=0.38",
                  );
                }
              },
            });
          }

          const where = root.querySelector<HTMLElement>("#where");
          if (where) {
            const cols = where.querySelectorAll<HTMLElement>(".tl-line-leave-grid > div");
            cols.forEach((col, i) => {
              gsap.set(col, {
                opacity: 0,
                rotateX: i === 0 ? 7 : -7,
                skewX: i === 0 ? 3 : -3,
                transformOrigin: "50% 50%",
                force3D: true,
              });
            });
            const chips = where.querySelectorAll<HTMLElement>(".tl-line-chip");
            gsap.set(chips, { opacity: 0, y: 12 });
            ScrollTrigger.create({
              trigger: where,
              start: "top 84%",
              once: true,
              onEnter: () => {
                withRevealCleanup(gsap, cols, {
                  opacity: 1,
                  rotateX: 0,
                  skewX: 0,
                  duration: 0.78,
                  stagger: 0.14,
                  ease: "power3.out",
                });
                withRevealCleanup(gsap, chips, {
                  opacity: 1,
                  y: 0,
                  duration: 0.55,
                  stagger: 0.07,
                  delay: 0.12,
                  ease: "power2.out",
                });
              },
            });
          }

          const pull = root.querySelector<HTMLElement>("#pull");
          if (pull) {
            const pullText = pull.querySelector<HTMLElement>("p");
            const cite = pull.querySelector<HTMLElement>(".tl-cite");
            if (pullText) {
              gsap.set(pullText, {
                opacity: 0,
                y: 14,
                transformOrigin: "50% 50%",
              });
            }
            if (cite) gsap.set(cite, { opacity: 0, y: 10 });
            ScrollTrigger.create({
              trigger: pull,
              start: "top 80%",
              once: true,
              onEnter: () => {
                if (pullText) {
                  withRevealCleanup(gsap, pullText, {
                    opacity: 1,
                    y: 0,
                    duration: 0.78,
                    ease: "power3.out",
                  });
                }
                if (cite) {
                  withRevealCleanup(gsap, cite, {
                    opacity: 1,
                    y: 0,
                    duration: 0.45,
                    ease: "power2.out",
                    delay: 0.18,
                  });
                }
              },
            });
          }

          const flowAccent = root.querySelector<HTMLElement>(".tl-flow-accent");
          if (flowAccent && !lightMotion) {
            gsap.set(flowAccent, { scaleX: 0, transformOrigin: "0% 50%" });
            ScrollTrigger.create({
              trigger: flowAccent,
              start: "top 92%",
              end: "top 40%",
              scrub: 1.05,
              onUpdate: (self) => {
                gsap.set(flowAccent, { scaleX: self.progress });
              },
            });
          }

          const flow = root.querySelector<HTMLElement>("#flow");
          if (flow) {
            const fNum = flow.querySelector<HTMLElement>(".tl-section-num");
            const fH2 = flow.querySelector<HTMLElement>(".tl-section-head h2");
            const fSide = flow.querySelector<HTMLElement>(".tl-section-head .tl-side");
            const headEls = [fNum, fH2, fSide].filter(Boolean) as HTMLElement[];
            headEls.forEach((el, i) => {
              gsap.set(el, { opacity: 0, x: i % 2 === 0 ? -34 : 30 });
            });
            ScrollTrigger.create({
              trigger: flow,
              start: "top 86%",
              once: true,
              onEnter: () => {
                withRevealCleanup(gsap, headEls, {
                  opacity: 1,
                  x: 0,
                  duration: 0.72,
                  stagger: 0.1,
                  ease: "power3.out",
                });
              },
            });

            flow.querySelectorAll<HTMLElement>(".tl-flow-step").forEach((step, i) => {
              const fromX = i % 2 === 0 ? -44 : 44;
              gsap.set(step, { opacity: 0, x: fromX });
              ScrollTrigger.create({
                trigger: step,
                start: "top 88%",
                once: true,
                onEnter: () => {
                  withRevealCleanup(gsap, step, {
                    opacity: 1,
                    x: 0,
                    duration: 0.72,
                    ease: "power3.out",
                    delay: i * 0.05,
                  });
                },
              });
            });
          }

          const stack = root.querySelector<HTMLElement>("#stack");
          if (stack) {
            const sNum = stack.querySelector<HTMLElement>(".tl-section-num");
            const sSide = stack.querySelector<HTMLElement>(".tl-section-head .tl-side");
            const lineLead = stack.querySelector<HTMLElement>(".tl-anim-stack-line");
            const lineIt = stack.querySelector<HTMLElement>(".tl-section-head h2 .tl-it");
            const cards = stack.querySelectorAll<HTMLElement>(".tl-stack-card");
            [sNum, sSide, lineLead, lineIt].forEach((el) => {
              if (el) gsap.set(el, { opacity: 0, y: 22 });
            });
            gsap.set(cards, { opacity: 0, y: 18 });
            ScrollTrigger.create({
              trigger: stack,
              start: "top 84%",
              once: true,
              onEnter: () => {
                const tl = gsap.timeline({
                  defaults: { ease: HERO_EASE },
                  onComplete: () => {
                    gsap.set([sNum, sSide, lineLead, lineIt, ...Array.from(cards)].filter(Boolean), {
                      clearProps: "transform",
                    });
                  },
                });
                if (sNum) tl.to(sNum, { opacity: 1, y: 0, duration: 0.52 });
                if (lineLead) tl.to(lineLead, { opacity: 1, y: 0, duration: 0.52 }, "-=0.22");
                if (lineIt) tl.to(lineIt, { opacity: 1, y: 0, duration: 0.52 }, "-=0.38");
                if (sSide) tl.to(sSide, { opacity: 1, y: 0, duration: 0.62 }, "-=0.32");
                tl.to(
                  cards,
                  {
                    opacity: 1,
                    y: 0,
                    stagger: { each: 0.055, from: "start" },
                    duration: 0.58,
                  },
                  "-=0.36",
                );
              },
            });
          }

          const closing = root.querySelector<HTMLElement>(".tl-closing");
          if (closing) {
            const closingNum = closing.querySelector<HTMLElement>(".tl-section-num");
            const closingH2 = closing.querySelector<HTMLElement>("h2");
            const closingP = closing.querySelector<HTMLElement>("p");
            const closingCtas = closing.querySelectorAll<HTMLElement>(".tl-btn");
            if (closingNum) gsap.set(closingNum, { opacity: 0, y: 16 });
            if (closingH2) {
              gsap.set(closingH2, {
                opacity: 0,
                y: 36,
                scale: 0.94,
                transformOrigin: "50% 50%",
              });
            }
            if (closingP) gsap.set(closingP, { opacity: 0, y: 20 });
            gsap.set(closingCtas, { opacity: 0, y: 14 });
            ScrollTrigger.create({
              trigger: closing,
              start: "top 78%",
              once: true,
              onEnter: () => {
                const tl = gsap.timeline({
                  defaults: { ease: HERO_EASE },
                  onComplete: () => {
                    gsap.set(
                      [closingNum, closingH2, closingP, ...Array.from(closingCtas)].filter(Boolean),
                      { clearProps: "transform,filter" },
                    );
                  },
                });
                if (closingNum) tl.to(closingNum, { opacity: 1, y: 0, duration: 0.48, ease: "power3.out" });
                if (closingH2) {
                  tl.to(
                    closingH2,
                    { opacity: 1, y: 0, scale: 1, duration: 0.95 },
                    closingNum ? "-=0.18" : 0,
                  );
                }
                if (closingP) {
                  tl.to(
                    closingP,
                    { opacity: 1, y: 0, duration: 0.65, ease: "power2.out" },
                    closingH2 ? "-=0.52" : 0,
                  );
                }
                tl.to(
                  closingCtas,
                  { opacity: 1, y: 0, stagger: 0.07, duration: 0.52, ease: "power2.out" },
                  "-=0.32",
                );
              },
            });
          }

          const footer = root.querySelector<HTMLElement>(".tl-footer");
          if (footer) {
            const rowKids = footer.querySelectorAll<HTMLElement>(".tl-footer-row1 > *");
            gsap.set(rowKids, { opacity: 0, y: 18 });
            ScrollTrigger.create({
              trigger: footer,
              start: "top 92%",
              once: true,
              onEnter: () =>
                gsap.to(rowKids, {
                  opacity: 1,
                  y: 0,
                  stagger: 0.07,
                  duration: 0.62,
                  ease: "power2.out",
                }),
            });
          }

          const footerMark = root.querySelector<HTMLElement>(".tl-footer-mark");
          if (footerMark) {
            const footerChars = footerMark.querySelectorAll<HTMLElement>("[data-tl-footer-char]");
            gsap.set(footerMark, { opacity: 0, scale: 0.94, transformOrigin: "50% 50%" });
            if (footerChars.length) {
              gsap.set(footerChars, {
                y: 56,
                opacity: 0,
                rotateX: -18,
                transformOrigin: "50% 100%",
              });
            }
            ScrollTrigger.create({
              trigger: footerMark,
              start: "top 94%",
              once: true,
              onEnter: () => {
                const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
                tl.to(footerMark, { opacity: 1, scale: 1, duration: 0.88 }, 0);
                if (footerChars.length) {
                  tl.to(
                    footerChars,
                    {
                      y: 0,
                      opacity: 1,
                      rotateX: 0,
                      duration: 0.72,
                      stagger: 0.055,
                      ease: "power3.out",
                    },
                    0.06,
                  );
                }
              },
            });
          }

          if (finePointer) {
            root.querySelectorAll<HTMLElement>(".tl-portal").forEach((portal) => {
              const chrome = portal.querySelector<HTMLElement>(".tl-browser-chrome");
              const quickY = gsap.quickTo(portal, "y", { duration: 0.2, ease: "power4.out" });
              const onEnter = () => {
                portal.classList.add("is-lift");
                quickY(-18);
                if (chrome) {
                  gsap.to(chrome, {
                    scale: 1.02,
                    rotateY: 0,
                    rotateX: 0,
                    duration: 0.24,
                    ease: "power4.out",
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
                  rotateY: px * 11,
                  rotateX: -py * 7,
                  duration: 0.22,
                  ease: "power4.out",
                  overwrite: "auto",
                });
              };
              const onLeave = () => {
                portal.classList.remove("is-lift");
                quickY(0);
                if (chrome) {
                  gsap.to(chrome, {
                    scale: 1,
                    rotateY: 0,
                    rotateX: 0,
                    duration: 0.32,
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
                portal.classList.remove("is-lift");
              });
            });

            root.querySelectorAll<HTMLElement>(".tl-btn").forEach((btn) => {
              const onEnter = () =>
                gsap.to(btn, {
                  scale: 1.03,
                  y: -1,
                  boxShadow: btn.classList.contains("tl-btn-pri")
                    ? "inset 0 1px 0 rgba(242, 235, 227, 0.2), 0 10px 28px rgba(0, 0, 0, 0.38)"
                    : "0 6px 18px rgba(0, 0, 0, 0.28)",
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
          hashNavCleanup = installLandingHashNav(root, gsap, {
            reduced: false,
            isCancelled: () => cancelled,
          });
          initialHashCleanup = scheduleInitialHashArrival(root, gsap, {
            reduced: false,
            isCancelled: () => cancelled,
          });
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
