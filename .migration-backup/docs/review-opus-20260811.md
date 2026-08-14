I've read all of `src/`, `prisma/`, `e2e/`, and `docs/`, and verified the non-obvious claims by execution (ranking math, prototype-key behavior) and against `node_modules/next/dist/docs/`. No files modified.

# Pre-commit review — InterviewReadyAI

**First, the thing you asked about that isn't a problem:** there is no XSS in rendered analysis text. `dangerouslySetInnerHTML`, `innerHTML`, `eval`, and `new Function` have zero occurrences in `src/` (grep-verified). Every analysis/plan/skin string reaches the DOM as a JSX text node, which React escapes. The one place markup is *generated* from untrusted input is finding #9 below. `.env` is correctly gitignored and no secrets appear in tracked source.

---

## High

### 1. Non-atomic writes to the session store can silently destroy every session
`src/lib/session-store.ts:50-59` (with `:41-48`)

`writeSessions` calls `fs.writeFile` directly on `sessions.json`, which truncates before writing. If the process dies mid-write, or two writes interleave, the file is left as invalid JSON. `readSessions` at `:43-47` swallows the parse error and returns `{}` — so **every session disappears with no error surfaced anywhere**. The demo just quietly restarts from empty.

Compounding it: there is no lock. `readSessions → mutate → writeSessions` is a read-modify-write across an `await` boundary in `createSession` (`:64-75`) and `updateSession` (`:88-99`), so two concurrent requests both read the old map and the second write drops the first's changes.

**Fix:** write to `sessions.json.tmp` then `fs.rename` (atomic on the same filesystem), and serialize all store access through a module-level promise chain:
```ts
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}
```
Wrap `createSession`/`updateSession` bodies in `withLock`. Also consider distinguishing "file missing" (→ `{}`) from "parse failed" (→ throw) at `:45`, so corruption is loud rather than silent.

### 2. Concurrent try-ons overwrite each other
`src/lib/services/session-service.ts:92-111`

`session` is read at `:92`, *before* the VTO call at `:96`. `existingTryOns` at `:108` then merges into that stale snapshot. The try-on page lets the user click "Virtual Try On" on all three cards (`src/app/interview/[sessionId]/try-on/page.tsx:180` — `loadingTryOn` only disables the one card being clicked), so this is reachable in a normal demo: fire two try-ons, the second response drops the first result and the first card reverts to "Try on to preview".

**Fix:** re-read inside the write, ideally by giving the store a merge-based update:
```ts
await storeUpdate(id, (curr) => ({
  tryOnResults: { ...(curr.tryOnResults ?? {}), [outfitId]: vtoResult },
}));
```
Combined with the lock from #1 this becomes correct. Client-side, also guard against out-of-order responses in `handleTryOn` (`try-on/page.tsx:46-62`).

### 3. The demo script narrates outfits the app will never show
`docs/demo-script.md:53-55`

I ran the actual ranking for `DEMO_SCENARIO` (financial / onsite / final / $200). Results:

| # | Outfit | Overall |
|---|---|---|
| 1 | Structured Jacket & Tailored Trousers | 90 |
| 2 | Charcoal Blazer & Black Trousers | 88 |
| 3 | Navy Blazer & Charcoal Trousers | 86 |
| 4 | Professional Dress with Blazer | 86 |
| **5** | **Classic Gray Suit** | **80** |

The script says *"The Classic Gray Suit leads on role fit… The Navy Blazer scores better on budget fit."* Classic Gray Suit ranks **5th** and is cut by `selectTopOutfits(..., 3)` (`session-service.ts:65-71`). It will not be on screen. It loses on budget (250 vs 200 → budgetFit 75) despite winning role fit — the narration describes a comparison the judges can't see.

Two more mismatches in the same doc:
- `docs/demo-script.md:66` — *"Day 5 is for sourcing and steaming… Day 1 is for a final fit check and packing."* This is **inverted**. `src/lib/prep/plan-generator.ts:38` makes Day 1 sourcing; `:42` makes Day 5 hang-the-outfit.
- `docs/demo-script.md:66` — *"the one-hour checklist covers grooming and camera setup."* For the onsite demo scenario there is no camera setup; those items are in the `video` branch only (`plan-generator.ts:68-74`), and onsite gets the arrive-early/résumé branch (`:76-80`).

**Fix:** rewrite the narration against actual output, or (better for the demo) make Classic Gray Suit actually surface — e.g. raise the demo budget to 250, which is a one-line change in `demo-scenario.ts:15`. Rehearse against real output before committing.

---

## Medium

### 4. Session IDs are unvalidated and used directly as object keys
`src/lib/session-store.ts:81` and `:89`; reachable from every `[id]` route

`sessions[id]` with an attacker-controlled `id` hits inherited properties. Verified in node:

- `GET /api/sessions/__proto__` → `sessions["__proto__"] ?? null` returns `Object.prototype`, which is truthy → **200 with `{}` instead of 404**.
- `POST /api/sessions/__proto__/analyze` → `storeGet` "succeeds", then `intake.jobTitle` at `session-service.ts:45` throws on `undefined` → 500.
- `updateSession("__proto__", …)` at `:98` executes `sessions["__proto__"] = updated`, which **reassigns the prototype of the sessions map** (confirmed: `Object.getPrototypeOf(sessions) === updated`). `constructor` behaves similarly.

It stops short of High because `readSessions` rebuilds the map per request, so the pollution doesn't persist across requests or reach the file (`JSON.stringify` only emits own props). But it would become High the moment the store is switched to an in-memory or long-lived map — and the fix is one line.

**Fix:** `z.uuid()` on the param in each route, and use `Object.hasOwn(sessions, id)` (or `Map`, or `Object.create(null)`) in the store.

### 5. The uploaded selfie is never used for virtual try-on
`src/lib/services/session-service.ts:97`

`tryOnOutfit` hardcodes `PLACEHOLDER_IMAGE_BASE64` — the 1×1 transparent PNG — as `userImageBase64`. The user's photo is passed to skin analysis at `:56` but is never persisted on the session, so it is unavailable by the time try-on runs. VTO therefore cannot personalize **even in live mode**. Meanwhile the UI promises: *"Upload a selfie to enable personalised skin analysis and virtual try-on"* (`src/app/interview/page.tsx:303-304`).

**Fix:** store the image on the session during `analyzeSession` (via `saveTempImage` — see #9 — and keep the returned path, not the base64, on `StoredSession`), then read it in `tryOnOutfit`. If that's out of scope for the hackathon, soften the UI copy so it doesn't claim personalized try-on.

### 6. A failed try-on or select response wipes the page
`src/app/interview/[sessionId]/try-on/page.tsx:55-56` and `:72-73`

Neither handler checks `res.ok`. On a 404/500 the body is `{ error: "…" }`, which is cast to `StoredSession` and pushed into state. `session.outfits` is then undefined, so the guard at `:106` renders the "Loading outfit recommendations…" spinner **forever** — one failed request destroys the whole page with no error shown and no recovery.

**Fix:**
```ts
if (!res.ok) { /* surface a toast/inline error */ return; }  // keep previous session state
```

### 7. A session can get permanently stuck in "analyzing"
`src/lib/services/session-service.ts:40`, `src/app/interview/[sessionId]/analysis/page.tsx:33-59`

`analyzeSession` sets `status: "analyzing"` and never reverts it on failure. Skin analysis is guarded (`:54-63`), but if `inferInterviewContext`, `selectTopOutfits`, or the final `storeUpdate` throws, the session stays `analyzing` forever. The analysis page renders a static spinner for that state with no polling, no refresh, and no retry link — a dead end.

**Fix:** wrap the body in try/catch and set a terminal `failed` status; add a retry action (or a bounded poll) to the `analyzing` branch of the page.

### 8. `outfitId` is never checked against the session's outfits
`src/app/api/sessions/[id]/select/route.ts:33`, `try-on/route.ts:33`, `session-service.ts:117-130` and `:87-115`

`SelectBody`/`TryOnBody` validate only `z.string().min(1)`. `selectOutfit` writes any string to `selectedOutfitId`. `generatePlan` then does `outfits.find(o => o.id === selectedId) ?? outfits[0]!` (`:143-145`) — so a bogus selection **silently falls back to the top-ranked outfit** and the plan disagrees with what the user picked, with no error. Try-on likewise accumulates arbitrary keys in `tryOnResults`.

**Fix:** in both service functions, `if (!session.outfits?.some(o => o.id === outfitId)) throw` → 422 at the route.

### 9. Untrusted input interpolated into generated SVG markup
`src/lib/youcam/mock-provider.ts:14-20, 81-83`

`garmentAssetId` — which is the request-body `outfitId`, unvalidated per #8 — is interpolated raw into `<text …>${label}</text>` and base64'd into a `data:image/svg+xml` URL.

To be precise about the severity: this is **not** exploitable XSS as currently rendered. `OutfitCard` passes it to `next/image` (`src/components/outfit-card.tsx:75-81`), and Next forces `unoptimized = true` for `data:`/`blob:` sources (verified at `node_modules/next/dist/shared/lib/get-img-props.js:270`), so it lands in a plain `<img src>`, where SVG script content does not execute. But this is unescaped markup generation whose safety rests entirely on the render context — swap the `<img>` for `<object>`/`<iframe>`, add an "open preview in new tab" affordance, or have a live provider echo the id, and it becomes stored XSS.

**Fix:** XML-escape `& < > " '` before interpolation, and fix #8 so the id is constrained to known outfits.

### 10. Path traversal latent in `temp-images.ts`
`src/lib/storage/temp-images.ts:22`, `:27-33`

`path.join(dir, `${sessionId}-${Date.now()}.${ext}`)` with an untrusted `sessionId` escapes `dir` via `../`. `deleteTempImage` will `unlink` any absolute path handed to it.

Currently **neither function has a single caller** (grep-verified across `src/`) — it's dead code, which is the only reason this isn't High. It's also exactly the module #5 needs to wire up, so fix it before it goes live rather than after.

**Fix:** validate `sessionId` as a UUID, and assert containment on the resolved path:
```ts
const full = path.resolve(dir, `${sessionId}-${Date.now()}.${ext}`);
if (!full.startsWith(path.resolve(dir) + path.sep)) throw new Error("Invalid session id");
```
Apply the same containment check in `deleteTempImage`.

### 11. The privacy doc makes claims the code doesn't back
`docs/privacy-and-safety.md:14`, `:19`, `:86`

- `:14` says images are *"Not written to disk"*; `:19` says *"Session data (including any image payload) lives in `.data/sessions.json`"*. These contradict each other, and neither is accurate — the image is passed to `runSkinAnalysis` and then dropped entirely, persisted nowhere.
- `:19` calls the store *"ephemeral… for the duration of the browser session."* There is **no expiry and no cleanup anywhere** in `session-store.ts`. `sessions.json` accumulates candidate names, job titles, employers, and full job descriptions indefinitely. The retention requirements at `:21-26` are written as future-implementer guidance, but the doc's present-tense "ephemeral" claim is what a reader will believe.
- `:86` mandates a footer disclaimer *"rendered in the app footer."* It exists **only** on the landing page (`src/app/page.tsx:118-121`) and is not in `layout.tsx:35` — so it's absent on analysis, try-on, and plan: precisely the pages that display skin and outfit guidance.

**Fix:** move the footer into `layout.tsx`; correct `:14`/`:19` to state that images are never persisted and that session records currently have no TTL; or add a `createdAt`-based sweep on read.

### 12. Safety filter matches substrings, drops legitimate text silently
`src/lib/safety/skin-safety.ts:78-93`, `:119-124`

`lower.includes(term)` has no word boundaries. `"race"` matches emb**race**, **grace**ful, t**race**; `"hire"` matches New Hamp**shire**; `"condition"` matches air **condition**ing; `"medical"`, `"ethnic"`, `"benign"` have similar neighbors. Matches are dropped with no logging, so when a live provider returns *"Embrace your natural texture"* it vanishes and nobody knows why. The mock data is clean, so all 72 tests stay green while the filter is wrong.

**Fix:** word-boundary regex per term (`new RegExp(`\\b${escape(term)}`, "i")` — keeping the prefix semantics that `diagnos`/`patholog` rely on), and `console.warn` the dropped items so filtering is observable.

### 13. No size limits on any input
`src/lib/validation/schemas.ts:32-50`, `src/app/api/sessions/route.ts:30-31`

No `.max()` on any string field, and `imageBase64` is accepted as *any* string — no size cap, no MIME check, no base64 validation. The client reads whatever the file picker returns (`src/app/interview/page.tsx:49-60`) with no size guard either.

`serverActions.bodySizeLimit` does **not** apply here — it's Server-Actions-only (confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md:24-28`), and these are Route Handlers. So the effective cap is whatever the deployment platform imposes (Vercel ~4.5MB), meaning a normal modern phone selfie fails with a generic 500 in production but works locally. Multi-megabyte job descriptions persist to `sessions.json` permanently.

**Fix:** `.max(200)` on titles/company, `.max(20_000)` on `jobDescription`; validate `imageBase64` length (`<= ~4MB` decoded) and sniff the magic bytes for JPEG/PNG/WebP; add a matching client-side check with a clear message.

---

## Low

14. **Store won't survive serverless deployment** — `session-store.ts:12` writes under `process.cwd()`. Read-only/ephemeral on Vercel or Lambda. Fine for a local demo, but `docs/architecture.md:132` presents the file store as a clean MVP choice without noting it can't be deployed as-is.

15. **`inferredIndustry` overrides what the user typed** — `context-engine.ts:81` derives the industry from the matched keyword, so entering "Financial Services" displays "Industry: **Financial**" (`analysis/page.tsx:106`). `docs/demo-script.md:37` claims it "identified the financial-services industry." Prefer `input.industry` when supplied.

16. **Five-day checklist is emitted even when the interview is tomorrow** — `plan-generator.ts:31-44` always returns 5 day-numbered items; only the final label varies, producing "[Day 5 / 1 day out]". Compress the list to `daysAway` when it's under 5.

17. **Past interview dates pass server validation** — `schemas.ts:41-46` is a regex only; the `min` attribute at `interview/page.tsx:160` is client-side and trivially bypassed. `daysUntil` clamps to 0, yielding "You have 0 days until your interview."

18. **Pre-commit hygiene** — `playwright-report/index.html` and `test-results/.last-run.json` are untracked and absent from `.gitignore` (`:1-53`), so they'd land in this commit; Playwright reports can embed traces and screenshots. `docs/review-opus-20260811.md` is a 0-byte stray file. Add `/playwright-report/` and `/test-results/` to `.gitignore` and delete the empty doc.

19. **Error routing by string matching** — `analyze/route.ts:28`, `plan/route.ts:19-27`, `select/route.ts:38`, `try-on/route.ts:38` all branch on `msg.includes("not found")`. Any refactor of the message text silently converts 404s into 500s. Use typed error classes (`SessionNotFoundError`).

---

## Prioritized action list

**Must fix before commit**
1. Atomic write + lock in `session-store.ts` (#1) — silent total data loss is the worst failure mode here.
2. Re-read inside `tryOnOutfit`'s update (#2) — visibly breaks during a normal demo.
3. Correct `docs/demo-script.md`, or bump the demo budget to 250 (#3) — the script currently describes a screen that won't exist.
4. `res.ok` guards in `try-on/page.tsx` (#6) — one failed request kills the page.

**Should fix before demo**
5. Validate session IDs (`z.uuid()`) and use `Object.hasOwn` (#4) — one line each, closes a 200-instead-of-404 and a 500.
6. Validate `outfitId` against the session's outfits (#8) — also defuses #9.
7. Reset status on analyze failure + retry affordance (#7).
8. Move the footer disclaimer into `layout.tsx` and reconcile the privacy doc (#11) — it's a stated safety commitment.

**Before any live provider or real users**
9. Fix `temp-images.ts` traversal before wiring it up (#10), then thread the real image into VTO (#5).
10. Word boundaries + logging in the safety filter (#12).
11. Input size limits, client and server (#13).
12. Escape the SVG interpolation (#9).

**Cleanup**
13. `.gitignore` the Playwright artifacts, delete the empty review doc (#18); then items 14-17, 19 as time allows.
