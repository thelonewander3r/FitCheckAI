import fs from "fs/promises";
import path from "path";
import type { WardrobeItem, WardrobeCategory, WardrobeColor, WardrobeFormality } from "../types/wardrobe.js";
import { listItems, createItem } from "./wardrobe-store";

const ASSET_DIR = path.resolve(process.cwd(), "..", "interview-ready/public/demo-assets/wardrobe");
const DEMO_ITEMS: Array<[string, WardrobeCategory, WardrobeColor, WardrobeFormality, string]> = [
  ["Ivory oxford shirt", "tops", "ivory", "business-casual", "shirt-edit.jpg"],
  ["Navy knit polo", "tops", "navy", "smart-casual", "boardroom-rack.jpg"],
  ["Charcoal tailored trousers", "bottoms", "charcoal", "business-casual", "shirt-edit.jpg"],
  ["Dark denim jeans", "bottoms", "blue", "smart-casual", "weekend-flatlay.jpg"],
  ["Olive overshirt", "outerwear", "olive", "smart-casual", "sage-rack.jpg"],
  ["Camel blazer", "outerwear", "camel", "business-casual", "boardroom-rack.jpg"],
  ["White leather sneakers", "shoes", "white", "smart-casual", "weekend-flatlay.jpg"],
  ["Black leather loafers", "shoes", "black", "business-casual", "color-rack.jpg"],
];

async function imageBase64(filename: string): Promise<string> {
  return (await fs.readFile(path.join(ASSET_DIR, filename))).toString("base64");
}

/** Seed only the demo user's empty wardrobe; never replaces saved user pieces. */
export async function ensureDemoWardrobe(userId: string): Promise<WardrobeItem[]> {
  const existing = await listItems(userId);
  if (existing.length > 0) return existing;
  const seeded: WardrobeItem[] = [];
  for (const [name, category, color, formality, filename] of DEMO_ITEMS) {
    seeded.push(await createItem(userId, {
      name,
      category,
      color,
      formality,
      seasons: ["any"],
      imageBase64: await imageBase64(filename),
      favorite: false,
    }));
  }
  return seeded;
}
