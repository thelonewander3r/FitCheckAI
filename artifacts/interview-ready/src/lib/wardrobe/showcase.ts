export type ShowcasePiece = { id: string; name: string; category: "top" | "blazer" | "trousers" | "skirt" | "accessory"; imageSrc: string; imageAlt: string };
export type BaseOutfit = { id: string; name: string; occasion: string; top: ShowcasePiece; bottom: ShowcasePiece; blazer: ShowcasePiece; accessory: ShowcasePiece };
const root = "/demo-assets/wardrobe";
const images = { boardroom: `${root}/boardroom-rack.jpg`, weekend: `${root}/weekend-flatlay.jpg`, shirts: `${root}/shirt-edit.jpg`, color: `${root}/color-rack.jpg`, sage: `${root}/sage-rack.jpg` } as const;
const piece = (id: string, name: string, category: ShowcasePiece["category"], imageSrc: string): ShowcasePiece => ({ id, name, category, imageSrc, imageAlt: `${name} clothing photograph` });
const recipe = (id: string, name: string, occasion: string, imageSrc: string, names: [string, string, string, string]): BaseOutfit => ({ id, name, occasion, top: piece(`${id}-top`, names[0], "top", imageSrc), bottom: piece(`${id}-bottom`, names[1], names[1].toLowerCase().includes("skirt") ? "skirt" : "trousers", imageSrc), blazer: piece(`${id}-blazer`, names[2], "blazer", imageSrc), accessory: piece(`${id}-accessory`, names[3], "accessory", imageSrc) });
export const BASE_OUTFITS: BaseOutfit[] = [
 recipe("boardroom", "Boardroom polish", "Conference", images.boardroom, ["Ivory shell", "Navy trousers", "Navy blazer", "Leather tote"]),
 recipe("weekend", "Weekend smart", "Travel-ready", images.weekend, ["Striped tee", "Denim midi skirt", "Light jacket", "Red flats"]),
 recipe("shirt-edit", "Shirt edit", "Client meeting", images.shirts, ["Crisp white shirt", "Charcoal trousers", "Soft blazer", "Structured tote"]),
 recipe("color-study", "Color study", "Creative meeting", images.color, ["Coral blouse", "Warm trousers", "Neutral blazer", "Silk scarf"]),
 recipe("sage-capsule", "Sage capsule", "Smart casual", images.sage, ["Sage shirt", "Olive skirt", "Textured blazer", "Everyday tote"]),
];
export function getShowcaseVariants() { return BASE_OUTFITS.flatMap((base, index) => [base, { ...base, id: `${base.id}-alternate`, top: BASE_OUTFITS[(index + 1) % BASE_OUTFITS.length]!.top, bottom: BASE_OUTFITS[(index + 2) % BASE_OUTFITS.length]!.bottom }]); }

/** Maps an inferred occasion type to the demo wardrobe's lead decision. */
export function decisionForEventType(eventType: string): { variantId: string; headline: string; note: string } {
  const normalized = eventType.toLowerCase();
  if (/(conference|summit|gala|wedding|formal)/.test(normalized)) {
    return {
      variantId: "boardroom",
      headline: "Boardroom polish",
      note: "Sharp enough for the room, comfortable enough to move through the day.",
    };
  }
  if (/(interview|client|meeting|dinner|restaurant|date)/.test(normalized)) {
    return {
      variantId: "shirt-edit",
      headline: "Client-ready polish",
      note: "The easy yes: sharp for the moment, relaxed enough to keep your day moving.",
    };
  }
  if (/(casual|brunch|weekend|friends|outing)/.test(normalized)) {
    return {
      variantId: "weekend",
      headline: "Weekend smart",
      note: "Relaxed but put-together — easy to move in, still intentional.",
    };
  }
  return {
    variantId: "sage-capsule",
    headline: "Smart casual ease",
    note: "Polished without trying hard, from pieces you already own.",
  };
}
