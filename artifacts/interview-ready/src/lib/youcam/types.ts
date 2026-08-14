/**
 * YouCam / Perfect Corp integration types — client-safe subset (no Node.js deps).
 * Only the interfaces needed by frontend components are included here.
 */

import type { SkinAnalysisResult, SkinObservation } from "@/types/interview";

export type { SkinAnalysisResult, SkinObservation };

export type GarmentCategory =
  | "full_body"
  | "lower_body"
  | "upper_body"
  | "shoes"
  | "auto"
  | "outer";

export interface ApparelTryOnInput {
  userImageBase64?: string;
  garmentAssetId: string;
  garmentImageBase64?: string;
  garmentCategory?: GarmentCategory;
  outputResolution?: { width: number; height: number };
}

export interface ApparelTryOnResult {
  renderedImageUrl: string;
  isMock: boolean;
  processingTimeMs?: number;
}
