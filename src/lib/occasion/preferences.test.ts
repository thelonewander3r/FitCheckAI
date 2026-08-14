import { describe, expect, it } from "vitest";
import {
  colorsForSkinTonePreference,
  parseColorPreferences,
} from "./preferences";

describe("occasion preferences", () => {
  it("keeps only wardrobe colors from free-text preferences", () => {
    expect(parseColorPreferences("navy, emerald, anything bright")).toEqual([
      "navy",
      "emerald",
    ]);
  });

  it("maps a manual skin-tone preference to optional palette guidance", () => {
    expect(colorsForSkinTonePreference("deep")).toEqual([
      "white",
      "emerald",
      "gold",
      "royal blue",
    ]);
  });

  it("does not create palette guidance when the preference is omitted", () => {
    expect(colorsForSkinTonePreference(undefined)).toEqual([]);
  });
});
