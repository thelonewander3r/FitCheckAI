Gates verified independently: `npx tsc --noEmit` exit 0, `vitest run` 72/72 passing in 5 files. No files modified.

## Verdicts per concern

**1. Persistence semantics — PASS with a caveat**
`analyzeSession` (session-service.ts:82-84) conditionally spreads `userImageBase64` only when a non-empty image arrives, so a re-analyze without an upload preserves the existing photo rather than clobbering it with `undefined`. That's the right call for the re-analyze flow. Caveat: there is consequently **no code path that can clear the photo** — not empty string, not re-analyze, not session completion. `tryOnOutfit` (session-service.ts:106-108) correctly normalizes empty-string to `undefined` before calling the provider.

**2. Privacy — FAIL (new exposure surface)**
See NEW-1 and NEW-2 below. The doc rewrite in `docs/privacy-and-safety.md` is honest and accurate about on-disk storage and the missing TTL — that part is good, and I'd rather have the truthful doc than the old "not written to disk" claim. But the doc omits that the selfie is now returned to the client in every session API response.

**3. SVG XML-safety — FAIL (see NEW-4)**
`escapeXml` is applied to the label but **not** to `userImageBase64`, which is interpolated raw into an attribute value at mock-provider.ts:39. Real base64 is inert in XML (`A-Za-z0-9+/=` contains no `"`, `<`, `&`), so the happy path is safe — but nothing validates that the string *is* base64.

**4. Type change vs. live provider stub — PASS**
`LiveYouCamProvider.generateApparelTryOn` takes `_input`, calls `void _input`, and throws `YouCamConfigurationError` unconditionally (live-provider.ts). Widening `userImageBase64` to optional cannot break it; typecheck confirms. The only cost is a silently weakened contract: the commented reference skeleton passes `_input.userImageBase64` into the request body, and TS will no longer flag a caller that omits the photo when someone implements it for real. A `TODO` noting "live provider must reject missing userImageBase64" would close that.

**5. Downscale fallback — FAIL (see NEW-3, NEW-5)**
The happy path is correct: aspect-ratio-preserving 512px longest edge, `Math.max(1, ...)` guards degenerate dimensions, `URL.revokeObjectURL` in a `finally`. The fallback is the problem.

**6. Placeholder path — PASS**
`/api/demo` → `analyzeSession(id)` with no image → no `userImageBase64` on the session → `tryOnOutfit` passes `undefined` → mock-provider.ts:43-46 else-branch renders the original grey rect. Behavior is byte-identical to pre-change. Untested, though (NEW-6).

**7. sessions.json bloat — FAIL (see NEW-2)**

---

## New issues

**NEW-1 · MEDIUM-HIGH · privacy — `src/app/api/sessions/[id]/route.ts:24`**
`NextResponse.json(session)` serializes the entire `StoredSession`, which now carries `userImageBase64`. The raw selfie is therefore echoed back to the browser on every session GET, and also on the analyze (`analyze/route.ts:28`) and try-on (`try-on/route.ts:39`) POST responses. The session ID is an unauthenticated bearer credential (UUID, no auth check), so anyone holding a URL gets the photo bytes, not just the derived results. Pre-change these endpoints returned no image data at all. Fix: strip `userImageBase64` in a serializer before returning, and say so in the privacy doc.

**NEW-2 · MEDIUM · storage/perf — `src/lib/services/session-service.ts:124-126` + `src/lib/session-store.ts:71-81`**
Bloat is worse than one copy per session. Each `tryOnResult` stores `renderedImageUrl`, which is a base64-encoded SVG that **embeds the base64 photo again** — double base64 encoding, ≈1.78× the original per outfit. With 3 outfits: ~54 KB raw + 3 × ~72 KB ≈ **270 KB per session**. `writeSessions` rewrites the whole file (`JSON.stringify(sessions, null, 2)`, pretty-printed) on *every* `updateSession`, so each try-on click re-serializes every session's photos, and every GET re-parses them. With no TTL sweep (acknowledged in the doc) this grows monotonically. Storing the garment ID and rendering the composite on read, or capping retained `tryOnResults`, would avoid the multiplier.

**NEW-3 · MEDIUM · correctness/privacy — `src/app/interview/page.tsx:107-108`**
The catch-all fallback assigns `originalBase64` — the **full-size, un-downscaled original**, up to 15 MB → ~20 MB base64. This is the exact case the downscale exists to prevent, and it triggers on the most common real input: an iPhone HEIC selfie, which `new Image()` fails to decode in most browsers. So the mainstream mobile path silently uploads a 15 MB payload, persists it to `sessions.json`, and then hands unknown-format bytes to `sniffImageMime` (mock-provider.ts:24-29), which defaults them to `image/jpeg` and produces a broken `<image>` inside the SVG. The `accept="image/jpeg,image/png,image/webp"` attribute at page.tsx:385 is a filter hint only — it does not block HEIC on iOS. Failing closed (show `imageError`, don't upload) is safer than falling back to the original.

**NEW-4 · MEDIUM · injection/robustness — `src/lib/youcam/mock-provider.ts:39`**
`href="data:${mime};base64,${userImageBase64}"` interpolates an unescaped, unvalidated string into an XML attribute. Nothing upstream validates the base64 alphabet: `sessions/route.ts:32-33` and `analyze/route.ts:22` accept any `typeof === "string"`, and `imageBase64` is excluded from `IntakeSchema` entirely. A POST with `imageBase64: '"/><foo bar="'` breaks out of the attribute. Not XSS in practice — `outfit-card.tsx:75-81` renders it via `next/image`, i.e. an `<img>`, where SVG script execution is blocked and the `onError` handler degrades to the placeholder icon. So the realistic impact is a corrupted preview plus arbitrary markup inside a stored artifact, not code execution. Fix is one line: run the value through `escapeXml`, or better, reject anything not matching `/^[A-Za-z0-9+/]+={0,2}$/`.

**NEW-5 · LOW-MEDIUM · correctness — `src/app/interview/page.tsx:77`**
`await readAsBase64(file)` sits *outside* the `try`. If `FileReader` errors, the promise rejects, `handleFileChange` rejects unhandled (nothing awaits an `onChange` handler), and the function exits after `setImageFileName(file.name)` has already run at line 64. If a previous upload succeeded, `imageBase64` still holds **image A while the filename label shows image B** — the user submits the wrong photo with no error shown. Moving line 77 inside the `try` (or wrapping it) fixes it.

**NEW-6 · LOW · test coverage — `src/lib/youcam/mock-provider.test.ts:69-128`**
Every `generateApparelTryOn` test passes `userImageBase64: 'dGVzdA=='`, so all 7 exercise the new photo branch and **zero** cover the `undefined` placeholder branch — the branch the demo flow actually uses. No test asserts the photo is embedded, either; the existing assertions pass identically in both branches because the label is present in both. Two tests (`toContain('<image href=')` with a photo, `toContain('rx="12"')` without) would lock the branch selection in.

**NEW-7 · LOW · compat — `src/lib/youcam/mock-provider.ts:39`**
The `<image>` element uses the SVG2 plain `href` with no `xlink:href` fallback and no `xmlns:xlink` declaration. Modern Chrome/Firefox handle this, but SVG rendered in the restricted `<img>` context has historically been the weakest spot for SVG2 `href` support in Safari. Worth a cross-browser spot-check before demoing on a Mac; emitting both attributes costs nothing.

---

**Recommendation:** Do not merge as-is — fix NEW-1 (strip the selfie from API responses), NEW-3 (fail closed instead of falling back to the full-size original), and NEW-4 (validate/escape the base64) before this ships; NEW-2 and NEW-5/6 can follow as fast-follows.
