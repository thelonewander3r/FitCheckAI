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

The active provider is resolved at startup in `src/lib/youcam/index.ts`:

```typescript
export function getYouCamProvider(): YouCamProvider {
  if (process.env.YOUCAM_MODE === 'live') {
    return new LiveYouCamProvider({
      apiKey: process.env.YOUCAM_API_KEY ?? '',
      baseUrl: process.env.YOUCAM_BASE_URL ?? '',
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
| `YOUCAM_BASE_URL` | Yes | Base URL for YouCam endpoints (e.g. `https://api.youcam.example.com`) |

Set these in `.env.local` (never commit real keys):

```
YOUCAM_MODE=live
YOUCAM_API_KEY=your_key_here
YOUCAM_BASE_URL=https://api.youcam.example.com
```

---

## Input / Output Types (with TODOs)

### `SkinAnalysisInput`

```typescript
// src/lib/youcam/types.ts
export interface SkinAnalysisInput {
  /** Base64-encoded JPEG or PNG — TODO: confirm format with YouCam */
  imageBase64: string
  /** Optional locale hint — TODO: confirm supported values */
  locale?: string
}
```

**TODO:** Confirm the exact image encoding format (JPEG vs PNG), maximum image size, and whether the field name is `imageBase64` or something else in the official SDK.

### `ApparelTryOnInput`

```typescript
export interface ApparelTryOnInput {
  /** Base64-encoded user photo — TODO: confirm format and size constraints */
  userImageBase64: string
  /**
   * Garment asset identifier as registered in the YouCam system.
   * TODO: confirm asset registration flow and ID format.
   */
  garmentAssetId: string
  /** Optional render resolution — TODO: confirm supported values */
  outputResolution?: { width: number; height: number }
}
```

**TODO:** Confirm the garment asset registration flow — how do outfits get assigned IDs in the YouCam system, and what format do those IDs take?

### `ApparelTryOnResult`

```typescript
export interface ApparelTryOnResult {
  /**
   * Try-on image as a data URL or hosted URL.
   * TODO: confirm whether live API returns base64 data URLs or hosted CDN URLs.
   */
  renderedImageUrl: string
  isMock: boolean
  /** TODO: confirm field name for processing time in live response */
  processingTimeMs?: number
}
```

---

## Where to Insert Official Schemas

All placeholder `// TODO: replace with official schema` comments are in:

```
src/lib/youcam/types.ts
```

Once official YouCam SDK documentation is available:

1. Replace the placeholder field names and types with the authoritative schema
2. Update `src/lib/youcam/live-provider.ts` to use the correct request/response shapes
3. Remove all `// TODO` comments once confirmed

---

## Live Provider Stub

`src/lib/youcam/live-provider.ts` currently throws on every call:

```typescript
export class LiveYouCamProvider implements YouCamProvider {
  async analyzeSkin(_input: SkinAnalysisInput): Promise<SkinAnalysisResult> {
    throw new Error(
      'LiveYouCamProvider.analyzeSkin is not yet implemented. ' +
      'Fill in src/lib/youcam/live-provider.ts once official API schemas are confirmed.'
    )
  }

  async generateApparelTryOn(
    _input: ApparelTryOnInput,
  ): Promise<ApparelTryOnResult> {
    throw new Error(
      'LiveYouCamProvider.generateApparelTryOn is not yet implemented. ' +
      'Fill in src/lib/youcam/live-provider.ts once official API schemas are confirmed.'
    )
  }
}
```

**To implement live mode:**

1. Install the official YouCam SDK (once available), or use `fetch` with the correct base URL
2. Map `SkinAnalysisInput` → SDK request shape
3. Map SDK response → `SkinAnalysisResult` (the domain type used throughout the app)
4. Always pass the result through `applySkinSafety()` before returning
5. Repeat for `ApparelTryOnInput` → `ApparelTryOnResult`

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
