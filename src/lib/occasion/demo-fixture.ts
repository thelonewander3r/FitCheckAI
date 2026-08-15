import type { OccasionIntake } from "@/types/occasion";
import type { WardrobeItem } from "@/types/wardrobe";

const DEMO_TIMESTAMP = "2026-08-14T00:00:00.000Z";

function item(
  id: string,
  name: string,
  category: WardrobeItem["category"],
  color: WardrobeItem["color"],
  formality: WardrobeItem["formality"],
): WardrobeItem {
  return {
    id,
    name,
    category,
    color,
    formality,
    seasons: ["any"],
    imageBase64: "",
    favorite: false,
    createdAt: DEMO_TIMESTAMP,
    updatedAt: DEMO_TIMESTAMP,
  };
}

export const DEMO_OCCASION: OccasionIntake = {
  eventType: "dinner",
  venueName: "Rooftop dinner with friends",
  theme: "polished but relaxed",
  location: "Downtown",
};

/** A small sample closet keeps the public demo useful without touching user data. */
export const DEMO_WARDROBE: WardrobeItem[] = [
  item("demo-white-shirt", "White cotton shirt", "tops", "white", "business-casual"),
  item("demo-navy-top", "Navy knit top", "tops", "navy", "smart-casual"),
  item("demo-denim", "Blue denim jeans", "bottoms", "blue", "business-casual"),
  item("demo-black-trousers", "Black tailored trousers", "bottoms", "black", "smart-casual"),
  item("demo-striped-layer", "Red striped overshirt", "outerwear", "red", "smart-casual"),
  item("demo-olive-layer", "Olive overshirt", "outerwear", "olive", "business-casual"),
  item("demo-red-shoes", "Red sneakers", "shoes", "red", "business-casual"),
  item("demo-black-pumps", "Black pumps", "shoes", "black", "smart-casual"),
];

/** These are editorial references, never represented as photos of the user's closet. */
export const DEMO_PREVIEW_IMAGES = [
  "/demo-assets/wardrobe/weekend-flatlay.jpg",
  "/demo-assets/wardrobe/boardroom-rack.jpg",
  "/demo-assets/wardrobe/sage-rack.jpg",
];
