# FitCheck AI — Product Roadmap

## North star

FitCheck AI helps someone decide what to wear for a real event using the
wardrobe they already own. The user should provide as little as possible: a
plain-language description of the event they are attending. FitCheck asks for
more detail only when the request is sparse, researches useful event context,
composes a coherent outfit from saved pieces, explains the tradeoffs, and
improves as the user marks looks worn.

The interview flow remains a focused use case and hackathon demo, not the
product boundary.

## Principles

- **Wardrobe-first:** recommend what the user owns before suggesting purchases.
- **Event-aware:** infer useful context from one sentence, then ask for a
  restaurant, venue, company, city, dress code, or vibe only when needed.
- **Research before styling:** gather bounded, relevant event facts before
  composing an outfit; keep web content separate from YouCam inputs.
- **Low-input:** stage, format, presentation, budget, and demographic inputs are
  not required for the initial check.
- **Optional preferences:** manual color and skin-tone preferences can refine
  palette guidance, but they are never inferred from images.
- **Explain the gap:** show what is missing from the current wardrobe without
  turning the first experience into a shopping funnel.
- **Shopping later:** when purchase recommendations are added, they should be
  a separate phase with explicit garment references and user control.

---

## Phase 0 — Event-first intake

**Status: SHIPPED / ACTIVE.** The primary occasion flow starts with one event
prompt. Sparse prompts reveal follow-up questions for a restaurant, venue,
company, city, dress code, and vibe, plus optional manual color and skin-tone
palette preferences. Detailed prompts can go straight to composition. The
server validates the same contract for non-browser clients.

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

**Status: IN PROGRESS.** The current provider boundary accepts an event and
optional restaurant, venue, company, or city anchor. Mock mode uses curated
context so the public demo stays deterministic. The next production slice is
a bounded web-research adapter that returns structured, cited facts such as
venue formality, dress-code language, setting, weather, and time of day.
Retrieved web text is untrusted input and must be sanitized before it reaches
an AI classifier or user-facing explanation.

Next improvements:

- replace deterministic keyword inference with a bounded language-model or
  structured classifier when a reliable provider is available;
- implement the web-research adapter with source URLs and freshness controls;
- add weather and time-of-day only when they materially change the outfit;
- show confidence and ask one follow-up only when the event is ambiguous.

## Phase 3 — YouCam visual layer

**Status: PARTIAL.** Skin AI is integrated and credentialed-tested locally.
Mock mode provides a deterministic visual result. AI Clothes VTO is integrated
behind the provider boundary, but live use requires both a user image and a
clothing reference image; the default built-in templates do not yet ingest
those garment assets.

**Future makeup extension.** FitCheck should first recommend a makeup look from
the researched event context and selected outfit. YouCam AI Makeup VTO or AI
Makeup Transfer can then render a user-provided or reference makeup look; the
provider renders the chosen look and does not decide what makeup suits the
event.

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
- YouCam is used for optional visual analysis/rendering, not event inference
  or wardrobe discovery.
- Safety remains cosmetic-only: no medical claims, hiring predictions, or
  demographic inference.
- The MVP continues to use local file stores; production auth, TTL, and
  multi-user isolation remain separate work.
