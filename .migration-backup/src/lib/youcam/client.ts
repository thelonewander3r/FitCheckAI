import {
  LiveYouCamProvider,
  YouCamConfigurationError,
  assertLiveApiBaseUrl,
} from "./live-provider";
import { MockYouCamProvider } from "./mock-provider";
import type { YouCamProvider } from "./types";

export type YouCamMode = "mock" | "live";

const DEFAULT_LIVE_BASE_URL = "https://yce-api-01.makeupar.com";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 1_500;
const MAX_TIMEOUT_MS = 600_000;
const MAX_POLL_INTERVAL_MS = 60_000;

/**
 * Parse a positive integer env value within [1, max].
 * Returns `fallback` when absent or invalid (does not echo the raw value).
 */
function parsePositiveBoundedInt(
  raw: string | undefined,
  fallback: number,
  max: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > max) {
    return fallback;
  }
  return n;
}

function parseSkinActions(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const actions = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return actions.length > 0 ? actions : undefined;
}

/**
 * Returns the appropriate YouCam provider based on the YOUCAM_MODE environment
 * variable. Defaults to "mock" when the variable is absent or unrecognised.
 *
 * Set YOUCAM_MODE=live to activate the live provider (requires YOUCAM_API_KEY).
 * YOUCAM_BASE_URL defaults to the official Perfect Corp host when unset.
 */
export function getYouCamProvider(): YouCamProvider {
  const mode = (process.env["YOUCAM_MODE"] ?? "mock").toLowerCase() as YouCamMode;

  if (mode === "live") {
    const apiKey = process.env["YOUCAM_API_KEY"] ?? "";

    if (!apiKey) {
      throw new YouCamConfigurationError(
        "YOUCAM_MODE=live requires YOUCAM_API_KEY to be set.",
      );
    }

    const rawBaseUrl =
      (process.env["YOUCAM_BASE_URL"] ?? "").trim() || DEFAULT_LIVE_BASE_URL;
    const baseUrl = assertLiveApiBaseUrl(rawBaseUrl);

    const timeoutMs = parsePositiveBoundedInt(
      process.env["YOUCAM_TIMEOUT_MS"],
      DEFAULT_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    );
    const pollIntervalMs = parsePositiveBoundedInt(
      process.env["YOUCAM_POLL_INTERVAL_MS"],
      DEFAULT_POLL_INTERVAL_MS,
      MAX_POLL_INTERVAL_MS,
    );
    const skinActions = parseSkinActions(process.env["YOUCAM_SKIN_ACTIONS"]);

    return new LiveYouCamProvider({
      apiKey,
      baseUrl,
      timeoutMs,
      pollIntervalMs,
      ...(skinActions ? { skinActions } : {}),
    });
  }

  return new MockYouCamProvider();
}
