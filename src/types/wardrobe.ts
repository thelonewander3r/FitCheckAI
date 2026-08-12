export const WARDROBE_CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
] as const;
export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

export const WARDROBE_FORMALITY = [
  "casual",
  "smart-casual",
  "business-casual",
  "business-professional",
  "formal",
] as const;
export type WardrobeFormality = (typeof WARDROBE_FORMALITY)[number];

export const WARDROBE_COLORS = [
  "black",
  "white",
  "navy",
  "charcoal",
  "gray",
  "cream",
  "beige",
  "camel",
  "burgundy",
  "olive",
  "sage",
  "rust",
  "emerald",
  "royal blue",
  "gold",
  "pink",
  "red",
  "blue",
  "brown",
  "multicolor",
] as const;
export type WardrobeColor = (typeof WARDROBE_COLORS)[number];

export const WARDROBE_SEASONS = [
  "any",
  "spring",
  "summer",
  "autumn",
  "winter",
] as const;

export interface WardrobeItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  color: WardrobeColor;
  formality: WardrobeFormality;
  seasons: (typeof WARDROBE_SEASONS)[number][];
  fitNote?: string;
  imageBase64: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}
