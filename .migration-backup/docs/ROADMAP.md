# FitCheck AI — Product Roadmap

## North star

FitCheck AI helps someone decide what to wear for a real situation using the
wardrobe they already own. The user should provide as little as possible: a
plain-language description of where they are going. FitCheck infers a broad
context, composes a coherent outfit from saved pieces, explains the tradeoffs,
and improves as the user marks looks worn.

The interview flow remains a focused use case and hackathon demo, not the
product boundary.

## Principles

- **Wardrobe-first:** recommend what the user owns before suggesting purchases.
- **Situation-aware:** infer useful context from one sentence plus lightweight
  venue/context signals.
- **Low-input:** stage, format, presentation, budget, and demographic inputs are
  not required for the initial check.
- **Private by default:** do not infer skin tone or demographics from images;
  image-based YouCam features remain optional.
- **Explain the gap:** show what is missing from the current wardrobe without
  turning the first experience into a shopping funnel.
- **Shopping later:** when purchase recommendations are added, they should be
  a separate phase with explicit garment references and user control.

---

## Phase 0 — Situation-first intake

**Status: SHIPPED.** The primary occasion flow now asks for one required
situation sentence and one optional note. The server infers a broad occasion
type from the text and applies curated context rules. The old event-type,
stage, format, presentation, skin-tone, and budget questions are not rendered;
legacy interview payloads remain accepted with safe defaults for compatibility.

## Phase 1 — Wardrobe module

**Status: SHIPPED / ACTIVE.** Users can add structured wardrobe pieces with
images and quick attributes. The composer builds complete looks from owned tops,
bottoms, dresses, outerwear, shoes, and accessories, then reports wardrobe
gaps when a full combination is not possible.

Next improvements:

- make adding a piece faster on mobile;
- allow editing and correcting inferred garment attributes;
- let users favorite looks and mark them worn;
- use worn history to improve color, category, and formality preferences.

## Phase 2 — Context and outfit checking

**Status: SHIPPED.** Occasion results combine inferred event type, curated venue
signals, dress-code level, palette, and wardrobe composition. The result page
presents the whole outfit first, then alternatives and wardrobe gaps.

Next improvements:

- replace deterministic keyword inference with a bounded language-model or
  structured classifier when a reliable provider is available;
- add weather and time-of-day only when they materially change the outfit;
- show confidence and ask one follow-up only when the situation is ambiguous.

## Phase 3 — YouCam visual layer

**Status: PARTIAL.** Skin AI is integrated and credentialed-tested locally.
Mock mode provides a deterministic visual result. AI Clothes VTO is integrated
behind the provider boundary, but live use requires both a user image and a
clothing reference image; the default built-in templates do not yet ingest
those garment assets.

## Phase 4 — Shopping and garment references

**Future.** Add a separate section for buying an outfit or filling a wardrobe
gap. Each candidate product must provide a real garment reference image before
live AI Clothes VTO can be used. This phase must not replace the wardrobe-first
recommendation or silently turn a gap into a purchase.

## Phase 5 — Capture and learning

**Future.** Support closet walkthrough capture, garment detection with review,
seasonal archive/retire actions, and stronger outfit history. Any vision pass
must write into the same structured wardrobe store and require user review.

---

## What does not change

- Mock mode remains credential-free and the reliable public demo path.
- YouCam is used for optional visual analysis/rendering, not situation inference
  or wardrobe discovery.
- Safety remains cosmetic-only: no medical claims, hiring predictions, or
  demographic inference.
- The MVP continues to use local file stores; production auth, TTL, and
  multi-user isolation remain separate work.
