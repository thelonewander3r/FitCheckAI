import { describe, expect, it } from "vitest";
import {
  TRY_ON_TYPICAL_MS,
  tryOnProgressLabel,
  tryOnProgressPercent,
} from "./try-on-progress";

describe("tryOnProgressPercent", () => {
  it("starts at 0 and stays under 100 until the response arrives", () => {
    expect(tryOnProgressPercent(0)).toBe(0);
    expect(tryOnProgressPercent(TRY_ON_TYPICAL_MS)).toBe(90);
    expect(tryOnProgressPercent(TRY_ON_TYPICAL_MS + 20_000)).toBe(95);
  });
});

describe("tryOnProgressLabel", () => {
  it("names the upload, render, and overrun phases", () => {
    expect(tryOnProgressLabel(200)).toMatch(/Uploading/);
    expect(tryOnProgressLabel(4_000)).toMatch(/rendering/);
    expect(tryOnProgressLabel(13_000)).toMatch(/Still working/);
  });
});
