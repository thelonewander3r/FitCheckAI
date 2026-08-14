---
name: InterviewReady AI editorial design system
description: Visual language choices confirmed by user — magazine-editorial aesthetic. Reference before any UI changes.
---

## Design System

**Background:** Ivory/cream `#f9f6f0` — not white or gray. Gives a printed-paper warmth.

**Brand palette:**
- Primary ink: `#0f2744` (deep navy)
- Accent: `#2a6f7f` (teal)
- Surface/bg: `#f9f6f0` (ivory)
- Muted text: `#7b8a8a`

**Typography:**
- Display/headings: Playfair Display (serif, bold/italic for editorial rhythm)
- Body/UI: DM Sans
- Both loaded via Google Fonts in `artifacts/interview-ready/index.html`

**Motion:** framer-motion `AnimatePresence` + `motion.div` on every page for transitions. Stagger reveals on card grids.

**Layout paradigm:** Magazine-style — asymmetric grids, generous whitespace, editorial bleed areas. NOT centered/symmetric corporate layouts.

**Component style:**
- Outfit cards: tall editorial cards, large serif outfit name, thin score bar
- Forms: bottom-border-only inputs (no box borders)
- Step nav: thin horizontal timeline line
- Wardrobe: catalogue grid, photo-dominant cards

**Why:** User explicitly requested editorial/magazine style (large heroes, bold serif, lookbook grids, mobile-first cards). Confirmed with cinematic landing screenshot.
