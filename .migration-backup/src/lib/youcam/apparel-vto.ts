import { getYouCamProvider } from "./client";
import type { ApparelTryOnInput, ApparelTryOnResult } from "./types";

/**
 * Thin wrapper: calls the active YouCam provider's apparel VTO method.
 */
export async function runApparelVto(
  input: ApparelTryOnInput,
): Promise<ApparelTryOnResult> {
  const provider = getYouCamProvider();
  return provider.generateApparelTryOn(input);
}
