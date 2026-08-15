import { afterEach, describe, expect, it, vi } from "vitest";
import type { WardrobeItem } from "@/types/wardrobe";

// In-memory fs so the real occasion-store round-trips through JSON without
// touching the repository's .data directory.
const memFs = vi.hoisted(() => new Map<string, string>());

vi.mock("fs/promises", () => {
  const readFile = vi.fn(async (filePath: string) => {
    const content = memFs.get(String(filePath));
    if (content === undefined) {
      const err = new Error(
        `ENOENT: no such file or directory, open '${String(filePath)}'`,
      ) as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }
    return content;
  });
  const writeFile = vi.fn(async (filePath: string, content: string) => {
    memFs.set(String(filePath), String(content));
  });
  const mkdir = vi.fn(async () => undefined);
  const rename = vi.fn(async (from: string, to: string) => {
    const content = memFs.get(String(from));
    if (content !== undefined) {
      memFs.set(String(to), content);
      memFs.delete(String(from));
    }
  });
  const api = { readFile, writeFile, mkdir, rename };
  return { ...api, default: api };
});

vi.mock("@/lib/wardrobe-store", () => ({
  listItems: vi.fn(),
}));

vi.mock("@/lib/worn-store", () => ({
  listRecords: vi.fn(async () => []),
}));

import { getOccasion, listOccasions } from "@/lib/occasion-store";
import { listItems } from "@/lib/wardrobe-store";
import { createOccasion as createOccasionService } from "./occasion-service";

const listItemsMock = vi.mocked(listItems);

function wardrobeItem(overrides: Partial<WardrobeItem>): WardrobeItem {
  return {
    id: "item-1",
    name: "Test piece",
    category: "tops",
    color: "navy",
    formality: "formal",
    seasons: ["any"],
    imageBase64: "BASE64_IMAGE_PAYLOAD",
    favorite: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function demoWardrobe(): WardrobeItem[] {
  return [
    wardrobeItem({
      id: "top-1",
      name: "Navy blazer",
      category: "tops",
      color: "navy",
    }),
    wardrobeItem({
      id: "bot-1",
      name: "Charcoal trousers",
      category: "bottoms",
      color: "charcoal",
    }),
    wardrobeItem({
      id: "shoe-1",
      name: "Black oxfords",
      category: "shoes",
      color: "black",
    }),
  ];
}

function occasionsJsonRaw(): string | undefined {
  return [...memFs.entries()].find(([filePath]) =>
    filePath.includes("occasions.json"),
  )?.[1];
}

describe("occasion persisted DTO boundary", () => {
  afterEach(() => {
    vi.clearAllMocks();
    memFs.clear();
  });

  it("strips imageBase64 from composed outfits before persisting, preserving demo preview metadata", async () => {
    listItemsMock.mockResolvedValue(demoWardrobe());

    // Guard: the source wardrobe genuinely carries image bytes, so this test
    // would fail if the service boundary stopped stripping them.
    const source = await listItems();
    expect(source[0]?.imageBase64).toBe("BASE64_IMAGE_PAYLOAD");

    const session = await createOccasionService(
      {
        eventType: "dinner",
        venueName: "The Capital Grille",
        location: "Denver",
      },
      {
        isDemo: true,
        previewImageUrls: ["https://example.com/preview/1.jpg"],
      },
    );

    expect(session.outfits.length).toBeGreaterThan(0);
    for (const outfit of session.outfits) {
      for (const item of outfit.items) {
        expect(item).not.toHaveProperty("imageBase64");
      }
    }

    // Demo preview metadata is preserved on the persisted outfits.
    expect(session.outfits[0]?.previewImageUrl).toBe(
      "https://example.com/preview/1.jpg",
    );
    expect(session.outfits[0]?.previewImageAlt).toContain(
      "Editorial reference for dinner outfit 1",
    );

    // The raw persisted JSON (store write) contains no image bytes either.
    const rawJson = occasionsJsonRaw();
    expect(rawJson).toBeDefined();
    expect(rawJson).not.toContain("imageBase64");
    expect(rawJson).not.toContain("BASE64_IMAGE_PAYLOAD");

    // Read-back paths (list + get) return the persisted, byte-free shape.
    const stored = await listOccasions();
    const storedSession = stored.find((s) => s.id === session.id);
    expect(storedSession).toBeDefined();
    for (const outfit of storedSession!.outfits) {
      for (const item of outfit.items) {
        expect(item).not.toHaveProperty("imageBase64");
      }
    }
    expect(JSON.stringify(stored)).not.toContain("imageBase64");

    const byId = await getOccasion(session.id);
    expect(byId).not.toBeNull();
    for (const outfit of byId!.outfits) {
      for (const item of outfit.items) {
        expect(item).not.toHaveProperty("imageBase64");
      }
    }
  });

  it("keeps wardrobe metadata that the UI still needs on persisted items", async () => {
    listItemsMock.mockResolvedValue(demoWardrobe());

    const session = await createOccasionService({
      eventType: "dinner",
      venueName: "The Capital Grille",
      location: "Denver",
    });

    const persistedItem = session.outfits[0]?.items[0];
    expect(persistedItem).toBeDefined();
    expect(persistedItem).toMatchObject({
      id: "top-1",
      name: "Navy blazer",
      category: "tops",
      color: "navy",
      formality: "formal",
    });
  });
});
