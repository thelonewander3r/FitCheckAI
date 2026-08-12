## Per-fix verdicts

| # | Fix | Verdict |
|---|---|---|
| 1 | Atomic tmp+rename + promise-chain lock | **PASS-WITH-NOTE** |
| 2 | Merge-based `tryOnResults` inside the lock | **PASS** |
| 3 | UUID validation → 400 | **PASS-WITH-NOTE** |
| 4 | `Object.hasOwn` guards | **PASS** |
| 5 | `res.ok` guards + inline error state | **PASS-WITH-NOTE** |
| 6 | `analyzeSession` sets `failed` | **PASS** |
| 7 | `outfitId` validated against `session.outfits` | **PASS-WITH-NOTE** |
| 8 | XML-escape of SVG labels | **PASS** |
| 9 | Footer disclaimer in layout | **PASS** |
| 10 | demo-script narration matches output | **FAIL** |

**Notes on the PASS-WITH-NOTEs**

- **#1** `withLock` (session-store.ts:43) is correct — `queue.then(fn, fn)` runs the next job on both settle paths and `queue = run.catch(()=>{})` keeps the chain alive without an unhandled rejection. No re-entrancy risk: locked functions call `readSessions`/`writeSessions` directly, never each other. `getSession` deliberately skips the lock, which is safe now that writes land via rename. Caveats in finding 6 below.
- **#3** All five id-taking API routes validate. `zod@4` still honours `z.string().uuid()`, and `crypto.randomUUID()` v4 ids pass. Gap: the Server Component at `src/app/interview/[sessionId]/analysis/page.tsx:29` passes the raw param straight to `getSession` — it's safe only because of fix #4 (returns null → `redirect("/interview")`).
- **#5** `handleTryOn` and `handleSelect` are correct, including the JSON-parse-failure fallback. `handleContinue` was missed — see finding 1.
- **#7** Validation itself is right and correctly ordered before the VTO call. Status-code mapping is the known blemish.
- **#10** I verified the score line (demo-script.md:54) by hand against `ranking.ts` for the demo intake: outfit-005 = 90, outfit-004 = 88, outfit-001 = 86 (ties with outfit-006 at 86, stable sort keeps 001 third). That line and the 80%-confidence line are now accurate. Three other claims are not — findings 2–4.

## New issues

**1. Medium — `src/app/interview/[sessionId]/try-on/page.tsx:96`** — `handleContinue` POSTs `/plan` with no `res.ok` check and navigates regardless. `plan/page.tsx:35` repeats the POST, also unguarded, then falls into the `!session?.plan` branch — so a failed plan generation leaves the user on an infinite "Building your plan…" spinner with no error and no way out. This is the demo's most-watched click. Same treatment as the other two handlers: check `res.ok`, set `actionError`, and don't navigate.

**2. Medium — `docs/demo-script.md:38`** — "warns against patterns like fine stripes that can create a moiré effect on camera." The demo scenario is `onsite`, so `context-engine.ts:188-191` yields only `["loud prints", "neon", "overly busy patterns"]`; the fine-stripes/moiré set is video-only. The narration contradicts the badges on screen.

**3. Low — `docs/demo-script.md:92`** — "Safety terms blocked | ~30 prohibited patterns". `PROHIBITED_TERMS` (skin-safety.ts:14-61) has 43 entries (22 + 11 + 10).

**4. Low — `docs/demo-script.md:93`** — "~15 across three checkpoints". Onsite produces 18 (5 five-day + 6 night-before + 7 one-hour); video produces 19.

**5. Low — `src/lib/youcam/mock-provider.ts:32`** — `btoa` throws `InvalidCharacterError` on any non-Latin1 character, and `escapeXml` doesn't make the string Latin1-safe. Unreachable today only because fix #7 restricts `garmentAssetId` to catalogue ids — one validation layer away from a 500. Dropping the `btoa` branch for unconditional `Buffer.from(svg, "utf8")` removes the hazard.

**6. Low — `src/lib/session-store.ts:14,41`** — the lock is per-module-instance process state and `SESSIONS_TMP` is a single fixed path. Two server processes (clustered `next start`, or a second dev server) will clobber each other's tmp file and lose updates; the rename buys atomicity but not mutual exclusion. Also no `fsync` before rename. Fine for a demo, worth a comment stating the single-process assumption; a `sessions.json.${process.pid}.tmp` name is a cheap hedge.

**7. Nit — `src/app/layout.tsx:37` with `src/app/page.tsx:5`** — the footer is correctly single-instanced, but every page root still uses `min-h-screen`, so the disclaimer sits below the fold on every route. `flex-1` on page roots would seat it in the `flex flex-col` body.

## Minimal fix for the known blemish

In `try-on/route.ts` and `select/route.ts`, add one branch after the existing not-found check (the service already throws a distinct message, so no service change is needed):

```ts
if (msg.includes("Invalid outfit")) {
  return NextResponse.json(
    { error: "Unknown outfitId for this session." },
    { status: 422 },
  );
}
```

Two lines in each file. It also covers the "analyze hasn't run yet" case, since `session.outfits` is undefined there; if you want that distinguished, have `tryOnOutfit`/`selectOutfit` throw `"No ranked outfits"` in that case and map it to 409 as `plan/route.ts` already does.

**Recommendation:** Ship after fixing the `handleContinue` guard (finding 1) and the four demo-script inaccuracies (findings 2–4) — the store, locking, validation, and escaping fixes are all sound.
