export type ShowcasePiece = {
  id: string;
  name: string;
  category: "top" | "blazer" | "trousers" | "skirt" | "accessory";
  imageSrc: string;
  imageAlt: string;
};

export type BaseOutfit = {
  id: string;
  name: string;
  occasion: string;
  top: ShowcasePiece;
  bottom: ShowcasePiece;
  blazer: ShowcasePiece;
  accessory: ShowcasePiece;
};

const ASSET_ROOT = "/demo-assets/wardrobe";
const images = {
  boardroom: `${ASSET_ROOT}/boardroom-rack.jpg`,
  weekend: `${ASSET_ROOT}/weekend-flatlay.jpg`,
  shirts: `${ASSET_ROOT}/shirt-edit.jpg`,
  color: `${ASSET_ROOT}/color-rack.jpg`,
  sage: `${ASSET_ROOT}/sage-rack.jpg`,
} as const;

const piece = (id: string, name: string, category: ShowcasePiece["category"], imageSrc: string): ShowcasePiece => ({
  id,
  name,
  category,
  imageSrc,
  imageAlt: `${name} clothing photograph`,
});

const recipe = (id: string, name: string, occasion: string, imageSrc: string, names: [string, string, string, string]): BaseOutfit => ({
  id,
  name,
  occasion,
  top: piece(`${id}-top`, names[0], "top", imageSrc),
  bottom: piece(`${id}-bottom`, names[1], names[1].toLowerCase().includes("skirt") ? "skirt" : "trousers", imageSrc),
  blazer: piece(`${id}-blazer`, names[2], "blazer", imageSrc),
  accessory: piece(`${id}-accessory`, names[3], "accessory", imageSrc),
});

export const BASE_OUTFITS: BaseOutfit[] = [
  recipe("boardroom", "Boardroom polish", "Conference", images.boardroom, ["Ivory shell", "Navy trousers", "Navy blazer", "Leather tote"]),
  recipe("weekend", "Weekend smart", "Travel-ready", images.weekend, ["Striped tee", "Denim midi skirt", "Light jacket", "Red flats"]),
  recipe("shirt-edit", "Shirt edit", "Client meeting", images.shirts, ["Crisp white shirt", "Charcoal trousers", "Soft blazer", "Structured tote"]),
  recipe("color-study", "Color study", "Creative meeting", images.color, ["Coral blouse", "Warm trousers", "Neutral blazer", "Silk scarf"]),
  recipe("sage-capsule", "Sage capsule", "Smart casual", images.sage, ["Sage shirt", "Olive skirt", "Textured blazer", "Everyday tote"]),
];

export type ShowcaseVariant = BaseOutfit & { id: string };

export function getShowcaseVariants(): ShowcaseVariant[] {
  return BASE_OUTFITS.flatMap((base, index) => [
    base,
    { ...base, id: `${base.id}-alternate`, top: BASE_OUTFITS[(index + 1) % BASE_OUTFITS.length]!.top, bottom: BASE_OUTFITS[(index + 2) % BASE_OUTFITS.length]!.bottom },
  ]);
}
