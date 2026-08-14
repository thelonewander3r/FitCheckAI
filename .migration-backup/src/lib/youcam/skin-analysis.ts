import { applySkinSafety } from "@/lib/safety/skin-safety";
import type { SkinAnalysisResult } from "@/types/interview";
import { getYouCamProvider } from "./client";
import type { SkinAnalysisInput } from "./types";

/**
 * Thin wrapper: calls the active YouCam provider and applies safety filtering
 * before returning results to callers.
 */
export async function runSkinAnalysis(
  input: SkinAnalysisInput,
): Promise<SkinAnalysisResult> {
  const provider = getYouCamProvider();
  const raw = await provider.analyzeSkin(input);
  return applySkinSafety(raw);
}
