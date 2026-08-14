## Review: P0 (personalization) + P1 (wardrobe)

Read-only review; no files modified. Ranking claims below were verified by re-running the scoring arithmetic against the real template table in a scratch `node -e` replica (not the compiled module), across all presentation × skin-tone permutations. I did not re-run your gates.

---

### Verdicts

| Area | Verdict |
|---|---|
| 1. P0 scoring bounds / demo ranking | **PASS-WITH-NOTE** |
| 1b. `cultureFormality` changes the label | **FAIL** |
| 2. P1 wardrobe store vs. session-store patterns | **PASS** |
| 3. Composer correctness | **PASS-WITH-NOTE** |
| 4. Wardrobe API validation / status codes | **PASS-WITH-NOTE** |
| 5. Privacy & security | **PASS-WITH-NOTE** |
| 6. Client refactor (`downscaleToBase64`, skin sampling) | **FAIL** |
| 7. Test coverage | **PASS-WITH-NOTE** |

---

### NEW issues

**HIGH**

**1. Skin-tone classifier is inverted** — `src/app/interview/page.tsx:80-85`
`rgbToLightness` returns HSL lightness, so fair skin is *high* (~80-88) and deep skin *low* (~20-35). The thresholds run the other way: `<45 → "fair"` … `else → "deep"`. Worked through typical face RGB: fair (244,219,205) → L 88 → **"deep"**; type V (141,85,36) → L 35 → **"fair"**; very deep (60,46,40) → L 20 → `null`. The bucket is then shown to the user ("detected from photo") and drives `flatteringColors` → `colorBonus`. Wrong *and* sensitive. The thresholds need reversing (`<25 → deep … >75 → fair`), and the null guards swap with them.

**MEDIUM**

**2. Positive `cultureFormality` can never change the dress-code label** — `src/lib/interview/context-engine.ts:163-167`
`level` is an integer in {0,1,2}; thresholds are `>=2` and `>=1`. Adding +0.5 (corporate, government) or +0.25 (client-facing) yields 0.5/1.5/2 — every one of which lands in the same bucket it started in. Only startup/creative (−0.5) ever move the label. The clamp itself is correct (`Math.max(0, Math.min(2, …))`), and the value is surfaced honestly on the context object — but three of the five culture options are silently inert. `context-engine.test.ts` only asserts the startup (negative) direction, which is why this is green. Fix by rounding, or by widening culture deltas to ±1.

**3. Skin-tone palette never reaches wardrobe composition** — `src/app/interview/[sessionId]/try-on/page.tsx:190-192`
`palette: session.context.recommendedColors ?? session.context.flatteringColors` — `recommendedColors` is unconditionally populated by `inferInterviewContext` (`context-engine.ts:220-225`), so the `??` branch is dead and `flatteringColors` is never used by the composer. Probably want to merge the two arrays, or prefer `flatteringColors` when present.

**4. `presentation` silently defaults to "feminine"** — `src/app/interview/page.tsx:40` and `try-on/page.tsx:194`
`EMPTY_FORM.presentation = "feminine"` and it's submitted unconditionally (`presentation: form.presentation`), so the field is never actually optional from the UI; then the try-on page re-applies `?? "feminine"` for sessions that genuinely lack it. Any user who never touches the control gets +3 on feminine templates, +1 on tops/dresses in the composer, and +3 for a dress silhouette. The schema/type model this as optional — `"neutral"` (or an empty "Prefer not to say" option, matching the skin-tone select) is the honest default.

**5. Skin-tone sampling failure discards a valid upload** — `src/app/interview/page.tsx:152-166`
`setImageBase64(base64)` succeeds, then `await sampleSkinToneFromBase64(base64)` on line 154 is inside the same `try`; any throw there hits the catch on line 163 and resets `imageBase64` to `undefined` with "Could not process this image." Fail-closed is correct for a *downscale* failure; it is wrong for a cosmetic tone-detection failure. `imageFileName` is also left set, so line 536 keeps displaying the filename for an image that will not be submitted.

**LOW**

**6.** `src/lib/outfits/ranking.ts:218-219` — `overall` is unclamped: `computeOverall` (weights sum to exactly 1.0, so ≤100) + presentation ≤3 + color ≤4 = ceiling 107, rendered as `{overall}/100` at `src/components/outfit-card.tsx:52-54`. Max reachable across every input permutation with the current six templates is **95**, so not user-visible today, but a seventh template would expose it. Floor is safe — all terms are ≥0, nothing can go negative.

**7.** `src/lib/wardrobe/composer.ts:261-263, 272, 282` — `pickBestOuterwear` and `pickAnyShoes` take only loop-invariant arguments, so all three returned combos carry the *identical* jacket and shoes; only the top/bottom pair differs. Also recomputed on every one of up to 3600 iterations.

**8.** `src/lib/wardrobe/composer.ts:150-152` vs `176-184` — the palette bonus and the accent-color penalty work against each other. `skinTone: "deep"` yields a palette of emerald/gold/royal blue (3 non-neutrals); an outfit that matches it best earns +3/piece and is then docked −3(n−1) *and* labelled "Too many accent colors — keep the palette tight." The penalty should probably exclude in-palette colors.

**9.** `src/lib/wardrobe/composer.ts:203-219` — `gaps` is computed and returned, but `try-on/page.tsx:188` destructures only `.outfits`; nothing renders gaps anywhere in the app. `buildGaps` also iterates all six categories, so a complete top+bottom+shoes+jacket wardrobe still reports "dresses at business-professional" and "accessories at …" as gaps.

**10.** `src/app/api/wardrobe/route.ts:22`, `[id]/route.ts:23` — `imageBase64` is `z.string().min(1).max(3_000_000)` with no charset check, while `src/lib/youcam/mock-provider.ts:31-33` added exactly that guard for the same class of data. Not exploitable at the current sinks (React escapes attributes; the `data:image/jpeg;base64,` prefix is fixed, so no `javascript:` smuggling) — but the two paths should be hardened the same way.

**11.** `src/app/api/wardrobe/route.ts:48` — `await req.json()` buffers the entire body before the 3 MB cap is evaluated; the cap is post-parse only.

**12.** `src/app/api/wardrobe/[id]/route.ts:15-24` — every field optional, so `PATCH {}` returns 200 and bumps `updatedAt` for nothing. `seasons: []` is also accepted and permanently fails the season check at `composer.ts:141-148` (−2 per piece, forever). Wants `.min(1)` on `seasons` and a `.refine` for at-least-one-key.

**13.** Privacy doc gap — `docs/privacy-and-safety.md` was revised in this change to be accurate about `.data/sessions.json` (good, and the "no permanent storage" claim correctly retracted), but never mentions `.data/wardrobe.json`, which now persists base64 garment photos with no TTL. Separately: `GET /api/wardrobe` is global and unauthenticated, unlike UUID-scoped sessions — every visitor sees every wardrobe photo. Fine on localhost, a real leak if this is deployed for judging.

**14.** `toPublicSession` strips `userImageBase64`, but once try-on has run, `tryOnResults[*].renderedImageUrl` is an SVG with the same selfie embedded via `<image href="data:…">` (`mock-provider.ts:45-50`). The strip is cosmetic from that point on. Intended for the preview, worth knowing.

---

### Answers to the specific questions

**1. Scoring.** Bonuses are bounded `[0, 3]` and `[0, 4]`, additive-only, so **totals can never go negative**; they *can* exceed 100 in principle (107) but max 95 in practice — see #6. **The demo is safe**: `DEMO_SCENARIO` carries no person-profile fields, and `/api/demo` posts it verbatim, so both bonuses are 0 and the ranking is unchanged — `outfit-005 = 90`, then 004=88, 001=86, 006=86, 002=80, 003=78. outfit-005 also survives `presentation: "feminine"` (93) and feminine+fair (93, tie with 006 broken deterministically by template order). It correctly loses to 004 under masculine+deep (91 vs 90) and to 001 under neutral+light (93 vs 92) — that's the personalization working, not a break, but the margins are 1-2 points, so any future template tweak can flip the headline demo card. `cultureFormality` label behaviour: see #2.

**2. Store.** Consistent with `session-store.ts` on every axis — same `withLock` promise chain, same pid-suffixed tmp + `rename`, same ENOENT→empty, same `updatedAt`/`id`/`createdAt` re-pinning, same single-process caveat comment. Prototype pollution isn't reachable: the store is array-backed (no bracket-indexed object), and zod's default strip mode drops unknown keys before `...patch` spreads. Reads bypass the lock in both stores — same trade-off, no regression. No new issues.

**3. Composer.** **No infinite loop or explosion risk** — `EXPLORATION_CAP = 60` bounds the pool, so worst case is 60×60 = 3600 combos each doing a ≤60-item filter+sort, and the loops have no state that can grow. Ordering is deterministic (stable sort, ties broken by input order, which comes from the createdAt-sorted API). The one-step-below rule works as written but is more permissive than the description: only `tops` require the outerwear rescue (`composer.ts:67-70`); bottoms, shoes, accessories and outerwear itself get an unconditional free pass one level down. Season is a soft ±2 score, not a gate, despite the "gated by formality/season/color/presentation" framing. Gaps: see #9. Score floor is ~33, never negative.

**4. API.** Empty `imageBase64` is correctly rejected (`.min(1)`), UUID validation is on all three `[id]` verbs and returns 400, 404/422/500/204 are all correct, and favorite PATCH round-trips properly (the page optimistically replaces from the response body). Gaps in #10-#12.

**5. Privacy/security.** No unexpected leak path for `imageBase64` — it's only ever echoed to the client that owns the page, and the SVG/data-URL surface is safe: `downscaleToBase64` re-encodes everything through `canvas.toDataURL("image/jpeg")`, which destroys any SVG payload before it's ever stored, and SVG-in-`<img>` can't execute script regardless. No XSS in the wardrobe page — every interpolation (`item.name`, `alt`, `why` strings) goes through React text/attribute escaping, and the `data:image/jpeg;base64,` prefix is a literal. Issues are #10, #13, #14.

**6. Client.** `downscaleToBase64` is a clean extraction and **object URLs are correctly revoked in `finally`** (`image-utils.ts:52-54`); the wardrobe/try-on previews use data URLs, so there's nothing to leak. Fail-closed on downscale failure is present and correctly reasoned in the comment. But skin-tone sampling is still present *and inverted* (#1), and it can take a good upload down with it (#5).

**7. Tests.** The five composer tests are real assertions, not smoke — but the headline rule is untested: the "outerwear rescue" test at `composer.test.ts:93-120` only asserts a **gap**, never that a top one level below is actually rescued by a qualifying jacket. Also uncovered: the accent-color penalty, output determinism, the `EXPLORATION_CAP` boundary, and an empty wardrobe. No `wardrobe-store` tests at all (lock serialization, ENOENT bootstrap, concurrent create/delete) and no route tests (PATCH validation, UUID rejection, 404 vs 422) — that matches the existing repo, where `session-store` is likewise untested, so it's a pre-existing gap rather than a regression. The P0 `cultureFormality` test covering only the negative direction is what lets #2 ship green.

---

**Recommendation: fix first — #1 (inverted skin tone) and #2 (inert positive cultureFormality) are correctness bugs in the two features' headline claims; #3 and #4 are one-line fixes that make P0's personalization actually reach P1.**
