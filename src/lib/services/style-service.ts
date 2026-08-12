import type { WardrobeCategory, WardrobeColor } from "@/types/wardrobe";
import type { StyleProfile, WornOutfitRecord } from "@/types/worn";
import { formalityToLevel } from "@/lib/wardrobe/formality";

function topByCount<T extends string>(
  counts: Map<T, number>,
  firstSeen: T[],
  limit: number,
): { key: T; count: number }[] {
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return firstSeen.indexOf(a[0]) - firstSeen.indexOf(b[0]);
    })
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export function buildStyleProfile(records: WornOutfitRecord[]): StyleProfile {
  if (records.length === 0) {
    return { colors: [], categories: [], formality: -1, totalWorn: 0 };
  }

  const colorCounts = new Map<WardrobeColor, number>();
  const colorFirstSeen: WardrobeColor[] = [];
  const categoryCounts = new Map<WardrobeCategory, number>();
  const categoryFirstSeen: WardrobeCategory[] = [];
  const formalityLevels: number[] = [];

  for (const record of records) {
    for (const item of record.items) {
      if (!colorCounts.has(item.color)) {
        colorFirstSeen.push(item.color);
        colorCounts.set(item.color, 0);
      }
      colorCounts.set(item.color, (colorCounts.get(item.color) ?? 0) + 1);

      if (!categoryCounts.has(item.category)) {
        categoryFirstSeen.push(item.category);
        categoryCounts.set(item.category, 0);
      }
      categoryCounts.set(
        item.category,
        (categoryCounts.get(item.category) ?? 0) + 1,
      );

      formalityLevels.push(formalityToLevel(item.formality));
    }
  }

  const colors = topByCount(colorCounts, colorFirstSeen, 3).map(
    ({ key, count }) => ({ color: key, count }),
  );
  const categories = topByCount(categoryCounts, categoryFirstSeen, 2).map(
    ({ key, count }) => ({ category: key, count }),
  );

  const formality =
    formalityLevels.length === 0
      ? -1
      : Math.round(
          formalityLevels.reduce((sum, n) => sum + n, 0) /
            formalityLevels.length,
        );

  return {
    colors,
    categories,
    formality,
    totalWorn: records.length,
  };
}

export function preferencesFromProfile(profile: StyleProfile): {
  colors?: string[];
  categories?: WardrobeCategory[];
  formality?: number;
} {
  const prefs: {
    colors?: string[];
    categories?: WardrobeCategory[];
    formality?: number;
  } = {};

  const colors = profile.colors
    .filter((c) => c.count >= 2)
    .slice(0, 3)
    .map((c) => c.color);
  if (colors.length > 0) prefs.colors = colors;

  const categories = profile.categories
    .filter((c) => c.count >= 2)
    .slice(0, 2)
    .map((c) => c.category);
  if (categories.length > 0) prefs.categories = categories;

  if (profile.formality >= 0) prefs.formality = profile.formality;

  return prefs;
}
