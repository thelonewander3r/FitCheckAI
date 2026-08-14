/**
 * YouCam / Perfect Corp integration types.
 *
 * Live API: https://yce-api-01.makeupar.com (Bearer auth).
 * File upload → skin-analysis / cloth-v4 task create → poll to completion.
 */

import type { SkinAnalysisResult, SkinObservation } from "../../types/interview";

// ---------------------------------------------------------------------------
// Re-export shared types
// ---------------------------------------------------------------------------

export type { SkinAnalysisResult, SkinObservation };

// ---------------------------------------------------------------------------
// Skin analysis
// ---------------------------------------------------------------------------

export interface SkinAnalysisInput {
  /** Base64-encoded JPEG, PNG, or WebP (raw or data URL) */
  imageBase64: string;
  /** Optional locale hint for future API use */
  locale?: string;
}

// ---------------------------------------------------------------------------
// Apparel virtual try-on
// ---------------------------------------------------------------------------

export type GarmentCategory =
  | "full_body"
  | "lower_body"
  | "upper_body"
  | "shoes"
  | "auto"
  | "outer";

export interface ApparelTryOnInput {
  /**
   * Base64-encoded user photo (raw or data URL).
   * Optional for the mock provider; required for live AI Clothes.
   */
  userImageBase64?: string;
  /**
   * App-level garment asset identifier (mock compatibility).
   * Not sent as a YouCam file ID — live mode requires `garmentImageBase64`.
   */
  garmentAssetId: string;
  /**
   * Base64 garment reference image for live AI Clothes (raw or data URL).
   * Required when `YOUCAM_MODE=live`.
   */
  garmentImageBase64?: string;
  /** Perfect Corp garment category; defaults to `auto` in live mode */
  garmentCategory?: GarmentCategory;
  /** Optional render resolution hint (unused by current live API) */
  outputResolution?: { width: number; height: number };
}

export interface ApparelTryOnResult {
  /**
   * Rendered try-on image: mock SVG data URL, or (server-side only) a temporary
   * https YCE URL. Public API responses rewrite live URLs to an app-owned proxy path.
   */
  renderedImageUrl: string;
  /** True when this result was produced by the mock provider */
  isMock: boolean;
  /** Optional processing time in milliseconds */
  processingTimeMs?: number;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface YouCamProvider {
  analyzeSkin(input: SkinAnalysisInput): Promise<SkinAnalysisResult>;
  generateApparelTryOn(input: ApparelTryOnInput): Promise<ApparelTryOnResult>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface YouCamConfig {
  /** API key for Bearer Authorization against the YouCam / Perfect Corp API */
  apiKey: string;
  /** Base URL for the YouCam API (trailing slash is stripped) */
  baseUrl: string;
  /** Overall request/poll timeout in milliseconds (default 120000) */
  timeoutMs?: number;
  /** Delay between task status polls in milliseconds (default 1500) */
  pollIntervalMs?: number;
  /**
   * Skin analysis `dst_actions` (SD or HD, never mixed).
   * Default: texture, pore, redness, radiance.
   */
  skinActions?: string[];
}
