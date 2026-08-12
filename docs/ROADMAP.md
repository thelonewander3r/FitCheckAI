# InterviewReady AI — Product Roadmap (2026-08-11)

## North star

InterviewReady AI becomes a **personal AI stylist for any occasion**: it knows
*who you are* (body, skin tone, style, culture context), knows *what you own*
(the wardrobe), and knows *where you are going* (venue/event), then recommends
the best outfit — with alternatives — and keeps getting better as you use it.

The interview flow stays as the flagship demo (and the first use case), but the
scope extends past interviews to events, themed occasions, and day-to-day
dressing.

## Principles

- **Person-first:** recommendations adjust to body/weight, skin tone, gender
  presentation (female-forward by default per product direction), and company
  or venue culture — not just industry keywords.
- **Wardrobe-first:** a recommendation is only useful if it can be built from
  what the user owns. Gap-filling is a first-class output ("you need a
  structured blazer — here is one in budget").
- **Occasion-aware:** every recommendation starts from event type + theme +
  location, with a light online lookup for venue/company culture signals.
- **Capture once, use forever:** image upload builds the wardrobe piece by
  piece; a later video pass auto-populates it from a closet walkthrough.
- **Simplicity is the product:** fewer questions, fewer uploads, more leverage.
  Favorites and history reduce repeat work.

---

## Phase 0 — Person profile (personalization inputs)

Unlocks every later phase. Cheap, incremental on the existing intake.

- Add to intake: **body type / size + weight** (fit scoring), **skin tone**
  (manual picker now; auto-derive from selfie later), **gender/presentation**
  (female-forward default; templates already partly female-oriented — make it
  explicit), **company culture** (from job description + light web lookup of
  the company for dress-culture signals, e.g. startup vs. bank).
- Thread person attributes into `ranking.ts` scoring (fit, color flattery,
  culture-adjusted formality) and into the VTO mock (tint/label uses
  recommended palette).
- Skin tone from selfie: mock provider can sample dominant skin pixels from
  the downscaled selfie (no new deps, server-side) → flattering color palette.

**Exit criteria:** changing weight/skin tone/culture visibly changes the
top-3 and the palette, with tests.

## Phase 1 — Wardrobe module (the core new component)

The heart of the pivot. The app learns what you own.

- **Data:** `WardrobeItem` — image (reuse downscale pipeline), category
  (tops, bottoms, dresses, outerwear, shoes, accessories), color, formality
  level, season, fit/size, favorite flag, acquired date.
- **Capture:** piece-by-piece image upload with quick attribute tagging
  (2–3 taps per item). API + UI under a "My Wardrobe" section.
- **Composition:** given a context (interview/event/venue), compose full
  outfits from owned pieces (rules on category/color/formality compatibility),
  fall back to template suggestions for gaps. Outfit templates become
  composition rules, not literal garment lists.
- **Favorites:** star outfits; favorites reused across future occasions.
- **Design for video later:** garment attributes must be structured so a
  future vision pass can write them directly.

**Open decision:** keep the file-based store for wardrobe MVP, or wire the
Prisma/SQLite adapter now (real entities, queryable, migration path).
**Decision (2026-08-11):** build wardrobe MVP on the file-store pattern
(`.data/wardrobe.json`, same atomic/lock store as sessions) for zero native
dependencies and demo velocity; the `WardrobeItem` type is structured so a
Prisma/SQLite swap stays mechanical when the data model stabilizes.

## Phase 2 — Occasion / venue intelligence

Extend past the interview.

- Intake becomes **occasion input**: event type (interview, gala, dinner,
  casual outing, wedding…), theme (if any), location/venue name.
- **Online lookup:** light web/place search for the venue/company (vibe,
  dress code hints, photos) → "Event Context Engine" (same shape as the
  existing interview context engine) producing dress code + palette +
  culture-adjusted formality.
- Output: best outfit from wardrobe + 2–3 alternatives, each with a
  why-selected line.

**Exit criteria:** picking "rooftop bar, The Rooftop at 123 Main" yields a
distinct recommendation from "client meeting, bank HQ", with a cited venue
signal.

## Phase 3 — Outfit history & learning (fast-follow)

- Track outfits actually worn (user confirms at the event) → learn
  preferences and repeat-wear habits.
- "Outfit of the day" suggestions from wardrobe + calendar.

## Phase 4 — Video capture (later, high leverage)

- User records a closet walkthrough (phone video) → vision pass detects and
  classifies garments → auto-creates `WardrobeItem`s for review.
- Same video pipeline can refresh/retire items (sold, worn out).
- Requires a real vision model / API (YouCam live, or another provider);
  design in Phase 1 so this can feed the same store.

---

## What does NOT change

- Mock-first: everything runs credential-free in mock mode; live providers
  (YouCam, venue lookup, vision) slot in behind the existing provider
  abstractions.
- Safety layer stays: cosmetic-only, no medical/hiring claims.
- Interview flow remains the polished demo path (hackathon submission), now
  feeding the same wardrobe/person profile.

## Immediate next slice (recommended)

**P0 + P1**: person profile fields + wardrobe module with piece-by-piece
image capture and wardrobe-aware composition, interview flow updated to use
them. That makes the pivot real end-to-end; P2 (venue lookup) is a fun,
standalone demo addition on top.
