Reviewed all 11 files plus their call sites. I independently re-ran the gates: **typecheck clean, 105/105 unit tests pass**. I did not re-run `next build` or the e2e specs — taking those as green per your report.

---

## Verdicts by area

| # | Area | Verdict |
|---|---|---|
| 1 | Formality refactor | **PASS** |
| 2 | Worn store | **PASS** |
| 3 | Style profile | **PASS-WITH-NOTE** |
| 4 | Composer preferences | **PASS** |
| 5 | Occasion-service integration | **FAIL** (one stated criterion unmet) |
| 6 | API | **PASS-WITH-NOTE** |
| 7 | UI | **PASS-WITH-NOTE** |
| 8 | Tests | **PASS-WITH-NOTE** |

**1. Formality refactor — PASS.** Every consumer resolves: `venue/types.ts:3,26` imports and re-exports, `venue/index.ts:5` re-exports from `./types`, `mock-provider.ts:8` and `mock-provider.test.ts:3` still import from `./types` unchanged. NaN/clamp semantics are preserved verbatim (`formality.ts:17-19`), so the three P2 boundary tests still hold. `DressCodeLabel = WardrobeFormality` and `formalityLevelToLabel` returns `WardrobeFormality` — consistent. **No runtime cycle:** `formality.ts` imports only `@/types/wardrobe`, which is a leaf; the pre-existing `occasion.ts ↔ venue/types.ts` cycle is type-only and erased at compile.

**2. Worn store — PASS.** Structurally identical to `wardrobe-store.ts` and `occasion-store.ts`: same `withLock` queue, same PID-scoped tmp + `rename` atomic write, same ENOENT→`[]`, same array shape. `listRecords` bypassing the lock matches `listItems`/`listOccasions` and is safe (single `fs.readFile`, no torn reads). `deleteRecord` returning `false` on miss matches `deleteItem`, and the route maps it to 404 correctly.

**3. Style profile — PASS-WITH-NOTE.** Counts, top-N, and the `Math.round(2.4)=2` mean are correct. Tie-breaking via `firstSeen.indexOf` matches Map insertion order and is fed by `listRecords`' total ordering, so the profile is fully deterministic. Empty records and empty-items cases both land on the `-1` sentinel correctly.

**4. Composer preferences — PASS.** Caps hold (both the `< cap` guard *and* `Math.min` are applied): max +4/+2/+2 = **+8** on a ~62 base. Crucially, `occasion-service` always passes `preferences` — possibly `{}` — and `if (prefs)` is truthy for `{}`; but all three sets are empty, so every bonus is 0 and existing scores are byte-identical. Existing tests stay valid (confirmed green). Scores can't go negative (floor ≈ 33). Sort is a single stable `b.score - a.score`, so ordering stays deterministic with preferences on.

**7. UI — no base64 leak, confirmed.** Triple-guarded: `occasion-service.ts:71` strips `imageBase64` before the session is persisted, the POST body destructures only the 5 allowed fields (`occasion/[id]/page.tsx:147-155`), and `WornItemSchema` has no `imageBase64` key so Zod would strip it regardless. Per-outfit state keyed on `combo-N` is correct, and errors are cleared before each attempt. No client/server mismatch — `formality.ts` is a pure leaf, and `ComposedOutfit` is a type-only import.

---

## New issues

**1. MEDIUM — `src/lib/services/occasion-service.ts:47`** — `listRecords()` is unguarded, so an optional personalization signal can kill the core flow.
A corrupt `.data/worn.json` throws `SyntaxError` out of `readWorn` (only ENOENT is caught), propagates through `createOccasion`, and `api/occasions/route.ts:35` turns it into a 500 — occasion creation is fully dead until the file is deleted. Contrast `/api/worn` GET, which degrades to empty sections. This is your explicit acceptance criterion ("should not break occasion creation") and is a 3-line `try/catch` returning `{}`. Low likelihood (writes are atomic), but total impact.

**2. LOW-MED — `src/app/api/worn/route.ts:25`** — `wornDate: z.string().max(32)` accepts any string.
The type comment promises `YYYY-MM-DD`. An API client posting `"soon"` persists it, corrupts the `localeCompare` ordering in `listRecords`, and renders raw at `wardrobe/page.tsx:458`. Unreachable from the UI (which never sends the field), so it's an API-surface gap only. `z.iso.date()` closes it.

**3. LOW — `src/app/occasion/[id]/page.tsx:76-82`** — no in-flight or idempotency guard on Mark-as-worn.
`marked` only flips after the response returns, so a double-click writes two records; a page reload also resets `markedWorn`, letting the same outfit be re-marked. Duplicates silently double-weight that outfit in the style profile — the one place stray data actually changes recommendations. A `disabled` flag while the request is in flight covers the common case.

**4. LOW — `src/lib/services/style-service.ts:97`** — formality preference is not gated at all.
Colors and categories require `count >= 2`, but `prefs.formality` is set whenever `profile.formality >= 0`, i.e. after a *single* worn record. That's the one-off noise the gating elsewhere is meant to exclude. Bounded to +2, so the blast radius is small, but it's inconsistent with the stated rule.

**5. LOW — `src/lib/wardrobe/composer.ts:32-38`** — the single source of truth is only half-adopted.
`composer.ts` imports `formalityToLevel` at line 6 *and* keeps its own identical `FORMALITY_LEVEL` map, used by `formalityIndex` throughout. Two mappings for one concept in one file; they'll diverge the day a level is added.

**6. LOW — `src/app/api/worn/route.ts:64`** — `new Date().toISOString().slice(0,10)` is UTC.
Marking an outfit worn at 8pm PDT records tomorrow's date. Cosmetic at MVP scale; only affects display and sort adjacency.

**7. LOW — `src/app/api/worn/[id]/route.ts:14`** — `z.string().uuid()` is deprecated in Zod 4 (`z.uuid()` is the replacement). Consistent with the existing wardrobe routes, but this adds a new deprecated call site, which AGENTS.md asks you to avoid.

**8. LOW — `src/app/wardrobe/page.tsx:526`** — the `-1` sentinel isn't distinguished from real data.
Line 485 guards on `totalWorn === 0`, but a profile with records whose items arrays are all empty yields `formality: -1`, which `formalityLevelToLabel` clamps to `"casual"` — a fabricated "Typical formality: Casual". Unreachable via the API (`items` has `.min(1)`), so this is hardening only. Same class: an unrecognized formality string in a hand-edited file makes the mean `NaN`, which serializes to `null` and renders as "Smart Casual". Both degrade without crashing.

**9. LOW — test gaps.** The composer preference test *does* isolate the effect correctly (identical items, only `preferences` differs, and burgundy avoids the accent-color penalty). But nothing asserts the caps actually bind, nothing covers the formality bonus, and — most valuable — nothing pins the invariant `occasion-service` depends on: `preferences: {}` must score identically to no preferences. That's the assertion protecting every pre-existing composer test from silent drift. The absence of a `worn-store` test is consistent with the repo (no store has one), so I wouldn't treat it as a new gap.

---

**Recommendation:** Fix #1 (wrap `listRecords` in occasion-service) and #3 (in-flight guard on Mark-as-worn) before commit — everything else is a follow-up note.
