import { describe, expect, it } from "vitest";
import { BASE_OUTFITS, getShowcaseVariants } from "./showcase";

describe("wardrobe showcase recipes", () => {
  it("contains five base outfits", () => {
    expect(BASE_OUTFITS).toHaveLength(5);
  });

  it("uses a distinct local photo for each base recipe", () => {
    expect(new Set(BASE_OUTFITS.map((outfit) => outfit.top.imageSrc)).size).toBe(BASE_OUTFITS.length);
  });

  it("recombines shared garment pieces into distinct variants", () => {
    const variants = getShowcaseVariants();
    expect(variants.length).toBeGreaterThan(5);
    expect(new Set(variants.map((variant) => variant.id)).size).toBe(variants.length);
    expect(variants.every((variant) => variant.top.imageSrc && variant.bottom.imageSrc)).toBe(true);
  });
});
