# Admin and footer production-quality design

## Goal

Repair concrete usability and reliability defects in Tray's landing footer,
public admin demo, and authenticated admin portal without redesigning the
product or changing its payment architecture.

## Landing footer

The rotated Tray stamp must remain visually distinctive while staying fully
inside the viewport at every supported width. It must not overlap links,
metadata, safe-area padding, or adjacent sections.

Acceptance criteria:

- No horizontal overflow or clipped stamp content at 320, 375, 390, 768, or
  1440 CSS pixels.
- Rotation and ink-stamp character remain intact.
- Footer links retain 44-pixel minimum touch targets and visible keyboard focus.
- Reduced-motion behavior and safe-area padding remain unchanged.

## Public admin demo

Every existing interactive control must produce a clear, reversible demo-state
change. The demo remains local-only and must never make production database or
payment requests.

The verified interaction matrix covers:

- Switching among all sample stalls without leaking state between stalls.
- Switching among Today, Menu, Staff, and Settings.
- Opening and pausing service.
- Toggling menu availability.
- Editing a price with validation and an explicit saved state.
- Removing and restoring a special where the current UI offers that action.
- Preserving each stall's state while navigating among demo tabs without
  leaking changes into another sample stall; reload behavior stays consistent
  with the demo's documented browser-storage model.

Controls that are informational rather than interactive must look
informational. There must be no button-shaped dead controls.

## Authenticated admin portal

The existing admin product is audited and repaired route by route:

- Dashboard service state and operational summaries.
- Menu categories, item creation, editing, stock, and availability.
- Orders, cancellation, refund state, and CSV export.
- Staff invitation, recovery link, role changes, and revocation.
- Settings for hours, pauses, guest ordering, payment mode, order mode, UPI,
  and operator contact.
- QR and navigation routes.

Existing server actions must provide deterministic validation, pending,
success, and failure states. Tenant isolation, payment verification, inventory
integrity, and role authorization may not be weakened.

## Responsive and accessibility requirements

- Test at 320, 375, 390, 768, and 1440 CSS pixels.
- No unintended horizontal scrolling, clipped controls, or obscured content.
- Keyboard navigation must reach every interactive control in a logical order.
- Focus indicators, accessible names, labels, contrast, and status
  announcements must meet WCAG 2.2 AA.
- Touch targets must be at least 44 by 44 CSS pixels where practical.

## Verification

- Exercise every public demo control in a real browser.
- Check console errors and failed network requests.
- Run Axe on the landing footer and each admin demo tab.
- Run the existing unit and integration suites.
- Run lint, TypeScript validation, and a clean production build.
- Run authenticated browser flows when a real Supabase test account is
  available. Until then, server actions receive focused automated coverage and
  the lack of a live authenticated session is reported explicitly.

## Release boundary

Changes remain on `codex/trayy-production-hardening` and use
`thribhuvan003 <thribhuvan003@gmail.com>`. Production deployment remains gated
by pending Supabase migrations through `0031_atomic_payment_and_inventory.sql`.
This work does not add Stripe, multi-currency support, application fees, or a
new admin information architecture.
