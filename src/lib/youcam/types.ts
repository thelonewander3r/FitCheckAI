/**
 * YouCam integration types.
 *
 * Fields marked `// TODO: replace with official schema` are placeholders.
 * Consult the YouCam SDK / API documentation to obtain the authoritative
 * request and response shapes before wiring a live integration.
 */

import type { SkinAnalysisResult, SkinObservation } from "@/types/interview";

// ---------------------------------------------------------------------------
// Re-export shared types
// ---------------------------------------------------------------------------

export type { SkinAnalysisResult, SkinObservation };

// ---------------------------------------------------------------------------
// Skin analysis
// ---------------------------------------------------------------------------

export interface SkinAnalysisInput {
  /** Base64-encoded JPEG or PNG image data — TODO: confirm format with YouCam */
  imageBase64: string;
  /** Optional hint for the analysis locale — TODO: confirm supported values */
  locale?: string;
}

// ---------------------------------------------------------------------------
// Apparel virtual try-on
// ---------------------------------------------------------------------------

export interface ApparelTryOnInput {
  /**
   * Base64-encoded user photo — optional; mock provider renders a generic
   * placeholder when absent. TODO: confirm format and size constraints.
   */
  userImageBase64?: string;
  /**
   * Identifier for the garment asset as registered in the YouCam system.
   * TODO: confirm asset registration flow and ID format.
   */
  garmentAssetId: string;
  /** Optionally override render resolution — TODO: confirm supported values */
  outputResolution?: { width: number; height: number };
}

export interface ApparelTryOnResult {
  /**
   * Rendered try-on image as a data URL or URL string.
   * TODO: confirm whether the live API returns base64 data URLs or hosted URLs.
   */
  renderedImageUrl: string;
  /** True when this result was produced by the mock provider */
  isMock: boolean;
  /** Optional processing time reported by the API — TODO: confirm field name */
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
  /**
   * API key for YouCam services.
   * TODO: confirm the exact header/param name expected by the live API.
   */
  apiKey: string;
  /**
   * Base URL for the YouCam API.
   * TODO: obtain the authoritative endpoint from YouCam documentation.
   */
  baseUrl: string;
  /**
   * Optional timeout in milliseconds.
   * TODO: confirm any SDK-level timeout defaults.
   */
  timeoutMs?: number;
}
