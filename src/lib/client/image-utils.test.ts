import { describe, expect, it } from "vitest";
import { luminanceStdDev } from "./image-utils";

function rgba(pixels: Array<[number, number, number]>): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return data;
}

describe("luminanceStdDev", () => {
  it("is ~0 for a solid color", () => {
    const data = rgba(Array.from({ length: 16 }, () => [32, 160, 160]));
    expect(luminanceStdDev(data)).toBeLessThan(1);
  });

  it("is high when light and dark pixels mix", () => {
    const data = rgba([
      [0, 0, 0],
      [255, 255, 255],
      [0, 0, 0],
      [255, 255, 255],
    ]);
    expect(luminanceStdDev(data)).toBeGreaterThan(100);
  });
});
