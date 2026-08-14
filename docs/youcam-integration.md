# YouCam Integration Guide

InterviewReady AI integrates with two YouCam APIs:

- **Skin AI** — cosmetic appearance analysis from a candidate photo
- **Apparel Virtual Try-On (VTO)** — renders a garment asset onto a user photo

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

`src/lib/youcam/live-provider.ts` contains the live implementation. It uses the current Perfect Corp transport flow: upload a base64 image, create a task, poll for completion, map the response into the app types, and validate result URLs. Skin AI uses the skin-analysis task; Apparel VTO uses the cloth-v4 task. The implementation uses `fetch` and Bearer authentication without logging credentials, IDs, signed URLs, or image payloads.

The live provider has unit coverage with mocked HTTP responses, but it has **not** had a credentialed smoke test. Mock mode remains the verified/default submission path.

## Live Requirements and Caveats

1. Set `YOUCAM_MODE=live` and provide `YOUCAM_API_KEY`.
2. `YOUCAM_BASE_URL` is optional; when omitted, the client uses `https://yce-api-01.makeupar.com`. It must be an HTTPS URL without embedded credentials.
3. Supply valid JPEG, PNG, or WebP base64 data. Live Skin AI validates image dimensions before upload.
4. Live Apparel VTO requires both `userImageBase64` and `garmentImageBase64`. `garmentAssetId` is only an app identifier and cannot substitute for the garment reference image.
5. The current built-in outfit templates and `/api/sessions/:id/try-on` route do not ingest garment reference assets, so live Apparel VTO remains unavailable for the default outfit flow until asset ingestion is added.

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
POST /api/sessions (or /api/sessions/:id/analyze)
  │
  └─► runSkinAnalysis({ imageBase64 })           ← src/lib/youcam/skin-analysis.ts
        │
        ├── getYouCamProvider().analyzeSkin(input)
        │     ├── [mock] returns deterministic SkinAnalysisResult
        │     └── [live] calls YouCam Skin AI endpoint → maps response
        │
        └── applySkinSafety(result)               ← safety filter
              └── stored on session + rendered on analysis page
```

## Apparel VTO — Data Flow

```
POST /api/sessions/:id/try-on   { outfitId }
  │
  └─► runApparelVto({ userImageBase64, garmentAssetId: outfitId })
        │                                         ← src/lib/youcam/apparel-vto.ts
        ├── getYouCamProvider().generateApparelTryOn(input)
        │     ├── [mock] returns SVG data URL
        │     └── [live] calls YouCam Apparel VTO endpoint
        │
        └── stored as tryOnResults[outfitId] on session
              └── rendered in OutfitCard on the try-on page
```
