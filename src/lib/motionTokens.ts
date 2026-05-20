/** Shared motion constants for landing CSS transitions + GSAP (no framer-motion). */
export const motionTokens = {
  duration: { fast: 0.2, base: 0.45, reveal: 0.85, hero: 0.95 },
  ease: {
    hero: "expo.out",
    reveal: "power4.out",
    spring: "elastic.out(1, 0.65)",
    nav: "power3.out",
  },
} as const;
