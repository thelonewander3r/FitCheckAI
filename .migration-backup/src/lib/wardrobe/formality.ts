import type { WardrobeFormality } from "@/types/wardrobe";
import { WARDROBE_FORMALITY } from "@/types/wardrobe";

const FORMALITY_TO_LEVEL: Record<WardrobeFormality, number> = {
  casual: 0,
  "smart-casual": 1,
  "business-casual": 2,
  "business-professional": 3,
  formal: 4,
};

export function formalityToLevel(label: WardrobeFormality): number {
  return FORMALITY_TO_LEVEL[label];
}

export function formalityLevelToLabel(level: number): WardrobeFormality {
  if (!Number.isFinite(level)) return "smart-casual";
  const clamped = Math.max(0, Math.min(4, Math.round(level)));
  return WARDROBE_FORMALITY[clamped]!;
}
