import { describe, expect, it } from "vitest";
import {
  TryOnPhotoRejectedError,
  assertTryOnSourcePhoto,
  isUsableGarmentPhoto,
} from "./try-on-photo-gate";
import {
  TRY_ON_PHOTO_EMPTY,
  TRY_ON_PHOTO_TOO_SMALL,
  TRY_ON_PHOTO_UNREADABLE,
} from "./try-on-photo-messages";

function jpegBase64(width: number, height: number, minBytes = 0): string {
  const header = Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x01,
    0x01,
    0x11,
    0x00,
    0xff,
    0xd9,
  ]);
  if (header.length >= minBytes) return header.toString("base64");
  const padded = Buffer.alloc(minBytes, 0x00);
  header.copy(padded);
  padded[minBytes - 2] = 0xff;
  padded[minBytes - 1] = 0xd9;
  return padded.toString("base64");
}

describe("assertTryOnSourcePhoto", () => {
  it("accepts a full-length photo with enough encoded detail", () => {
    expect(() =>
      assertTryOnSourcePhoto(jpegBase64(640, 800, 24_000)),
    ).not.toThrow();
  });

  it("rejects a tiny frame before any upload", () => {
    expect(() => assertTryOnSourcePhoto(jpegBase64(200, 200, 12_000))).toThrow(
      TryOnPhotoRejectedError,
    );
    expect(() => assertTryOnSourcePhoto(jpegBase64(200, 200, 12_000))).toThrow(
      TRY_ON_PHOTO_TOO_SMALL,
    );
  });

  it("rejects a header-only JPEG that YouCam would still call success", () => {
    expect(() => assertTryOnSourcePhoto(jpegBase64(640, 800))).toThrow(
      TRY_ON_PHOTO_EMPTY,
    );
  });

  it("rejects unreadable bytes with a user-safe message", () => {
    expect(() => assertTryOnSourcePhoto("not-an-image")).toThrow(
      TRY_ON_PHOTO_UNREADABLE,
    );
  });
});

describe("isUsableGarmentPhoto", () => {
  it("rejects a few-hundred-byte wardrobe stub", () => {
    expect(isUsableGarmentPhoto(jpegBase64(200, 200))).toBe(false);
  });

  it("accepts a real-sized garment reference", () => {
    expect(isUsableGarmentPhoto(jpegBase64(512, 640, 16_000))).toBe(true);
  });
});
