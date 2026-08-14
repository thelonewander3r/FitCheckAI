import type {
  WardrobeCategory,
  WardrobeFormality,
  WardrobeItem,
} from "../../types/wardrobe";
import { formalityToLevel } from "../wardrobe/formality";

export interface ComposeContext {
  formality: WardrobeFormality;
  palette?: string[];
  season?: string;
  presentation?: string;
  preferences?: {
    colors?: string[];
    categories?: WardrobeCategory[];
    formality?: number;
  };
}

export interface ComposedOutfit {
  id: string;
  items: WardrobeItem[];
  score: number;
  why: string[];
}

export interface ComposeResult {
  outfits: ComposedOutfit[];
  gaps: string[];
}

const FORMALITY_LEVEL: Record<WardrobeFormality, number> = {
  casual: 0,
  "smart-casual": 1,
  "business-casual": 2,
  "business-professional": 3,
  formal: 4,
};

const NEUTRALS = new Set([
  "black",
  "white",
  "navy",
  "charcoal",
  "gray",
  "cream",
  "beige",
  "camel",
]);

const EXPLORATION_CAP = 60;

function formalityIndex(f: WardrobeFormality): number {
  return FORMALITY_LEVEL[f];
}

function hasRequiredOuterwear(
  items: WardrobeItem[],
  required: WardrobeFormality,
): boolean {
  const r = formalityIndex(required);
  return items.some(
    (i) => i.category === "outerwear" && formalityIndex(i.formality) >= r,
  );
}

function piecePassesFormality(
  piece: WardrobeItem,
  required: WardrobeFormality,
  outfitHasRequiredOuterwear: boolean,
): boolean {
  const p = formalityIndex(piece.formality);
  const r = formalityIndex(required);
  if (p >= r) return true;
  if (p === r - 1) {
    if (piece.category === "tops") {
      return outfitHasRequiredOuterwear;
    }
    return true;
  }
  return false;
}

function colorHarmonyRank(item: WardrobeItem, palette?: string[]): number {
  const paletteSet = new Set((palette ?? []).map((c) => c.toLowerCase()));
  if (paletteSet.has(item.color.toLowerCase())) return 2;
  if (NEUTRALS.has(item.color)) return 1;
  return 0;
}

function pickBestOuterwear(
  pool: WardrobeItem[],
  required: WardrobeFormality,
  hasJacket: boolean,
): WardrobeItem | undefined {
  const r = formalityIndex(required);
  const candidates = pool.filter(
    (i) =>
      i.category === "outerwear" &&
      piecePassesFormality(i, required, hasJacket),
  );
  candidates.sort((a, b) => {
    const aOk = formalityIndex(a.formality) >= r ? 0 : 1;
    const bOk = formalityIndex(b.formality) >= r ? 0 : 1;
    if (aOk !== bOk) return aOk - bOk;
    return (
      Math.abs(formalityIndex(a.formality) - r) -
      Math.abs(formalityIndex(b.formality) - r)
    );
  });
  return candidates[0];
}

function pickAnyShoes(
  pool: WardrobeItem[],
  required: WardrobeFormality,
  hasJacket: boolean,
): WardrobeItem | undefined {
  return pool.find(
    (i) =>
      i.category === "shoes" && piecePassesFormality(i, required, hasJacket),
  );
}

function scoreOutfit(
  items: WardrobeItem[],
  ctx: ComposeContext,
): { score: number; why: string[] } {
  const required = ctx.formality;
  const r = formalityIndex(required);
  const season = ctx.season ?? "any";
  const paletteSet = new Set((ctx.palette ?? []).map((c) => c.toLowerCase()));
  const why: string[] = [];
  let score = 50;

  const allAtRequired = items.every(
    (i) => formalityIndex(i.formality) >= r,
  );
  if (allAtRequired) {
    score += 10;
    const outerwear = items.find((i) => i.category === "outerwear");
    if (outerwear && formalityIndex(outerwear.formality) >= r) {
      why.push(
        `${outerwear.name || "Outerwear"} matches ${required}.`,
      );
    }
  }

  for (const item of items) {
    const seasonMatch =
      item.seasons.includes("any") ||
      item.seasons.includes(season as (typeof item.seasons)[number]);
    if (seasonMatch) {
      score += 2;
    } else {
      score -= 2;
    }

    if (paletteSet.has(item.color.toLowerCase())) {
      score += 3;
      const label =
        item.category === "dresses"
          ? "dress"
          : item.category === "accessories"
            ? "accessory"
            : item.category.slice(0, -1);
      const colorLabel =
        item.color.charAt(0).toUpperCase() + item.color.slice(1);
      why.push(
        `${colorLabel} ${label} flatters the recommended palette.`,
      );
    }

    if (ctx.presentation === "feminine") {
      if (item.category === "tops" || item.category === "dresses") {
        score += 1;
      }
    } else if (ctx.presentation === "masculine") {
      if (item.category === "bottoms") {
        score += 1;
      }
    }
  }

  const prefs = ctx.preferences;
  if (prefs) {
    const prefColors = new Set(
      (prefs.colors ?? []).map((c) => c.toLowerCase()),
    );
    const prefCategories = new Set(prefs.categories ?? []);
    let colorBonus = 0;
    let categoryBonus = 0;
    let formalityBonus = 0;

    for (const item of items) {
      if (prefColors.has(item.color.toLowerCase()) && colorBonus < 4) {
        colorBonus = Math.min(4, colorBonus + 2);
      }
      if (prefCategories.has(item.category) && categoryBonus < 2) {
        categoryBonus = Math.min(2, categoryBonus + 1);
      }
      if (
        prefs.formality !== undefined &&
        formalityToLevel(item.formality) === prefs.formality &&
        formalityBonus < 2
      ) {
        formalityBonus = Math.min(2, formalityBonus + 1);
      }
    }

    score += colorBonus + categoryBonus + formalityBonus;
  }

  const nonNeutrals = new Set(
    items
      .map((i) => i.color.toLowerCase())
      .filter((c) => !NEUTRALS.has(c) && !paletteSet.has(c)),
  );
  if (nonNeutrals.size >= 2) {
    score -= 3 * (nonNeutrals.size - 1);
    why.push("Too many accent colors — keep the palette tight.");
  }

  // Outfit-level presentation preference (beyond per-piece +1)
  if (ctx.presentation === "feminine" && items.some((i) => i.category === "dresses")) {
    score += 3;
    why.push("Dress silhouette suits a feminine presentation.");
  }
  if (
    ctx.presentation === "masculine" &&
    items.some((i) => i.category === "tops") &&
    items.some((i) => i.category === "bottoms")
  ) {
    score += 3;
    why.push("Top and bottom pairing suits a masculine presentation.");
  }

  return { score, why: why.slice(0, 4) };
}

function buildGaps(
  items: WardrobeItem[],
  required: WardrobeFormality,
): string[] {
  const r = formalityIndex(required);
  const gaps: string[] = [];
  const gapCategories = [
    "tops",
    "bottoms",
    "dresses",
    "outerwear",
    "shoes",
  ] as const;

  const hasTopAtLevel = items.some(
    (i) => i.category === "tops" && formalityIndex(i.formality) >= r,
  );
  const hasBottomAtLevel = items.some(
    (i) => i.category === "bottoms" && formalityIndex(i.formality) >= r,
  );
  const hasTopBottomPath = hasTopAtLevel && hasBottomAtLevel;

  for (const category of gapCategories) {
    if (category === "dresses") {
      if (hasTopBottomPath) continue;
      const hasDress = items.some(
        (i) => i.category === "dresses" && formalityIndex(i.formality) >= r,
      );
      if (!hasDress) {
        gaps.push(`dresses at ${required}`);
      }
      continue;
    }
    const hasLevel = items.some(
      (i) => i.category === category && formalityIndex(i.formality) >= r,
    );
    if (!hasLevel) {
      gaps.push(`${category} at ${required}`);
    }
    if (gaps.length >= 4) break;
  }
  return [...new Set(gaps)].slice(0, 4);
}

function finalizeOutfit(
  pieces: WardrobeItem[],
  ctx: ComposeContext,
): Omit<ComposedOutfit, "id"> | null {
  const required = ctx.formality;
  const hasJacket = hasRequiredOuterwear(pieces, required);
  // Re-check with jacket knowledge for tops that may be one step below
  if (
    !pieces.every((p) => piecePassesFormality(p, required, hasJacket))
  ) {
    return null;
  }
  const { score, why } = scoreOutfit(pieces, ctx);
  return { items: pieces, score, why };
}

export function composeOutfits(
  items: WardrobeItem[],
  ctx: ComposeContext,
): ComposeResult {
  const gaps = buildGaps(items, ctx.formality);

  const sorted = [...items].sort((a, b) => {
    const fDiff = formalityIndex(b.formality) - formalityIndex(a.formality);
    if (fDiff !== 0) return fDiff;
    return colorHarmonyRank(b, ctx.palette) - colorHarmonyRank(a, ctx.palette);
  });
  const pool = sorted.slice(0, EXPLORATION_CAP);

  const dresses = pool.filter((i) => i.category === "dresses");
  const tops = pool.filter((i) => i.category === "tops");
  const bottoms = pool.filter((i) => i.category === "bottoms");
  const required = ctx.formality;
  const jacketAvailable = hasRequiredOuterwear(pool, required);

  const candidates: Omit<ComposedOutfit, "id">[] = [];

  for (const dress of dresses) {
    if (!piecePassesFormality(dress, required, jacketAvailable)) continue;
    const pieces: WardrobeItem[] = [dress];
    const outerwear = pickBestOuterwear(pool, required, jacketAvailable);
    if (outerwear) pieces.push(outerwear);
    const shoes = pickAnyShoes(pool, required, jacketAvailable);
    if (shoes) pieces.push(shoes);
    const outfit = finalizeOutfit(pieces, ctx);
    if (outfit) candidates.push(outfit);
  }

  for (const top of tops) {
    for (const bottom of bottoms) {
      const provisional: WardrobeItem[] = [top, bottom];
      const outerwear = pickBestOuterwear(pool, required, jacketAvailable);
      if (outerwear) provisional.push(outerwear);
      const hasJacket = hasRequiredOuterwear(provisional, required);
      if (!piecePassesFormality(top, required, hasJacket)) continue;
      if (!piecePassesFormality(bottom, required, hasJacket)) continue;

      const pieces: WardrobeItem[] = [top, bottom];
      if (outerwear && piecePassesFormality(outerwear, required, hasJacket)) {
        pieces.push(outerwear);
      }
      const shoes = pickAnyShoes(pool, required, hasJacket);
      if (shoes) pieces.push(shoes);
      const outfit = finalizeOutfit(pieces, ctx);
      if (outfit) candidates.push(outfit);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const top3 = candidates.slice(0, 3).map((outfit, index) => ({
    ...outfit,
    id: `combo-${index + 1}` as const,
  }));

  return { outfits: top3, gaps };
}
