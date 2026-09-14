/**
 * End-to-end coverage for live Apparel VTO from a composed occasion outfit.
 *
 * Exercises the real LiveYouCamProvider against a stubbed Perfect Corp API so
 * the whole chain is verified: outfit → saved wardrobe photo → signed uploads →
 * cloth-v4 task → poll → stored render → proxied public URL.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OccasionSession } from "@/types/occasion";

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

import { getOccasion, updateOccasion } from "@/lib/occasion-store";
import { getItem } from "@/lib/wardrobe-store";
import { toPublicOccasion, tryOnOccasionOutfit } from "./occasion-service";

const getOccasionMock = vi.mocked(getOccasion);
const updateOccasionMock = vi.mocked(updateOccasion);
const getItemMock = vi.mocked(getItem);

const OCCASION_ID = "11111111-1111-4111-8111-111111111111";
const UPLOAD_HOST = "https://yce-us-west-2.s3-accelerate.amazonaws.com";
const RESULT_URL = `${UPLOAD_HOST}/results/render.jpg`;

/** Minimal PNG whose IHDR carries real dimensions (enough for the size gate). */
function pngBase64(width: number, height: number, minBytes = 0): string {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8; // bit depth
  header[25] = 6; // color type
  if (header.length >= minBytes) return header.toString("base64");
  return Buffer.concat([header, Buffer.alloc(minBytes - header.length, 0x20)]).toString(
    "base64",
  );
}

const USER_PHOTO = pngBase64(768, 1024, 30_000);
const GARMENT_PHOTO = pngBase64(512, 512, 16_000);

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function occasion(): OccasionSession {
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
  };
}

interface RecordedCall {
  url: string;
  method: string;
  body?: unknown;
  authorization?: string;
}

function stubPerfectCorpApi(): RecordedCall[] {
  const calls: RecordedCall[] = [];
  let fileCount = 0;

  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const rawBody = init?.body;
    const call: RecordedCall = { url, method };
    if (typeof rawBody === "string") call.body = JSON.parse(rawBody);
    if (headers["Authorization"]) call.authorization = headers["Authorization"];
    calls.push(call);

    if (url.endsWith("/s2s/v2.0/file") && method === "POST") {
      fileCount += 1;
      return jsonResponse({
        data: {
          files: [
            {
              file_id: `file-${fileCount}`,
              requests: [
                {
                  url: `${UPLOAD_HOST}/uploads/file-${fileCount}?sig=abc`,
                  method: "PUT",
                  headers: { "Content-Type": "image/png" },
                },
              ],
            },
          ],
        },
      });
    }

    if (url.startsWith(`${UPLOAD_HOST}/uploads/`) && method === "PUT") {
      return new Response(null, { status: 200 });
    }

    if (url.endsWith("/s2s/v2.0/task/cloth-v4") && method === "POST") {
      return jsonResponse({ data: { task_id: "task-123" } });
    }

    if (url.includes("/s2s/v2.0/task/cloth-v4/task-123") && method === "GET") {
      return jsonResponse({
        data: { task_status: "success", results: { url: RESULT_URL } },
      });
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

beforeEach(() => {
  process.env["YOUCAM_MODE"] = "live";
  process.env["YOUCAM_API_KEY"] = "test-key";
  getOccasionMock.mockResolvedValue(occasion());
  updateOccasionMock.mockImplementation(async (_id, patch) => ({
    ...occasion(),
    ...patch,
  }));
  getItemMock.mockResolvedValue({
    id: "jacket-1",
    name: "Black blazer",
    category: "outerwear",
    color: "black",
    formality: "smart-casual",
    seasons: ["any"],
    imageBase64: GARMENT_PHOTO,
    favorite: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete process.env["YOUCAM_MODE"];
  delete process.env["YOUCAM_API_KEY"];
});

describe("live Apparel VTO from an occasion outfit", () => {
  it("uploads both images, creates cloth-v4, and stores the render", async () => {
    const calls = stubPerfectCorpApi();

    const updated = await tryOnOccasionOutfit(
      OCCASION_ID,
      "combo-1",
      USER_PHOTO,
    );

    // Two signed uploads (user photo + garment photo), then the task.
    expect(calls.filter((c) => c.url.endsWith("/s2s/v2.0/file"))).toHaveLength(2);
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(2);

    const task = calls.find((c) => c.url.endsWith("/s2s/v2.0/task/cloth-v4"));
    expect(task?.body).toEqual({
      src_file_id: "file-1",
      ref_file_id: "file-2",
      garment_category: "outer",
    });
    expect(task?.authorization).toBe("Bearer test-key");

    const result = updated.tryOnResults?.["combo-1"];
    expect(result?.isMock).toBe(false);
    expect(result?.renderedImageUrl).toBe(RESULT_URL);
    expect(result?.garmentItemName).toBe("Black blazer");
  });

  it("never exposes the signed result URL to the client", async () => {
    stubPerfectCorpApi();

    const updated = await tryOnOccasionOutfit(
      OCCASION_ID,
      "combo-1",
      USER_PHOTO,
    );
    const publicOccasion = toPublicOccasion(updated);

    expect(publicOccasion.tryOnResults?.["combo-1"]?.renderedImageUrl).toBe(
      `/api/occasions/${OCCASION_ID}/try-on/combo-1/image`,
    );
    expect(JSON.stringify(publicOccasion)).not.toContain("amazonaws.com");
  });

  it("fails before any upload when the garment photo is too small", async () => {
    const calls = stubPerfectCorpApi();
    getItemMock.mockResolvedValue({
      id: "jacket-1",
      name: "Black blazer",
      category: "outerwear",
      color: "black",
      formality: "smart-casual",
      seasons: ["any"],
      imageBase64: pngBase64(64, 64),
      favorite: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await expect(
      tryOnOccasionOutfit(OCCASION_ID, "combo-1", USER_PHOTO),
    ).rejects.toThrow(/saved photo of this piece/);
    expect(calls).toHaveLength(0);
  });
});
