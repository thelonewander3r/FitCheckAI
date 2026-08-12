import { LiveYouCamProvider, YouCamConfigurationError } from "./live-provider";
import { MockYouCamProvider } from "./mock-provider";
import type { YouCamProvider } from "./types";

export type YouCamMode = "mock" | "live";

/**
 * Returns the appropriate YouCam provider based on the YOUCAM_MODE environment
 * variable. Defaults to "mock" when the variable is absent or unrecognised.
 *
 * Set YOUCAM_MODE=live to activate the live provider (requires YOUCAM_API_KEY
 * and YOUCAM_BASE_URL to also be set).
 */
export function getYouCamProvider(): YouCamProvider {
  const mode = (process.env["YOUCAM_MODE"] ?? "mock").toLowerCase() as YouCamMode;

  if (mode === "live") {
    const apiKey = process.env["YOUCAM_API_KEY"] ?? "";
    const baseUrl = process.env["YOUCAM_BASE_URL"] ?? "";

    if (!apiKey || !baseUrl) {
      throw new YouCamConfigurationError(
        "YOUCAM_MODE=live requires both YOUCAM_API_KEY and YOUCAM_BASE_URL to be set.",
      );
    }

    return new LiveYouCamProvider({ apiKey, baseUrl });
  }

  return new MockYouCamProvider();
}
