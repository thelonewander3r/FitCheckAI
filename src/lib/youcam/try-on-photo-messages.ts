/** Shared try-on photo rules. Safe to import from client and server. */

export const TRY_ON_MIN_SHORT_SIDE = 480;
export const TRY_ON_MIN_BYTES = 8 * 1024;
export const TRY_ON_MIN_BYTES_PER_PIXEL = 0.03;
export const TRY_ON_MIN_LUMA_STDDEV = 12;

export const TRY_ON_PHOTO_TOO_SMALL =
  "Use a clear, full-length photo of a person. This one is too small to render.";
export const TRY_ON_PHOTO_EMPTY =
  "This photo doesn't look like it has anyone in it. Use a full-length photo of a person.";
export const TRY_ON_PHOTO_UNREADABLE =
  "Could not read that photo. Use a JPEG, PNG, or WebP.";
export const TRY_ON_GARMENT_UNUSABLE =
  "Live try-on needs the saved photo of this piece. Add the piece to your wardrobe with a clearer photo, then try again.";
