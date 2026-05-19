"use client";

import { useEffect } from "react";

/**
 * Scroll-driven motion for the marketing landing only.
 * Respects prefers-reduced-motion; uses GSAP ScrollTrigger when available.
 */
export function LandingMotion() {
  useEffect(() => {
    const html = document.documentElement;
    const prevScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "smooth";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cleanupScroll = () => {
      html.style.scrollBehavior = prevScrollBehavior;
    };

    const killScrollTriggers = () => {
      void import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
      });
    };

    if (reduced) {
      document.querySelectorAll(".tray-landing [data-reveal]").forEach((el) => {
        el.classList.add("tl-visible");
      });
      return () => {
        cleanupScroll();
      };
    }

    let killed = false;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);

      const root = document.querySelector(".tray-landing");
      if (!root) return;

      gsap.from(".tray-landing .tl-h1 .tl-word", {
        y: 48,
        opacity: 0,
        rotateX: 12,
        stagger: 0.06,
        duration: 1.1,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from(".tray-landing .tl-hero-stat", {
        y: 24,
        opacity: 0,
        stagger: 0.08,
        duration: 0.85,
        ease: "power3.out",
        delay: 0.55,
      });

      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
          y: 36,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
        });
      });

      root.querySelectorAll<HTMLElement>(".tl-portal").forEach((el, i) => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
          },
          y: 40,
          opacity: 0,
          duration: 0.85,
          delay: i * 0.06,
          ease: "power3.out",
        });
      });

      gsap.from(".tray-landing .tl-flow-step", {
        scrollTrigger: {
          trigger: ".tray-landing .tl-flow",
          start: "top 85%",
        },
        y: 28,
        opacity: 0,
        stagger: 0.1,
        duration: 0.75,
        ease: "power3.out",
      });
    })();

    return () => {
      killed = true;
      killScrollTriggers();
      cleanupScroll();
    };
  }, []);

  return null;
}
