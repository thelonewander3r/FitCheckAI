/**
 * Live YouCam provider stub.
 *
 * This file intentionally does NOT fabricate live API responses.
 * Before activating this provider you must:
 *   1. Obtain the official YouCam SDK / REST API documentation.
 *   2. Replace every `// TODO` comment below with the correct implementation.
 *   3. Insert the authoritative request/response schemas into types.ts.
 */

import type { SkinAnalysisResult } from "@/types/interview";
import type {
  ApparelTryOnInput,
  ApparelTryOnResult,
  SkinAnalysisInput,
  YouCamConfig,
  YouCamProvider,
} from "./types";

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class YouCamConfigurationError extends Error {
  constructor(message: string) {
    super(`YouCamConfigurationError: ${message}`);
    this.name = "YouCamConfigurationError";
  }
}

// ---------------------------------------------------------------------------
// Live provider
// ---------------------------------------------------------------------------

export class LiveYouCamProvider implements YouCamProvider {
  private readonly config: YouCamConfig;

  constructor(config: YouCamConfig) {
    if (!config.apiKey) {
      throw new YouCamConfigurationError(
        "YOUCAM_API_KEY is missing or empty. Set it as an environment variable before using the live provider.",
      );
    }
    if (!config.baseUrl) {
      throw new YouCamConfigurationError(
        "YOUCAM_BASE_URL is missing or empty. Consult the YouCam API documentation for the correct base URL.",
      );
    }
    this.config = config;
  }

  async analyzeSkin(_input: SkinAnalysisInput): Promise<SkinAnalysisResult> {
    void _input;
    /**
     * TODO: Replace this stub with a real HTTP call to the YouCam Skin Analysis API.
     *
     * Steps required:
     *   1. Confirm the endpoint path (e.g. `${this.config.baseUrl}/skin-analysis`).
     *   2. Confirm the request content-type and body shape (see types.ts SkinAnalysisInput TODO).
     *   3. Map the API response to the SkinAnalysisResult shape.
     *   4. Pass the result through applySkinSafety() from @/lib/safety/skin-safety before returning.
     *
     * Example skeleton (do not ship without proper implementation):
     *
     *   const response = await fetch(`${this.config.baseUrl}/skin-analysis`, {
     *     method: "POST",
     *     headers: {
     *       "Content-Type": "application/json",
     *       "Authorization": `Bearer ${this.config.apiKey}`, // TODO: confirm auth header
     *     },
     *     body: JSON.stringify({ image: _input.imageBase64 }), // TODO: confirm field names
     *   });
     *   if (!response.ok) throw new Error(`YouCam API error: ${response.status}`);
     *   const raw = await response.json();
     *   // TODO: map raw to SkinAnalysisResult, then call applySkinSafety()
     */
    throw new YouCamConfigurationError(
      "analyzeSkin() is not yet implemented in the live provider. Insert the official YouCam API integration before use.",
    );
  }

  async generateApparelTryOn(
    _input: ApparelTryOnInput,
  ): Promise<ApparelTryOnResult> {
    void _input;
    /**
     * TODO: Replace this stub with a real HTTP call to the YouCam Apparel VTO API.
     *
     * Steps required:
     *   1. Confirm the endpoint path (e.g. `${this.config.baseUrl}/apparel-vto`).
     *   2. Confirm the request body shape (see types.ts ApparelTryOnInput TODO).
     *   3. Map the API response to ApparelTryOnResult.
     *
     * Example skeleton (do not ship without proper implementation):
     *
     *   const response = await fetch(`${this.config.baseUrl}/apparel-vto`, {
     *     method: "POST",
     *     headers: {
     *       "Content-Type": "application/json",
     *       "Authorization": `Bearer ${this.config.apiKey}`, // TODO: confirm auth header
     *     },
     *     body: JSON.stringify({
     *       userImage: _input.userImageBase64,  // TODO: confirm field name
     *       garmentId: _input.garmentAssetId,   // TODO: confirm field name
     *     }),
     *   });
     *   if (!response.ok) throw new Error(`YouCam API error: ${response.status}`);
     *   const raw = await response.json();
     *   // TODO: map raw to ApparelTryOnResult
     */
    throw new YouCamConfigurationError(
      "generateApparelTryOn() is not yet implemented in the live provider. Insert the official YouCam API integration before use.",
    );
  }
}
