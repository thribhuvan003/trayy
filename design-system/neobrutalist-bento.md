# Neobrutalist-Bento Hybrid Design System (Winter 2026 Cohort)

## Core Aesthetics
- **Borders**: Solid 3px black borders (`border-3 border-black`) on all primary containers, cards, and buttons.
- **Shadows**: Flat 4px or 6px offset shadows (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`).
- **Typography**: 
  - Headings: `Instrument Serif` for a premium editorial feel.
  - UI/Body: `Bricolage Grotesque` or `Jakarta` for clean, modern readability.
- **Color Palette (Cyber Saturated)**:
  - Background: Off-white/Cream (`#F4EFE6`) to contrast with bold accents.
  - Accent 1 (Primary): Cyber Blue (`#0066FF`) or Saturated Red (`#E60000`).
  - Accent 2 (Success): Neon Green (`#3FE6A3`).
  - Accent 3 (Warning): Saturated Orange (`#FFAE29`).
- **Interactivity**:
  - Spring-physics for active states (using Framer Motion).
  - Button Press: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`.

## Component Architecture

### 1. Bento Grid Layout
- Use CSS Grid with defined gaps (`gap-4` or `gap-6`).
- Cards should have varying sizes but maintain a consistent "unit" feel.

### 2. Neobrutalist Button
- Base: `border-3 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`.
- Hover: `hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]`.
- Active: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`.

### 3. Drag-to-Confirm Payment Slider
- Track: Long horizontal container with a thick border.
- Handle: A square draggable element.
- Label: "Slide to Pay" text that fades as the handle moves.
- Completion: Trigger payment logic when handle reaches >90% of track.

## Implementation Plan
- **Static Mockup**: Rewrite `public/demo/student.html` styles to match this spec.
- **Next.js Portal**: 
  - Update `src/app/globals.css` with Neobrutalist utility classes.
  - Create a new `PaymentSlider` component in `src/components/portal-student/payment-slider.tsx`.
  - Refactor `MenuItemCard`, `CartDrawer`, and `PayPanel` to use the new style.
