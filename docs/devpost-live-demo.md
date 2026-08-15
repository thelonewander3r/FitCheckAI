# Devpost live-demo path

## Current recommendation

Use live Skin AI as the guaranteed judge-visible YouCam integration. The existing session analysis path accepts a permitted user photo, uploads it server-side, creates the Skin Analysis task, polls it, and stores mapped observations. The mock provider remains the default when `YOUCAM_MODE` is absent.

Minimum live demo flow:

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
