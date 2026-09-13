import { YouCamApiError, YouCamConfigurationError } from "./live-provider";

/** True when the server is configured to call the live YouCam API. */
export function isLiveYouCamMode(): boolean {
  return (process.env["YOUCAM_MODE"] ?? "mock").toLowerCase() === "live";
}

/**
 * Log only a fixed message plus safe error class/status/errorCode.
 * Never logs provider messages, URLs, IDs, or credentials.
 */
export function logYouCamFailure(scope: string, err: unknown): void {
  const info: {
    errorClass: string;
    status?: number;
    errorCode?: string;
  } = {
    errorClass: err instanceof Error ? err.name : "UnknownError",
  };
  if (err instanceof YouCamApiError) {
    if (err.status !== undefined) info.status = err.status;
    if (err.errorCode !== undefined) info.errorCode = err.errorCode;
  } else if (err instanceof YouCamConfigurationError) {
    info.errorClass = err.name;
  }
  console.error(`[${scope}] YouCam provider failed.`, info);
}
