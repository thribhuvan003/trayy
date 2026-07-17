# Tray landing — Figma integration map

Monsoon Paper marketing surface only (`.tray-landing`). Student, kitchen, and admin product UIs use separate palettes.

## Source files

| Role | Path |
|------|------|
| Page shell + copy + scoped CSS | `src/components/landing/landing-page.tsx` |
| GSAP ScrollTrigger + micro-interactions | `src/components/landing/landing-motion.tsx` |
| Line-leave interactive block | `src/components/landing/landing-line-leave.tsx` |
| Route entry | `src/app/page.tsx` |

## Color tokens (CSS → Figma variables)

Create a Figma collection **Tray / Landing / Monsoon Paper** with modes **Light** (default).

| Token | Hex / value | Usage |
|-------|-------------|--------|
| `bg/base` | `#f7f3ea` | Page background top |
| `bg/elevated-1` | `#fffaf0` | Cards, sync band |
| `bg/elevated-2` | `#f0e8d8` | Frames, chips |
| `bg/elevated-3` | `#e8decc` | Hover surfaces |
| `ink/primary` | `#1a140e` | Headlines, primary buttons |
| `ink/secondary` | `rgba(26,20,14,0.72)` | Body |
| `ink/tertiary` | `rgba(26,20,14,0.58)` | Labels |
| `ink/muted` | `rgba(26,20,14,0.38)` | Meta, footer |
| `line/default` | `rgba(26,20,14,0.12)` | Borders |
| `line/strong` | `rgba(26,20,14,0.18)` | Nav scrolled |
| `accent/warm` | `#c43d2f` | Italic emphasis, selection, progress mid |
| `accent/cool` | `#2a5db8` | Ghost hover, hero cool rim |
| `portal/student` | `#5cb1ff` | Student portal accent (demo) |
| `portal/kitchen` | `#d52821` | Kitchen portal accent (demo tomato) |
| `portal/kitchen-bright` | `#ef5749` | Kitchen dot glow |
| `portal/admin` | `#cdfa50` | Admin portal accent (demo lime) |
| `status/live` | `#6dd4a0` | Live pill |

**Section ambient glows** (radial overlays, bind as optional variables):

| Section | `section-glow` |
|---------|----------------|
| `#system` | `rgba(42,93,184,0.12)` |
| `#sync` | `rgba(196,61,47,0.12)` |
| `#where` | `rgba(205,250,80,0.14)` |
| `.tl-pull` | `rgba(196,61,47,0.15)` |
| `#flow` | `rgba(196,61,47,0.10)` |
| `#stack` | `rgba(42,93,184,0.10)` |

**Page gradient:** `165deg` — `#f7f3ea` → `#fffaf0` (38%) → `#f0e8d8`.

**Hero / ambient orbs:** coral wash (orb-a), sky blue (orb-b), service green (orb-c).

## Typography

| Role | CSS | Figma text style |
|------|-----|------------------|
| Display / H1 | `var(--font-newsreader)` | Newsreader 400–500, tracking −2%, line ~100% |
| Display / H2 | same | clamp 2.5–6rem equivalent |
| Body | `var(--font-manrope)` | Manrope 400–600, 18–22px |
| Mono / labels | `var(--font-jetbrains)` | JetBrains Mono 600, uppercase, +10–14% tracking |

Italic emphasis uses Newsreader Italic + `accent/warm`.

## Spacing & layout

- **Max content width:** 1280px (`.tl-wrap`)
- **Section padding:** 80px mobile / 120px desktop vertical
- **Portal grid:** 1 col → 3 col at 720px, gap 18px
- **Radius:** buttons 999px; cards 18px; inner chips 12px

## Components to mirror in Figma

| Component | Class / selector | Notes |
|-----------|------------------|--------|
| Nav sticky | `.tl-nav` | Light paper blur, border `line/default`; scrolled state lifts |
| Scroll progress | `.tl-scroll-progress` | 2px gradient student → warm → kitchen |
| Primary button | `.tl-btn-pri` | Ink fill on paper text |
| Ghost button | `.tl-btn-ghost` | Subtle ink tint fill, cool border on hover |
| Portal card | `.tl-portal[data-c]` | Role dot + top border on hover; **dark** browser chrome mock |
| Sync diagram node | `.tl-node[data-c]` | Icon square + role pill |
| Flow step | `.tl-flow-step` | Large italic numeral |
| Stack tile | `.tl-stack-card` | 2×4 grid |
| Line-leave chip | `.tl-line-chip.is-on` | Warm border when selected |
| Ticker | `.tl-ticker` | Marquee, pauses on hover |

**Do not redesign portal iframe previews** in Figma — treat as embedded screenshots from `/demo/*.html`.

## Motion (for Figma prototyping / dev handoff)

**Tier:** medium+ (tasteful bold). GSAP in `landing-motion.tsx`; hybrid GSAP + CSS motion stack.

| Section | Scroll behavior (GSAP) |
|---------|-------------------------|
| Hero | Timeline: words stagger (52px Y), stat count-up, glow parallax (desktop) |
| `#system` | Head slides from left; portals rise + rotateX 14°; tags scale in |
| `#sync` | Copy fade-up; diagram scale; nodes alternate ±44px `back.out(1.55)` |
| `#where` | Chips `back.out(1.75)` spring |
| `.tl-pull` | Quote blur 10px → sharp scale |
| `#flow` | Steps stagger; numerals `back.out(2)` |
| `#stack` | Cards pop from center scale 0.82→1 |
| `.tl-closing` | Headline lift + CTA cascade |
| Global | Ambient orbs scrub (desktop fine pointer); nav section spy; portal 3D tilt 9°/6° |

**Guards:** `prefers-reduced-motion: reduce` → skip GSAP; `(pointer: coarse)` or `max-width: 768px` → no scrub orbs, no portal tilt.

## Tailwind / global app

Landing styles are **scoped inline** in `landing-page.tsx` (`SCOPED_CSS`), not Tailwind utilities. Product app uses Tailwind v4 in `src/app/globals.css` — do not merge landing tokens into app theme without an explicit ADR.

## Assets & icons

- **Grain:** inline SVG turbulence (no file); `multiply` blend on light
- **Ambient orbs:** CSS radial gradients only
- **Portal device tags:** emoji prefixes in copy (💻 🖥) — optional SF Symbol / Lucide swap in Figma
- **Live dot:** CSS animation `tlLiveEmber`
- **Demo URLs:** `tray.app/demo/*` chrome bar (decorative, dark frame)

## Figma workflow

1. Run **figma-generate-library** / **search_design_system** against org files if connected.
2. Create variables from table above (Semantic → Primitive).
3. Build **Landing / Portal card** as component set with `student | kitchen | admin` variant (dot color + top accent).
4. Use **Code Connect** (optional): map `.tl-btn-pri` → Button primary, `.tl-portal` → Card/Large.
5. For pixel parity, screenshot `http://localhost:3000` at 1440× and 390× after `npm run dev`.
