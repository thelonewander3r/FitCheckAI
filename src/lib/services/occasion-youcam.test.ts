import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OccasionSession } from "@/types/occasion";
import type { WardrobeItem } from "@/types/wardrobe";

vi.mock("@/lib/occasion-store", () => ({
  createOccasion: vi.fn(),
  getOccasion: vi.fn(),
  listOccasions: vi.fn(),
  updateOccasion: vi.fn(),
}));

vi.mock("@/lib/wardrobe-store", () => ({
  getItem: vi.fn(),
  listItems: vi.fn(async () => []),
}));

vi.mock("@/lib/youcam/apparel-vto", () => ({
  runApparelVto: vi.fn(),
}));

vi.mock("@/lib/youcam/skin-analysis", () => ({
  runSkinAnalysis: vi.fn(),
}));

import { getOccasion, updateOccasion } from "@/lib/occasion-store";
import { getItem } from "@/lib/wardrobe-store";
import { runApparelVto } from "@/lib/youcam/apparel-vto";
import { runSkinAnalysis } from "@/lib/youcam/skin-analysis";
import { TryOnPhotoRejectedError } from "@/lib/youcam/try-on-photo-gate";
import { TRY_ON_PHOTO_TOO_SMALL } from "@/lib/youcam/try-on-photo-messages";
import {
  GarmentReferenceUnavailableError,
  runOccasionSkinPrep,
  toPublicOccasion,
  tryOnOccasionOutfit,
} from "./occasion-service";

const getOccasionMock = vi.mocked(getOccasion);
const updateOccasionMock = vi.mocked(updateOccasion);
const getItemMock = vi.mocked(getItem);
const runApparelVtoMock = vi.mocked(runApparelVto);
const runSkinAnalysisMock = vi.mocked(runSkinAnalysis);

const OCCASION_ID = "11111111-1111-4111-8111-111111111111";

function jpegBase64(width: number, height: number, minBytes = 0): string {
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
  ]);
  if (header.length >= minBytes) return header.toString("base64");
  const padded = Buffer.alloc(minBytes, 0x00);
  header.copy(padded);
  padded[minBytes - 2] = 0xff;
  padded[minBytes - 1] = 0xd9;
  return padded.toString("base64");
}

const USER_PHOTO = jpegBase64(640, 800, 24_000);

function occasion(overrides: Partial<OccasionSession> = {}): OccasionSession {
  return {
    id: OCCASION_ID,
    intake: { eventType: "dinner", venueName: "Rooftop dinner" },
    outfits: [
      {
        id: "combo-1",
        score: 80,
        why: [],
        items: [
          {
            id: "top-1",
            name: "Navy shell top",
            category: "tops",
            color: "navy",
            formality: "smart-casual",
            seasons: ["any"],
            favorite: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "jacket-1",
            name: "Black blazer",
            category: "outerwear",
            color: "black",
            formality: "smart-casual",
            seasons: ["any"],
            favorite: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      },
    ],
    gaps: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function wardrobeItem(overrides: Partial<WardrobeItem> = {}): WardrobeItem {
  return {
    id: "jacket-1",
    name: "Black blazer",
    category: "outerwear",
    color: "black",
    formality: "smart-casual",
    seasons: ["any"],
    imageBase64: jpegBase64(512, 640, 16_000),
    favorite: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  getOccasionMock.mockResolvedValue(occasion());
  updateOccasionMock.mockImplementation(async (_id, patch) => ({
    ...occasion(),
    ...patch,
  }));
  getItemMock.mockResolvedValue(wardrobeItem());
  runApparelVtoMock.mockResolvedValue({
    renderedImageUrl:
      "https://yce-us-west-2.s3-accelerate.amazonaws.com/results/render.jpg",
    isMock: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env["YOUCAM_MODE"];
});

describe("tryOnOccasionOutfit", () => {
  it("sends the saved wardrobe photo as the garment reference", async () => {
    await tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO);

    expect(getItemMock).toHaveBeenCalledWith("jacket-1");
    expect(runApparelVtoMock).toHaveBeenCalledWith({
      userImageBase64: USER_PHOTO,
      garmentAssetId: "jacket-1",
      garmentCategory: "outer",
      garmentImageBase64: jpegBase64(512, 640, 16_000),
    });
  });

  it("renders the piece the user picked", async () => {
    getItemMock.mockResolvedValue(
      wardrobeItem({ id: "top-1", name: "Navy shell top", category: "tops" }),
    );

    await tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO, "top-1");

    expect(getItemMock).toHaveBeenCalledWith("top-1");
    expect(runApparelVtoMock).toHaveBeenCalledWith(
      expect.objectContaining({ garmentCategory: "upper_body" }),
    );
  });

  it("records which piece was rendered alongside the result", async () => {
    const updated = await tryOnOccasionOutfit(
      OCCASION_ID,
      "combo-1",
      USER_PHOTO,
    );

    expect(updated.tryOnResults?.["combo-1"]).toMatchObject({
      garmentItemId: "jacket-1",
      garmentItemName: "Black blazer",
      garmentCategory: "outer",
      isMock: false,
    });
  });

  it("never persists the user photo", async () => {
    await tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO);

    const patch = updateOccasionMock.mock.calls[0]?.[1];
    expect(JSON.stringify(patch)).not.toContain(USER_PHOTO);
  });

  it("keeps earlier renders when a second outfit is tried on", async () => {
    getOccasionMock.mockResolvedValue(
      occasion({
        tryOnResults: {
          "combo-9": {
            renderedImageUrl: "data:image/svg+xml;base64,AAA",
            isMock: true,
            garmentItemId: "old-1",
            garmentCategory: "upper_body",
          },
        },
      }),
    );

    await tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO);

    const patch = updateOccasionMock.mock.calls[0]?.[1] as
      | Partial<OccasionSession>
      | undefined;
    expect(Object.keys(patch?.tryOnResults ?? {})).toEqual([
      "combo-9",
      "combo-1",
    ]);
  });

  it("refuses in live mode when the piece has no saved photo", async () => {
    process.env["YOUCAM_MODE"] = "live";
    getItemMock.mockResolvedValue(wardrobeItem({ imageBase64: "" }));

    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO),
    ).rejects.toBeInstanceOf(GarmentReferenceUnavailableError);
    expect(runApparelVtoMock).not.toHaveBeenCalled();
  });

  it("refuses in live mode when the saved garment photo is a stub", async () => {
    process.env["YOUCAM_MODE"] = "live";
    getItemMock.mockResolvedValue(wardrobeItem({ imageBase64: jpegBase64(200, 200) }));

    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO),
    ).rejects.toBeInstanceOf(GarmentReferenceUnavailableError);
    expect(runApparelVtoMock).not.toHaveBeenCalled();
  });

  it("refuses in live mode when the piece is not in the wardrobe store", async () => {
    process.env["YOUCAM_MODE"] = "live";
    getItemMock.mockResolvedValue(null);

    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO),
    ).rejects.toBeInstanceOf(GarmentReferenceUnavailableError);
    expect(runApparelVtoMock).not.toHaveBeenCalled();
  });

  it("still previews in mock mode when the provider call fails", async () => {
    runApparelVtoMock.mockRejectedValue(new Error("provider down"));

    const updated = await tryOnOccasionOutfit(
      OCCASION_ID,
      "combo-1",
      USER_PHOTO,
    );

    expect(updated.tryOnResults?.["combo-1"]?.isMock).toBe(true);
  });

  it("propagates provider failures in live mode", async () => {
    process.env["YOUCAM_MODE"] = "live";
    runApparelVtoMock.mockRejectedValue(new Error("provider down"));

    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO),
    ).rejects.toThrow("provider down");
  });

  it("rejects a tiny source photo before calling YouCam", async () => {
    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", jpegBase64(200, 200, 12_000)),
    ).rejects.toBeInstanceOf(TryOnPhotoRejectedError);
    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", jpegBase64(200, 200, 12_000)),
    ).rejects.toThrow(TRY_ON_PHOTO_TOO_SMALL);
    expect(runApparelVtoMock).not.toHaveBeenCalled();
  });

  it("rejects an outfit that is not part of the plan", async () => {
    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-404", USER_PHOTO),
    ).rejects.toThrow("Invalid outfit");
  });

  it("reports when a look has nothing renderable", async () => {
    getOccasionMock.mockResolvedValue(
      occasion({
        outfits: [
          {
            id: "combo-1",
            score: 70,
            why: [],
            items: [
              {
                id: "shoe-1",
                name: "Black pumps",
                category: "shoes",
                color: "black",
                formality: "smart-casual",
                seasons: ["any"],
                favorite: false,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          },
        ],
      }),
    );

    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO),
    ).rejects.toBeInstanceOf(GarmentReferenceUnavailableError);
  });
});

describe("toPublicOccasion", () => {
  it("rewrites a live signed URL to an app-owned proxy path", () => {
    const publicOccasion = toPublicOccasion(
      occasion({
        tryOnResults: {
          "combo-1": {
            renderedImageUrl:
              "https://yce-us-west-2.s3-accelerate.amazonaws.com/results/render.jpg",
            isMock: false,
            garmentItemId: "jacket-1",
            garmentCategory: "outer",
          },
        },
      }),
    );

    expect(publicOccasion.tryOnResults?.["combo-1"]?.renderedImageUrl).toBe(
      `/api/occasions/${OCCASION_ID}/try-on/combo-1/image`,
    );
    expect(JSON.stringify(publicOccasion)).not.toContain("amazonaws.com");
  });

  it("leaves mock data URLs inline", () => {
    const publicOccasion = toPublicOccasion(
      occasion({
        tryOnResults: {
          "combo-1": {
            renderedImageUrl: "data:image/svg+xml;base64,AAA",
            isMock: true,
            garmentItemId: "jacket-1",
            garmentCategory: "outer",
          },
        },
      }),
    );

    expect(publicOccasion.tryOnResults?.["combo-1"]?.renderedImageUrl).toBe(
      "data:image/svg+xml;base64,AAA",
    );
  });
});

describe("runOccasionSkinPrep", () => {
  it("stores safety-filtered observations without the photo", async () => {
    runSkinAnalysisMock.mockResolvedValue({
      isMock: false,
      disclaimer: "Cosmetic guidance only.",
      observations: [
        {
          id: "obs-1",
          label: "Radiance",
          severity: "low",
          guidance: "A hydrating serum supports a fresher finish.",
        },
      ],
      preparationSuggestions: ["Use a gentle cleanser."],
      lightingNotes: ["Warm light is flattering on camera."],
    });

    const updated = await runOccasionSkinPrep(OCCASION_ID, "SELFIE_BASE64");

    expect(runSkinAnalysisMock).toHaveBeenCalledWith({
      imageBase64: "SELFIE_BASE64",
    });
    expect(updated.skinPrep?.observations).toHaveLength(1);

    const patch = updateOccasionMock.mock.calls[0]?.[1];
    expect(JSON.stringify(patch)).not.toContain("SELFIE_BASE64");
  });

  it("surfaces provider failures to the caller", async () => {
    runSkinAnalysisMock.mockRejectedValue(new Error("skin api down"));

    await expect(
      runOccasionSkinPrep(OCCASION_ID, "SELFIE_BASE64"),
    ).rejects.toThrow("skin api down");
  });

  it("rejects an unknown occasion", async () => {
    getOccasionMock.mockResolvedValue(null);

    await expect(
      runOccasionSkinPrep(OCCASION_ID, "SELFIE_BASE64"),
    ).rejects.toThrow("not found");
  });
});
