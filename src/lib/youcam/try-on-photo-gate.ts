import { inspectImageBase64, YouCamConfigurationError } from "./live-provider";
import {
  TRY_ON_MIN_BYTES,
  TRY_ON_MIN_BYTES_PER_PIXEL,
  TRY_ON_MIN_SHORT_SIDE,
  TRY_ON_PHOTO_EMPTY,
  TRY_ON_PHOTO_TOO_SMALL,
  TRY_ON_PHOTO_UNREADABLE,
} from "./try-on-photo-messages";

/**
 * User-correctable try-on photo rejection. Safe to surface in HTTP 422.
 * Thrown before any YouCam upload so a blank or tiny photo cannot spend a credit.
 */
export class TryOnPhotoRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TryOnPhotoRejectedError";
  }
}

/**
 * Fail closed on source photos that YouCam will accept but cannot usefully wear.
 * Does not decode pixels (no JPEG decoder); uses size, dimensions, and density.
 */
export function assertTryOnSourcePhoto(imageBase64: string): void {
  let inspected;
  try {
    inspected = inspectImageBase64(imageBase64);
  } catch (err) {
    if (err instanceof YouCamConfigurationError) {
      throw new TryOnPhotoRejectedError(TRY_ON_PHOTO_UNREADABLE);
    }
    throw err;
  }

  const short = Math.min(inspected.width, inspected.height);
  if (short < TRY_ON_MIN_SHORT_SIDE) {
    throw new TryOnPhotoRejectedError(TRY_ON_PHOTO_TOO_SMALL);
  }

  const pixels = inspected.width * inspected.height;
  if (
    inspected.byteLength < TRY_ON_MIN_BYTES ||
    (pixels > 0 && inspected.byteLength / pixels < TRY_ON_MIN_BYTES_PER_PIXEL)
  ) {
    throw new TryOnPhotoRejectedError(TRY_ON_PHOTO_EMPTY);
  }
}

/**
 * Live-only garment check. Wardrobe stubs (a few hundred bytes) are not
 * a clothing reference — YouCam will still return success and waste a credit.
 */
export function isUsableGarmentPhoto(imageBase64: string): boolean {
  try {
    const inspected = inspectImageBase64(imageBase64);
    const pixels = inspected.width * inspected.height;
    if (inspected.byteLength < TRY_ON_MIN_BYTES) return false;
    if (pixels > 0 && inspected.byteLength / pixels < TRY_ON_MIN_BYTES_PER_PIXEL) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

