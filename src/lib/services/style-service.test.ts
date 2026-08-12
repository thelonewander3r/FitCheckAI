import { describe, it, expect } from "vitest";
import {
  buildStyleProfile,
  preferencesFromProfile,
} from "./style-service";
import type { WornOutfitRecord } from "@/types/worn";

function record(
  overrides: Partial<WornOutfitRecord> &
    Pick<WornOutfitRecord, "id" | "items">,
): WornOutfitRecord {
  return {
    wornDate: "2026-08-01",
    createdAt: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildStyleProfile", () => {
  it("aggregates top colors/categories and rounded formality mean across records", () => {
    const records: WornOutfitRecord[] = [
      record({
        id: "r1",
        items: [
          {
            id: "i1",
            name: "Navy Blazer",
            category: "outerwear",
            color: "navy",
            formality: "business-professional",
          },
          {
            id: "i2",
            name: "White Shirt",
            category: "tops",
            color: "white",
            formality: "business-casual",
          },
        ],
      }),
      record({
        id: "r2",
        items: [
          {
            id: "i3",
            name: "Navy Trousers",
            category: "bottoms",
            color: "navy",
            formality: "business-casual",
          },
          {
            id: "i4",
            name: "White Blouse",
            category: "tops",
            color: "white",
            formality: "business-casual",
          },
          {
            id: "i5",
            name: "Black Shoes",
            category: "shoes",
            color: "black",
            formality: "business-professional",
          },
        ],
      }),
    ];

    const profile = buildStyleProfile(records);

    expect(profile.totalWorn).toBe(2);
    expect(profile.colors.slice(0, 2)).toEqual([
      { color: "navy", count: 2 },
      { color: "white", count: 2 },
    ]);
    expect(profile.categories[0]).toEqual({ category: "tops", count: 2 });
    // levels: 3, 2, 2, 2, 3 → mean 2.4 → round 2
    expect(profile.formality).toBe(2);
  });

  it("returns an empty profile when there are no records", () => {
    const profile = buildStyleProfile([]);
    expect(profile).toEqual({
      colors: [],
      categories: [],
      formality: -1,
      totalWorn: 0,
    });
  });
});

describe("preferencesFromProfile", () => {
  it("gates colors/categories on count >= 2 and omits one-off noise", () => {
    const profile = buildStyleProfile([
      record({
        id: "r1",
        items: [
          {
            id: "i1",
            name: "Navy Top",
            category: "tops",
            color: "navy",
            formality: "business-casual",
          },
          {
            id: "i2",
            name: "Charcoal Pants",
            category: "bottoms",
            color: "charcoal",
            formality: "business-casual",
          },
        ],
      }),
      record({
        id: "r2",
        items: [
          {
            id: "i3",
            name: "Navy Blazer",
            category: "outerwear",
            color: "navy",
            formality: "business-professional",
          },
          {
            id: "i4",
            name: "Emerald Dress",
            category: "dresses",
            color: "emerald",
            formality: "formal",
          },
        ],
      }),
    ]);

    // navy appears twice; emerald/charcoal are one-offs
    expect(profile.colors.find((c) => c.color === "navy")?.count).toBe(2);
    expect(profile.colors.find((c) => c.color === "emerald")?.count).toBe(1);

    const prefs = preferencesFromProfile(profile);
    expect(prefs.colors).toEqual(["navy"]);
    expect(prefs.colors).not.toContain("emerald");
    expect(prefs.colors).not.toContain("charcoal");
    // tops/bottoms/outerwear/dresses each appear once — none gated in
    expect(prefs.categories).toBeUndefined();
    expect(prefs.formality).toBe(profile.formality);
  });

  it("returns {} for an empty profile", () => {
    expect(preferencesFromProfile(buildStyleProfile([]))).toEqual({});
  });
});
