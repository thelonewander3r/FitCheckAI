# YouCam Integration Guide

FitCheck AI currently integrates with two YouCam APIs:

- **Skin AI** — cosmetic appearance analysis from an optional user photo
- **AI Clothes Virtual Try-On (VTO)** — renders a garment reference onto a user photo

The planned makeup extension can add:

- **AI Makeup VTO** — renders a selected makeup look on a user image
- **AI Makeup Transfer** — transfers a reference makeup look to a user image

YouCam supplies the visual analysis and rendering layer. It does **not** infer a
user's event, discover their wardrobe, or compose a multi-piece outfit from
inventory; those decisions belong to FitCheck AI's event inference and
wardrobe composer.

Official references:

- [AI Skin Analysis](https://docs.perfectcorp.com/reference/ai_skin_analysis)
- [AI Clothes Virtual Try-On](https://docs.perfectcorp.com/reference/ai_clothes)
- [AI Makeup VTO](https://docs.perfectcorp.com/reference/makeup_vto)
- [AI Makeup Transfer](https://docs.perfectcorp.com/reference/ai_makeup_transfer)

The current product path therefore stays wardrobe-first: infer a broad context
from the user's event, compose from saved wardrobe pieces, and use YouCam only
when a user photo and valid visual input are available.

The garment reference for AI Clothes is the photo the user already saved for
that wardrobe piece. That is what makes try-on possible from a real closet
rather than a catalog: the app never needs a merchant asset, because the user
photographed the garment when they added it.

### Future event-to-makeup flow

FitCheck should use the researched event context and selected outfit to choose a
makeup recommendation first (for example, a restrained daytime look versus an
evening look). YouCam AI Makeup VTO or AI Makeup Transfer can then render that
chosen look using the required user/reference images. The API is a rendering
step, not the event classifier or recommendation engine; it should not receive
unbounded web text as a styling prompt.

---

## Provider Interface

All YouCam calls go through the `YouCamProvider` interface defined in `src/lib/youcam/types.ts`:

```typescript
export interface YouCamProvider {
  analyzeSkin(input: SkinAnalysisInput): Promise<SkinAnalysisResult>
  generateApparelTryOn(input: ApparelTryOnInput): Promise<ApparelTryOnResult>
}
```

The active provider is resolved in `src/lib/youcam/client.ts`; it defaults to mock mode and selects the live provider only when `YOUCAM_MODE=live`:

```typescript
export function getYouCamProvider(): YouCamProvider {
  if (process.env.YOUCAM_MODE === 'live') {
    return new LiveYouCamProvider({
      apiKey: process.env.YOUCAM_API_KEY ?? '',
      baseUrl: process.env.YOUCAM_BASE_URL ?? 'https://yce-api-01.makeupar.com',
    })
  }
  return new MockYouCamProvider()
}
```

---

## Mock vs Live Modes

| | Mock mode | Live mode |
|---|---|---|
| `YOUCAM_MODE` env var | unset (or any value except `live`) | `live` |
| Credentials required | No | Yes |
| Skin AI output | Deterministic placeholder observations | Real YouCam API response |
| Apparel VTO output | SVG placeholder data URL | Rendered try-on image |
| `isMock` flag on results | `true` | `false` |
| Safety filtering applied | Yes | Yes |

---

## Environment Variables

| Variable | Required for live | Description |
|---|---|---|
| `YOUCAM_MODE` | — | Set to `live` to activate the live provider |
| `YOUCAM_API_KEY` | Yes | API key obtained from the YouCam developer portal |
| `YOUCAM_BASE_URL` | No | HTTPS base URL; defaults to `https://yce-api-01.makeupar.com` when omitted |

Set these in `.env.local` (never commit real keys):

```
YOUCAM_MODE=live
YOUCAM_API_KEY=your_key_here
# Optional; defaults to https://yce-api-01.makeupar.com
YOUCAM_BASE_URL=https://yce-api-01.makeupar.com
```

---

## Current Input / Output Types

The domain types in `src/lib/youcam/types.ts` are the contract used by both providers:

```typescript
export interface SkinAnalysisInput {
  /** Base64-encoded JPEG, PNG, or WebP (raw or data URL) */
  imageBase64: string
  locale?: string
}

export interface ApparelTryOnInput {
  /** Optional for mock mode; required for live AI Clothes */
  userImageBase64?: string
  /** App-level identifier; never sent as a YouCam file ID */
  garmentAssetId: string
  /** Required for live AI Clothes */
  garmentImageBase64?: string
  garmentCategory?: GarmentCategory
  outputResolution?: { width: number; height: number }
}

export interface ApparelTryOnResult {
  renderedImageUrl: string
  isMock: boolean
  processingTimeMs?: number
}
```

## Live Provider Status

The live provider uses the current Perfect Corp transport flow: upload a base64 image, create a task, poll for completion, map the response into the app types, and validate result URLs. Skin AI uses the skin-analysis task; Apparel VTO uses the cloth-v4 task. The implementation uses `fetch` and Bearer authentication without logging credentials, IDs, signed URLs, or image payloads.

The live provider has unit coverage with mocked HTTP responses. A credentialed local smoke test has verified the full Skin AI path through FitCheck AI: metadata creation, signed upload, task creation, polling through success, session creation, and mapped non-mock results.

Live Apparel VTO is now wired from the occasion plan. `src/lib/services/occasion-vto-live.test.ts` drives the real `LiveYouCamProvider` against a stubbed Perfect Corp API and asserts the whole chain: outfit → saved wardrobe photo → two signed uploads → `cloth-v4` with the mapped `garment_category` → poll → stored render → proxied public URL. It has not yet been exercised against the live API with a real key.

## Live Requirements and Caveats

1. Set `YOUCAM_MODE=live` and provide `YOUCAM_API_KEY`.
2. `YOUCAM_BASE_URL` is optional; when omitted, the client uses `https://yce-api-01.makeupar.com`. It must be an HTTPS URL without embedded credentials.
3. Supply valid JPEG, PNG, or WebP base64 data. Both APIs validate image dimensions before upload, so an unusable image fails without spending an API unit.
4. Live Apparel VTO requires both `userImageBase64` and `garmentImageBase64`. `garmentAssetId` is only an app identifier and cannot substitute for the garment reference image.
5. Try-on is offered only for pieces that have a saved wardrobe photo. A piece without one returns HTTP 409 and a "add the piece with a photo" message rather than a failed render.

## Outfit → garment mapping

AI Clothes renders one garment per task, so `src/lib/wardrobe/garment-reference.ts`
nominates the piece that defines a composed look and maps it to a Perfect Corp
`garment_category`:

| Wardrobe category | `garment_category` | Precedence |
|---|---|---|
| `dresses` | `full_body` | 1 |
| `outerwear` | `outer` | 2 |
| `tops` | `upper_body` | 3 |
| `bottoms` | `lower_body` | 4 |

`shoes` and `accessories` are never sent. The user can override the default by
picking another piece, but only pieces belonging to that outfit are accepted, so
a request can never point the renderer at something outside the composed look.

Optional live tuning variables are `YOUCAM_TIMEOUT_MS`, `YOUCAM_POLL_INTERVAL_MS`, and `YOUCAM_SKIN_ACTIONS`. Keep real credentials in `.env.local`; never commit them.

---


## Safety Contract

Both the mock provider and the live provider **must** produce output that is safe for `applySkinSafety()`. The live provider implementation must:

- Never surface medical / diagnostic language in `SkinAnalysisResult.observations`
- Never include attractiveness or hiring language in suggestions
- Accept that `applySkinSafety()` will silently drop any unsafe items

The safety layer is applied at the **service layer** (`src/lib/services/session-service.ts`), not in the provider itself, so even a buggy live integration cannot bypass it.

---

## Skin AI — Data Flow

```
POST /api/occasions/:id/skin-prep   { imageBase64 }
  (or /api/sessions, /api/sessions/:id/analyze in the interview flow)
  │
  └─► runSkinAnalysis({ imageBase64 })           ← src/lib/youcam/skin-analysis.ts
        │
        ├── getYouCamProvider().analyzeSkin(input)
        │     ├── [mock] returns deterministic SkinAnalysisResult
        │     └── [live] calls YouCam Skin AI endpoint → maps response
        │
        └── applySkinSafety(result)               ← safety filter
              └── stored as skinPrep on the occasion (photo is not persisted)
                    └── rendered in the "Optional cosmetic prep" panel
```

## Apparel VTO — Data Flow

```
POST /api/occasions/:id/try-on   { outfitId, userImageBase64, itemId? }
  │
  └─► tryOnOccasionOutfit()                ← src/lib/services/occasion-service.ts
        │
        ├── selectGarmentReference(outfit.items, itemId)
        │     └── nominates the piece + maps garment_category
        │
        ├── getItem(pieceId).imageBase64   ← the user's own wardrobe photo
        │
        ├── runApparelVto({ userImageBase64, garmentImageBase64, garmentCategory })
        │     ├── [mock] returns SVG data URL
        │     └── [live] upload ×2 → cloth-v4 → poll → signed result URL
        │
        └── stored as tryOnResults[outfitId] on the occasion
              ├── user photo is never persisted
              └── toPublicOccasion() rewrites live URLs to
                  /api/occasions/:id/try-on/:outfitId/image
```

The legacy interview flow keeps its own `POST /api/sessions/:id/try-on` route.
Its outfits are static templates with no garment images, so live try-on there
still requires a garment reference the templates do not carry.
