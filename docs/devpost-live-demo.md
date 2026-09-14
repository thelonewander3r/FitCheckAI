# Devpost live-demo path

## Current product story

FitCheck is a last-mile wardrobe copilot, not a fashion moodboard: it turns one real event into one outfit decision from the closet the person already owns. The judge should see a concrete user outcome before hearing about the API.

## Suggested 1–3 minute narration

1. **0:00–0:15 — State the customer problem.** “I am leaving for a rooftop dinner and do not want ten ideas; I want one outfit I can trust.” Show the landing page promise and the event-first intake.
2. **0:15–0:45 — Run the guided plan.** Open the deterministic demo, show the event read, the lead “Wear this” look, the reason it works, and the two backups. Call out that the reference photo is editorial clothing imagery, not VTO output.
3. **0:45–1:05 — Show the last-mile value.** Highlight “One move before you go,” save the plan, and explain that FitCheck starts with owned pieces before shopping recommendations.
4. **1:05–1:40 — Show the YouCam integration.** With `YOUCAM_MODE=live` and server-only credentials, run both APIs from the plan page. **See it on you:** pick a piece, upload a photo, and show the AI Clothes render — calling out that the garment reference is the user's *own* wardrobe photo, so try-on works from a real closet with no merchant catalog. **Optional cosmetic prep:** upload a selfie and show the Skin AI observations with the cosmetic-only disclaimer.
5. **1:40–1:50 — State the boundary honestly.** AI Clothes renders one garment per task, so FitCheck nominates the piece that defines the look and lets the user switch. The rack/flat-lay showcase images are editorial references, never presented as VTO output.
6. **1:50–2:00 — Close on value.** “FitCheck is useful when it helps someone get dressed and leave — not when it generates another moodboard.”

## Minimum live demo flow

1. Start the public app with `YOUCAM_MODE=live`, `YOUCAM_API_KEY` supplied only through the server environment, and the official HTTPS base URL.
2. Add two or three wardrobe pieces with photos, so the closet is real and the garment references exist.
3. Submit one event prompt and land on the plan.
4. In **See it on you**, pick a piece and upload one permitted user/model image. Show the AI Clothes render and the "AI Clothes render · <piece>" caption.
5. In **Optional cosmetic prep**, upload a permitted selfie and show the Skin AI observations plus the cosmetic-only disclaimer.
6. Note that the rack/flat-lay showcase images are editorial references and are never sent to VTO.

## Apparel VTO status

Live Apparel VTO is wired end-to-end from the occasion plan. `LiveYouCamProvider.generateApparelTryOn()` requires both:

- `userImageBase64`: a permitted model/user image, uploaded at request time.
- `garmentImageBase64`: the photo already saved for the selected wardrobe piece.

`tryOnOccasionOutfit()` nominates the garment (`src/lib/wardrobe/garment-reference.ts`), reads that piece's photo from the wardrobe store, uploads both images server-side, creates `cloth-v4` with the mapped `garment_category`, polls the task, and stores an app-proxied result. `src/lib/services/occasion-vto-live.test.ts` asserts that whole chain against a stubbed Perfect Corp API. It has not yet been run against the live API with a real key — do that before claiming a credentialed VTO smoke test on camera.

Only pieces belonging to the selected outfit are accepted as a reference, and pieces without a saved photo return a clear 409 instead of a failed render.

The five public demo images are permission-cleared visual recipe references, not proof of Apparel VTO. Their rack/flat-lay compositions are suitable for the showcase but are never sent to live VTO.

## Exact source files

Skin AI path:

- `src/lib/youcam/client.ts` — selects mock/live provider from server environment.
- `src/lib/youcam/skin-analysis.ts` — wrapper seam plus safety filtering.
- `src/lib/youcam/live-provider.ts` — server-side upload, task creation, polling, result mapping, and URL safety.
- `src/lib/services/occasion-service.ts` — `runOccasionSkinPrep()` stores observations without the photo.
- `src/app/api/occasions/[id]/skin-prep/route.ts` — plan-page entry point.
- `src/components/occasion-skin-prep.tsx` — upload and results panel.
- `src/lib/youcam/live-provider.test.ts` — upload/polling/validation coverage.

Apparel VTO path:

- `src/lib/wardrobe/garment-reference.ts` — outfit → garment nomination and `garment_category` mapping.
- `src/lib/youcam/apparel-vto.ts` — provider wrapper.
- `src/lib/youcam/live-provider.ts` — `cloth-v4` implementation.
- `src/lib/services/occasion-service.ts` — `tryOnOccasionOutfit()` and `toPublicOccasion()` URL rewriting.
- `src/app/api/occasions/[id]/try-on/route.ts` — plan-page try-on endpoint.
- `src/app/api/occasions/[id]/try-on/[outfitId]/image/route.ts` — app-owned image proxy.
- `src/components/occasion-try-on.tsx` — piece picker, upload, and render panel.
- `src/lib/services/occasion-vto-live.test.ts` — full live chain against a stubbed API.
- `e2e/youcam-occasion.spec.ts` — browser-level try-on and skin-prep coverage.

Public clothing asset path:

- `public/demo-assets/wardrobe/*.jpg` — five optimized local visuals.
- `public/demo-assets/wardrobe/ATTRIBUTIONS.json` — exact source URLs and Unsplash License.
- `src/lib/wardrobe/showcase.ts` — five base recipes and 10 shared-piece variants.
- `src/components/wardrobe-tile-showcase.tsx` — mock-first responsive showcase.
- `src/lib/wardrobe/showcase.test.ts` — recipe/variant coverage.

## Credential and media rules

Never commit `YOUCAM_API_KEY`, signed URLs, raw user/model images, or provider responses containing temporary URLs. Use environment configuration and server-only code. The demo narration and soundtrack must use original narration or permission-cleared audio; do not add copyrighted music or unlicensed trademarks/material.
