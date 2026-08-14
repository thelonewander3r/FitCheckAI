import { WARDROBE_COLORS, type WardrobeColor } from "@/types/wardrobe";

export const OCCASION_SKIN_TONES = [
  "fair",
  "light",
  "medium",
  "tan",
  "deep",
] as const;

export type OccasionSkinTone = (typeof OCCASION_SKIN_TONES)[number];

const PALETTE_BY_SKIN_TONE: Record<OccasionSkinTone, WardrobeColor[]> = {
  fair: ["navy", "black", "white", "burgundy"],
  light: ["navy", "charcoal", "sage", "cream"],
  medium: ["navy", "olive", "rust", "cream"],
  tan: ["black", "white", "gold", "deep green"],
  deep: ["white", "emerald", "gold", "royal blue"],
};

export function parseColorPreferences(input?: string): WardrobeColor[] {
  if (!input?.trim()) return [];

  const parts = input
    .toLowerCase()
    .split(/[,;/]|\band\b/)
    .map((part) => part.trim())
    .filter(Boolean);
  const colors: WardrobeColor[] = [];

  for (const part of parts) {
    const match = WARDROBE_COLORS.find(
      (color) => part === color || part.includes(color),
    );
    if (match && !colors.includes(match)) colors.push(match);
  }

  return colors;
}

export function colorsForSkinTonePreference(
  tone?: OccasionSkinTone,
): WardrobeColor[] {
  return tone ? [...PALETTE_BY_SKIN_TONE[tone]] : [];
}
