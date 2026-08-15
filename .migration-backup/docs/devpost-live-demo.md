# Devpost live-demo path

## Current product story

FitCheck is a last-mile wardrobe copilot, not a fashion moodboard: it turns one real event into one outfit decision from the closet the person already owns. The judge should see a concrete user outcome before hearing about the API.

## Suggested 1–3 minute narration

1. **0:00–0:15 — State the customer problem.** “I am leaving for a rooftop dinner and do not want ten ideas; I want one outfit I can trust.” Show the landing page promise and the event-first intake.
2. **0:15–0:45 — Run the guided plan.** Open the deterministic demo, show the event read, the lead “Wear this” look, the reason it works, and the two backups. Call out that the reference photo is editorial clothing imagery, not VTO output.
3. **0:45–1:05 — Show the last-mile value.** Highlight “One move before you go,” save the plan, and explain that FitCheck starts with owned pieces before shopping recommendations.
4. **1:05–1:35 — Show the YouCam integration.** Switch to the permitted-image Skin AI path with `YOUCAM_MODE=live` and server-only credentials. Show upload → task → polling → mapped observations. Explain that the public app remains mock-first so the outfit decision is reliable.
5. **1:35–1:50 — State the boundary honestly.** Apparel VTO is provider-ready but not claimed from rack/flat-lay showcase imagery. A future VTO pass must map the selected outfit to a valid isolated garment reference and pass a live smoke test.
6. **1:50–2:00 — Close on value.** “FitCheck is useful when it helps someone get dressed and leave — not when it generates another moodboard.”

## Minimum live demo flow

1. Start the public app with `YOUCAM_MODE=live`, `YOUCAM_API_KEY` supplied only through the server environment, and the official HTTPS base URL.
2. Submit one permitted user/model image through the interview flow.
3. Show the returned Skin AI observations and the app's grooming/camera guidance.
4. Show the wardrobe recipe and the attribution manifest, explaining that the clothing study is mock-first and not itself a VTO result.
5. Explain that Apparel VTO is gated until a valid garment reference is ingested and paired with the same permitted user/model image.

## Apparel VTO status

The live Apparel VTO provider seam exists, but it must not be claimed as working end-to-end from the public clothing showcase alone. `LiveYouCamProvider.generateApparelTryOn()` requires both:

- `userImageBase64`: a permitted model/user image.
- `garmentImageBase64`: a valid JPEG, PNG, or WebP garment-reference image.

It uploads both images server-side, creates `cloth-v4`, polls the task, and returns an app-proxied result. The current public try-on route accepts only `outfitId`, so it does not yet prove a selected outfit-to-garment mapping. Do not use `wardrobeItems[0]` as a universal reference. A future Apparel VTO patch must pass the selected wardrobe item's ID and image, validate that mapping, and add an end-to-end smoke test with a provider fixture or approved live environment.

The five public demo images are permission-cleared visual recipe references, not proof of Apparel VTO. Their rack/flat-lay compositions are suitable for the showcase but should not be sent to live VTO unless the selected garment is isolated and accepted by the provider.

## Exact source files

Skin AI path:

- `src/lib/youcam/client.ts` — selects mock/live provider from server environment.
- `src/lib/youcam/skin-analysis.ts` — wrapper seam.
- `src/lib/youcam/live-provider.ts` — server-side upload, task creation, polling, result mapping, and URL safety.
- `src/lib/services/session-service.ts` — `analyzeSession()` invokes Skin AI and stores observations.
- `src/app/api/sessions/route.ts` — public session creation/analyze entry point.
- `src/app/api/sessions/[id]/analyze/route.ts` — session re-analysis endpoint.
- `src/lib/youcam/live-provider.test.ts` — upload/polling/validation coverage.

Apparel VTO path:

- `src/lib/youcam/apparel-vto.ts` — provider wrapper.
- `src/lib/youcam/live-provider.ts` — `cloth-v4` implementation.
- `src/lib/services/session-service.ts` — `tryOnOutfit()` and live/mocked fallback boundary.
- `src/app/api/sessions/[id]/try-on/route.ts` — current outfit-only route; reference mapping is the remaining gate.
- `src/lib/youcam/live-provider.test.ts` — input validation and cloth-v4 contract fixtures.

Public clothing asset path:

- `public/demo-assets/wardrobe/*.jpg` — five optimized local visuals.
- `public/demo-assets/wardrobe/ATTRIBUTIONS.json` — exact source URLs and Unsplash License.
- `src/lib/wardrobe/showcase.ts` — five base recipes and 10 shared-piece variants.
- `src/components/wardrobe-tile-showcase.tsx` — mock-first responsive showcase.
- `src/lib/wardrobe/showcase.test.ts` — recipe/variant coverage.

## Credential and media rules

Never commit `YOUCAM_API_KEY`, signed URLs, raw user/model images, or provider responses containing temporary URLs. Use environment configuration and server-only code. The demo narration and soundtrack must use original narration or permission-cleared audio; do not add copyrighted music or unlicensed trademarks/material.
