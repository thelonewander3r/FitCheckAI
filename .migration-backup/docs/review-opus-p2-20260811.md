Reviewed all 13 new/changed files plus the composer, wardrobe store/types, and the P2 spec (`docs/dev-grok-p2-occasion.txt`) they were built against. I did not modify anything.

## Verdicts

| # | Area | Verdict |
|---|------|---------|
| 1 | Mock venue matching | **FAIL** — rule precedence inverts event formality; substring false positives confirmed |
| 2 | Occasion service | **PASS-WITH-NOTE** — mapping/palette/store-write all correct; orphan rows on failure |
| 3 | Occasion store | **PASS** — mirrors `wardrobe-store` exactly; array shape consistent with API reads |
| 4 | API | **PASS-WITH-NOTE** — validation/UUID/status codes/error-leak all good; `eventDate` uncapped; **the "no base64 in occasions" premise is false** |
| 5 | UI | **PASS-WITH-NOTE** — empty-wardrobe state misfires; no hydration issues |
| 6 | Security/privacy | **PASS-WITH-NOTE** — escaping and matcher safe; base64 duplication expands the data surface |
| 7 | Tests | **FAIL** — no test touches a decision boundary; store/service/API/e2e uncovered |

## New issues

**H1 — Occasions DO store base64 images.** `src/lib/services/occasion-service.ts:56` → `src/types/occasion.ts:32`
`ComposedOutfit.items` is `WardrobeItem[]`, and `WardrobeItem.imageBase64` (`src/types/wardrobe.ts:60`) is validated up to **3 MB** at ingest (`src/app/api/wardrobe/route.ts:26`) with no client-side downscaling. Each occasion persists up to 3 outfits × ~4 items of full base64 into `.data/occasions.json`; every later create/update rewrites the entire file, and `GET /api/occasions/[id]` returns the whole thing to the browser. Copies also go stale when a wardrobe item is edited or deleted. Store item IDs and resolve images client-side, or strip `imageBase64` before `storeUpdate`. **Severity: high.**

**H2 — Name rules outrank event type; formality gets silently downgraded.** `src/lib/venue/mock-provider.ts:46-95`
Only the wedding rule consults `eventType`, and it sits at index 3 — behind rooftop/gallery/resort. Confirmed outcomes: a **wedding at "Skyline Terrace" → smart-casual (1)**; a **gala at "Lakeside Resort" → casual (0)**; `eventType: "gala"` at "First National Bank" → business-professional (3), because bank (index 4) precedes gala (index 6). There is no `max(curatedLevel, EVENT_DEFAULT_LEVEL[eventType])` floor, so the headline inference fails on exactly the high-formality cases that matter most. **Severity: high.** (Matches the spec at `docs/dev-grok-p2-occasion.txt:42-49` — this is a spec defect faithfully implemented, not a coding slip.)

**M1 — Substring matching false positives.** `src/lib/venue/mock-provider.ts:97-101, 109-131`
Verified against the live keyword list: `Burbank Town Center` / `Riverbank Hall` / `Bankrupt Bar` → business-professional; `Lawrence Hall` / `The Lawn Club` / `Coleslaw Cafe` → business-professional (`law`); `Blake Hotel` / `Great Lakes Ballroom` → casual (`lake`); `Operations Center HQ` → formal (`opera`); `Galaxy Lounge` → formal (`gala`); `Skyler Building` → smart-casual (`sky`). "Bankrupt" is arguably tolerable; **Burbank, Lawrence, Blake, and Operations are not** — they're common real venue names getting confidently wrong dress codes at 0.85. Word-boundary matching (`\b<kw>\b`) fixes all six. **Severity: medium.**

**M2 — Failed lookup leaves an unreachable orphan record.** `src/lib/services/occasion-service.ts:37-61`
`storeCreate` runs *before* `lookupVenue`. If the lookup throws — which `LiveVenueLookupProvider` does unconditionally (`src/lib/venue/live-provider.ts:25`), so **every** request under `VENUE_MODE=live` — or if `listItems()` throws on a corrupt `wardrobe.json`, the route returns 500 but a permanent session with no `venueContext` and empty `outfits` stays in `occasions.json`, with its id never returned to anyone. Lookup → compose → single `storeCreate` removes both the orphan and the second file rewrite. **Severity: medium.**

**M3 — "Add your pieces first" fires for users who have a full wardrobe.** `src/app/occasion/[id]/page.tsx:36-40, 114-115, 189-205`
`gapsCoverAllCore` treats "all four core categories are gaps" as "wardrobe is empty", but `buildGaps` reports gaps *at the required formality*. A user with 15 casual pieces planning a gala gets `tops/bottoms/dresses/outerwear at formal` → the page tells them their wardrobe "doesn't have enough pieces yet" **and suppresses the Missing pieces list**, which is the one genuinely actionable output in that state. Gate on `session.outfits.length === 0 && wardrobeItemCount === 0` instead. **Severity: medium.**

**M4 — `eventDate` has no length bound.** `src/app/api/occasions/route.ts:11`
Every other string field is capped at 200; `eventDate: z.string().optional()` is uncapped and unformatted. App Router route handlers impose no body-size limit, so an arbitrary multi-MB string is accepted and persisted verbatim. Use `z.iso.date().optional()` or at minimum `.max(32)`. Relatedly, `venueName` is `.min(1)` with no `.trim()` (line 8) — `"   "` passes server-side and renders as a blank venue label at `src/app/occasion/[id]/page.tsx:155`. **Severity: medium-low.**

**L1 — Palette entries that can never match anything.** `src/lib/venue/mock-provider.ts:92`, `src/lib/services/occasion-service.ts:19`
`ivory`, `blush`, and `deep green` are absent from `WARDROBE_COLORS` (`src/types/wardrobe.ts:20-41`), and `colorHarmonyRank`/`scoreOutfit` match on exact color string. The wedding palette `["ivory","navy","blush"]` therefore scores as `["navy"]`, and the `tan` skin-tone set loses a quarter of its weight. **Severity: low-medium.**

**L2 — `skinTone` is unreachable from the UI.** `src/app/occasion/page.tsx:12-19`
The type, the zod schema, the demo route, and `mergePalette` all support it, but the intake form has no field, so the skin-tone palette merge only ever runs via `POST /api/occasions/demo`. Either add the control or drop the branch. **Severity: low-medium.**

**L3 — `theme` is collected and ignored.** `src/lib/services/occasion-service.ts:39-52`
`theme` reaches the store and the header line but never influences the venue lookup or the composer. `season` is hardcoded `"any"` (line 46) so `eventDate` is inert too — that one is an explicit MVP punt in the spec, `theme` is not. **Severity: low.**

**L4 — `formalityLevelToLabel(NaN)` returns `undefined` past a non-null assertion.** `src/lib/venue/mock-provider.ts:134-137`
`Math.round(NaN)` survives both clamps, and `LEVEL_TO_LABEL[NaN]!` suppresses the index check. Unreachable today (JSON carries no `NaN`, live provider throws first), but it's the one boundary the `!` is hiding. `Number.isFinite` guard. **Severity: low.**

**L5 — `source: "mock:keyword"` is documented but never emitted.** `src/lib/venue/types.ts:22`
The provider only produces `mock:curated` and `mock:event-default`; the curated and keyword tiers were collapsed. Update the comment or the review checklist will keep asking about a tier that doesn't exist. **Severity: low.**

**L6 — Dead code.** `POST /api/occasions/demo` (`src/app/api/occasions/demo/route.ts:14`) is referenced by no UI and no test; `listOccasions` is exported from both the store (`src/lib/occasion-store.ts:48`) and the service (`src/lib/services/occasion-service.ts:71`) with no `GET /api/occasions` to consume it. **Severity: low.**

**L7 — `formalityLevelToLabel` ships from the mock module.** `src/lib/venue/index.ts:5`, `src/lib/services/occasion-service.ts:9`
The service imports a general-purpose helper out of `mock-provider`, so live mode still loads the mock. Also `DressCodeLabel` (`src/lib/venue/types.ts:8-13`) duplicates `WardrobeFormality` (`src/types/wardrobe.ts:11-18`) — structurally identical today, with nothing preventing drift from silently breaking the `composeOutfits` call. **Severity: low.**

**T1 — Test coverage does not exercise any decision boundary.** `src/lib/venue/mock-provider.test.ts:11-52`
All four cases are first-rule-wins happy paths — "Skyline Rooftop Bar" hits rule 0, "First National Bank HQ" hits the first rule that can match it, and "Rosewood Wedding Pavilion" is `eventType: "other"`, so **no test puts two rules in contention**, which is precisely how H2 slipped through. Missing entirely: `formalityLevelToLabel` clamping/rounding, `occasion-store` (ENOENT, concurrent create, update-of-missing-id), `occasion-service` (venue-throws, empty wardrobe, palette dedupe), the three API routes, and any e2e for the occasion flow — the 2 passing e2e specs are the pre-existing demo flow (`e2e/demo-flow.spec.ts`), which never touches `/occasion`. **Severity: medium.**

## Confirmed clean

React escapes `intake.venueName` at `src/app/occasion/[id]/page.tsx:155` — no `dangerouslySetInnerHTML` anywhere in P2. The matcher uses `toLowerCase()` + `includes()`, so no regex injection or ReDoS, and zod caps input at 200 chars. `src` at lines 231/277 is a hardcoded `data:image/jpeg;base64,` prefix over a payload that was regex-validated as strict base64 at ingest, so no `javascript:` escape. `occasion-store` is a line-for-line match of `wardrobe-store`'s lock/tmp+rename/ENOENT pattern with a consistent array shape. API error paths log server-side and return generic messages — no `err.message` leak. Both pages are `"use client"` with no server-rendered dynamic data, so no hydration risk (though `params.then()` in `useEffect` at line 48-50 is off-pattern for Next 16 — `use(params)` is what `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md:64` prescribes, and it removes a render round-trip).

## Recommendation

**Do not commit as-is** — fix H1 (strip base64 from persisted outfits) and H2 (floor curated formality at the event-type default) first; M1–M4 and T1 can land as a fast-follow, and clean up the untracked `docs/dev-grok-p2-*` / empty `review-opus-p2-20260811.md` artifacts before staging.
