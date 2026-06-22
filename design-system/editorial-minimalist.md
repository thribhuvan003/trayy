# Tray: Editorial Minimalist Design System (Winter 2026)

Inspired by Motion.dev, Vengeance UI, and UI TripleD, this system balances high-end editorial aesthetics with fluid, purposeful motion.

## Visual Language
- **Backgrounds**: Warm, tactile surfaces (`#FDFBF7` "Paper").
- **Typography**: 
  - **Display**: `Instrument Serif` (Italic for emphasis) for a luxury editorial feel.
  - **UI**: `Geist` (Variable) for precision and clarity.
- **Components**: 
  - Large corner radii (`24px` to `40px`).
  - Hairline borders (`1px solid rgba(0,0,0,0.05)`).
  - Subtle, multi-layered shadows for depth without weight.
- **Color Palette**:
  - **Ink**: `#1A1A19` (Primary text & key elements).
  - **Dust**: `#908879` (Secondary text & accents).
  - **Ocean**: `#0066FF` (Action highlights & success).

## Motion Principles (Powered by Motion.dev)
- **Fluidity**: Use `cubic-bezier(0.23, 1, 0.32, 1)` for all transitions.
- **Interactivity**: 
  - **Spring Physics**: Buttons and cards should have elastic feedback on hover/active.
  - **Staggered Entry**: Menu items should animate in with a slight delay for a "revealing" effect.
- **Feedback**: 
  - **Payment Slider**: Drag resistance increases as you reach the end.
  - **Cart Bumps**: Subtle scale animations when items are added.

## Implementation Checklist
- [x] Static Mockup (`student.html`)
- [ ] MenuItemCard Component
- [ ] CartDrawer Sidebar
- [ ] PayPanel with Slider
- [ ] TopBar Navigation
