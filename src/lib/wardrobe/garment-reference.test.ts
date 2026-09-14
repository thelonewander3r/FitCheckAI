import { describe, expect, it } from "vitest";
import {
  eligibleGarments,
  isTryOnEligible,
  selectGarmentReference,
} from "./garment-reference";
import type { GarmentCandidate } from "./garment-reference";

function piece(
  id: string,
  category: GarmentCandidate["category"],
  name?: string,
): GarmentCandidate {
  return name ? { id, category, name } : { id, category };
}

describe("isTryOnEligible", () => {
  it("accepts body-layer garments", () => {
    expect(isTryOnEligible("dresses")).toBe(true);
    expect(isTryOnEligible("outerwear")).toBe(true);
    expect(isTryOnEligible("tops")).toBe(true);
    expect(isTryOnEligible("bottoms")).toBe(true);
  });

  it("rejects pieces AI Clothes does not render as a worn layer", () => {
    expect(isTryOnEligible("shoes")).toBe(false);
    expect(isTryOnEligible("accessories")).toBe(false);
  });
});

describe("eligibleGarments", () => {
  it("orders by try-on precedence, not wardrobe order", () => {
    const items = [
      piece("b", "bottoms"),
      piece("s", "shoes"),
      piece("t", "tops"),
      piece("o", "outerwear"),
      piece("d", "dresses"),
    ];
    expect(eligibleGarments(items).map((i) => i.id)).toEqual([
      "d",
      "o",
      "t",
      "b",
    ]);
  });

  it("drops shoes and accessories entirely", () => {
    const items = [piece("s", "shoes"), piece("a", "accessories")];
    expect(eligibleGarments(items)).toEqual([]);
  });
});

describe("selectGarmentReference", () => {
  it("defaults to a dress as the full-body garment", () => {
    const reference = selectGarmentReference([
      piece("t", "tops"),
      piece("d", "dresses", "Green midi dress"),
    ]);
    expect(reference?.item.id).toBe("d");
    expect(reference?.garmentCategory).toBe("full_body");
  });

  it("prefers the visible outer layer over the top beneath it", () => {
    const reference = selectGarmentReference([
      piece("t", "tops", "Navy shell top"),
      piece("o", "outerwear", "Black blazer"),
    ]);
    expect(reference?.item.name).toBe("Black blazer");
    expect(reference?.garmentCategory).toBe("outer");
  });

  it("maps tops and bottoms to their body regions", () => {
    expect(selectGarmentReference([piece("t", "tops")])?.garmentCategory).toBe(
      "upper_body",
    );
    expect(
      selectGarmentReference([piece("b", "bottoms")])?.garmentCategory,
    ).toBe("lower_body");
  });

  it("honors an explicit piece the user picked", () => {
    const reference = selectGarmentReference(
      [piece("o", "outerwear"), piece("b", "bottoms", "Black trousers")],
      "b",
    );
    expect(reference?.item.name).toBe("Black trousers");
    expect(reference?.garmentCategory).toBe("lower_body");
  });

  it("refuses a piece that is not part of the outfit", () => {
    const reference = selectGarmentReference(
      [piece("o", "outerwear")],
      "not-in-this-outfit",
    );
    expect(reference).toBeNull();
  });

  it("refuses an ineligible piece even when explicitly requested", () => {
    const reference = selectGarmentReference(
      [piece("o", "outerwear"), piece("s", "shoes")],
      "s",
    );
    expect(reference).toBeNull();
  });

  it("returns null when nothing can be rendered", () => {
    expect(selectGarmentReference([piece("s", "shoes")])).toBeNull();
    expect(selectGarmentReference([])).toBeNull();
  });
});
