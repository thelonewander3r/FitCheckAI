/** Typical live cloth-v4 hop from the credentialed spike. */
export const TRY_ON_TYPICAL_MS = 12_000;

/** Ease toward 90% over the typical wait, then creep to 95% until the response. */
export function tryOnProgressPercent(elapsedMs: number): number {
  const elapsed = Math.max(0, elapsedMs);
  const t = elapsed / TRY_ON_TYPICAL_MS;
  if (t <= 1) return 90 * (1 - (1 - t) * (1 - t));
  return Math.min(95, 90 + (elapsed - TRY_ON_TYPICAL_MS) / 2_000);
}

export function tryOnProgressLabel(elapsedMs: number): string {
  if (elapsedMs < 1_500) return "Uploading your photo…";
  if (elapsedMs < TRY_ON_TYPICAL_MS) return "YouCam is rendering this look…";
  return "Still working — large photos can take a bit longer…";
}
