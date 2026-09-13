/**
 * Maps a composed outfit to a single garment reference for YouCam AI Clothes.
 *
 * AI Clothes (cloth-v4) renders one garment per task, so a multi-piece outfit
 * has to nominate the piece that defines the look. Shoes and accessories are
 * not sent: the app only offers try-on for garments the model actually wears
 * as a body layer.
 */

import type { GarmentCategory } from "@/lib/youcam/types";
import type { WardrobeCategory } from "@/types/wardrobe";

/** Wardrobe category → Perfect Corp `garment_category`. */
const CATEGORY_TO_GARMENT: Partial<Record<WardrobeCategory, GarmentCategory>> = {
  dresses: "full_body",
  outerwear: "outer",
  tops: "upper_body",
  bottoms: "lower_body",
};

/**
 * Try-on precedence. A dress is the whole look; a jacket is the layer people
 * actually see; a top reads next; bottoms last.
 */
const PRECEDENCE: readonly WardrobeCategory[] = [
  "dresses",
  "outerwear",
  "tops",
  "bottoms",
];

export interface GarmentCandidate {
  id: string;
  name?: string;
  category: WardrobeCategory;
}

export interface GarmentReference<T extends GarmentCandidate> {
  item: T;
  garmentCategory: GarmentCategory;
}

/** True when this wardrobe category can be sent to AI Clothes. */
export function isTryOnEligible(category: WardrobeCategory): boolean {
  return category in CATEGORY_TO_GARMENT;
}

/** Eligible pieces of an outfit, in try-on precedence order. */
export function eligibleGarments<T extends GarmentCandidate>(
  items: readonly T[],
): T[] {
  return PRECEDENCE.flatMap((category) =>
    items.filter((item) => item.category === category),
  );
}

/**
 * Choose the garment reference for an outfit.
 *
 * `preferredItemId` lets the user try a specific piece; it is honored only when
 * that piece belongs to the outfit and is eligible, so a request can never
 * point the renderer at something outside the composed look.
 */
export function selectGarmentReference<T extends GarmentCandidate>(
  items: readonly T[],
  preferredItemId?: string,
): GarmentReference<T> | null {
  const ordered = eligibleGarments(items);

  const chosen = preferredItemId
    ? ordered.find((item) => item.id === preferredItemId)
    : ordered[0];

  if (!chosen) return null;

  const garmentCategory = CATEGORY_TO_GARMENT[chosen.category];
  if (!garmentCategory) return null;

  return { item: chosen, garmentCategory };
}
