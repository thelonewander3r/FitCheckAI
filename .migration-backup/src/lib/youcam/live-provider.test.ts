import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LiveYouCamProvider,
  YouCamApiError,
  YouCamConfigurationError,
  assertLiveApiBaseUrl,
  assertTrustedYceHttpsUrl,
  isTrustedYceStorageHost,
  parseHttpsUrlNoCredentials,
} from "./live-provider";

const API_KEY = "test-secret-key-do-not-leak";
const BASE_URL = "https://yce-api-01.makeupar.com";
/** Official-shaped YCE storage host for signed PUT / result fixtures (not a real secret). */
const YCE_HOST = "yce-us-west-2.s3-accelerate.amazonaws.com";
const SIGNED_PUT_URL = `https://${YCE_HOST}/upload/object`;
const RESULT_URL = `https://${YCE_HOST}/results/tryon.jpg`;

/** Craft a minimal JPEG with an SOF0 dimensions header (no dependency). */
function jpegBase64WithDimensions(width: number, height: number): string {
  const bytes = Buffer.from([
    0xff,
    0xd8, // SOI
    0xff,
    0xc0, // SOF0
    0x00,
    0x0b, // length
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x01, // components
    0x01,
    0x11,
    0x00, // component id / sampling / quant
    0xff,
    0xd9, // EOI
  ]);
  return bytes.toString("base64");
}

/** Craft a minimal PNG with an IHDR dimensions header (CRC not verified by sniffer). */
function pngBase64WithDimensions(width: number, height: number): string {
  const bytes = Buffer.alloc(33);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  bytes[2] = 0x4e;
  bytes[3] = 0x47;
  bytes[4] = 0x0d;
  bytes[5] = 0x0a;
  bytes[6] = 0x1a;
  bytes[7] = 0x0a;
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 0x08;
  bytes[25] = 0x02;
  bytes[26] = 0x00;
  bytes[27] = 0x00;
  bytes[28] = 0x00;
  bytes.writeUInt32BE(0, 29);
  return bytes.toString("base64");
}

/** Craft a minimal WebP VP8X with canvas dimensions. */
function webpBase64WithDimensions(width: number, height: number): string {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8);
  bytes.write("VP8X", 12);
  bytes.writeUInt32LE(10, 16);
  bytes.writeUInt32LE(0, 20); // flags
  const w = width - 1;
  const h = height - 1;
  bytes[24] = w & 0xff;
  bytes[25] = (w >> 8) & 0xff;
  bytes[26] = (w >> 16) & 0xff;
  bytes[27] = h & 0xff;
  bytes[28] = (h >> 8) & 0xff;
  bytes[29] = (h >> 16) & 0xff;
  return bytes.toString("base64");
}

/** JPEG magic only — no SOF; dimensions unparseable. */
const MALFORMED_JPEG_B64 = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString(
  "base64",
);

/** Valid SD skin / apparel fixtures (parseable). */
const JPEG_B64 = jpegBase64WithDimensions(640, 480);
const PNG_B64 = pngBase64WithDimensions(256, 256);
const WEBP_B64 = webpBase64WithDimensions(640, 480);

function mockSkinSuccessFlow(fetchMock: ReturnType<typeof vi.fn>): void {
  fetchMock
    .mockResolvedValueOnce(fileMetaResponse())
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(jsonResponse({ data: { task_id: "t1" } }))
    .mockResolvedValueOnce(
      jsonResponse({
        data: {
          task_status: "success",
          results: { output: [{ type: "texture", ui_score: 80 }] },
        },
      }),
    );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fileMetaResponse(
  fileId = "file-src-1",
  overrides?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  },
): Response {
  return jsonResponse({
    data: {
      files: [
        {
          file_id: fileId,
          requests: [
            {
              url: overrides?.url ?? SIGNED_PUT_URL,
              method: overrides?.method ?? "PUT",
              headers: overrides?.headers ?? { "Content-Type": "image/jpeg" },
            },
          ],
        },
      ],
    },
  });
}

function createProvider(
  overrides: Partial<ConstructorParameters<typeof LiveYouCamProvider>[0]> = {},
): LiveYouCamProvider {
  return new LiveYouCamProvider({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    timeoutMs: 5_000,
    pollIntervalMs: 20,
    ...overrides,
  });
}

describe("URL validation helpers", () => {
  it("accepts official-shaped YCE https host", () => {
    expect(isTrustedYceStorageHost(YCE_HOST)).toBe(true);
    expect(isTrustedYceStorageHost("YCE-EU-WEST-1.S3-ACCELERATE.AMAZONAWS.COM")).toBe(
      true,
    );
    expect(assertTrustedYceHttpsUrl(RESULT_URL)).toContain(YCE_HOST);
  });

  it("rejects http, credentials, and bad hosts", () => {
    expect(parseHttpsUrlNoCredentials("http://yce-us-west-2.s3-accelerate.amazonaws.com/x")).toBeNull();
    expect(
      parseHttpsUrlNoCredentials(
        `https://user:pass@${YCE_HOST}/x`,
      ),
    ).toBeNull();
    expect(isTrustedYceStorageHost("evil.example.com")).toBe(false);
    expect(isTrustedYceStorageHost("s3-accelerate.amazonaws.com")).toBe(false);
    expect(() =>
      assertTrustedYceHttpsUrl("https://cdn.example.com/tryon.jpg"),
    ).toThrow(YouCamApiError);
    expect(() =>
      assertTrustedYceHttpsUrl(`http://${YCE_HOST}/x`),
    ).toThrow(YouCamApiError);
  });

  it("rejects invalid live base URLs and accepts https default shape", () => {
    expect(() => assertLiveApiBaseUrl("http://yce-api-01.makeupar.com")).toThrow(
      YouCamConfigurationError,
    );
    expect(() =>
      assertLiveApiBaseUrl("https://user:pass@yce-api-01.makeupar.com"),
    ).toThrow(YouCamConfigurationError);
    expect(assertLiveApiBaseUrl(BASE_URL)).toBe(BASE_URL);
    expect(assertLiveApiBaseUrl(`${BASE_URL}/`)).toBe(BASE_URL);
  });
});

describe("LiveYouCamProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("rejects empty API key", () => {
      expect(
        () => new LiveYouCamProvider({ apiKey: "", baseUrl: BASE_URL }),
      ).toThrow(YouCamConfigurationError);
    });

    it("rejects empty base URL", () => {
      expect(
        () => new LiveYouCamProvider({ apiKey: API_KEY, baseUrl: "" }),
      ).toThrow(YouCamConfigurationError);
    });

    it("rejects http base URL", () => {
      expect(
        () =>
          new LiveYouCamProvider({
            apiKey: API_KEY,
            baseUrl: "http://yce-api-01.makeupar.com",
          }),
      ).toThrow(YouCamConfigurationError);
    });

    it("rejects base URL with credentials", () => {
      expect(
        () =>
          new LiveYouCamProvider({
            apiKey: API_KEY,
            baseUrl: "https://user:pass@yce-api-01.makeupar.com",
          }),
      ).toThrow(YouCamConfigurationError);
    });

    it("strips trailing slash from base URL", async () => {
      mockSkinSuccessFlow(fetchMock);
      const provider = createProvider({ baseUrl: `${BASE_URL}/` });
      await provider.analyzeSkin({ imageBase64: JPEG_B64 });

      const firstUrl = String(fetchMock.mock.calls[0]?.[0]);
      expect(firstUrl).toBe(`${BASE_URL}/s2s/v2.0/file`);
      expect(firstUrl).not.toContain("//s2s");
    });

    it("rejects mixed HD and SD skin actions", () => {
      expect(
        () =>
          createProvider({
            skinActions: ["texture", "hd_pore"],
          }),
      ).toThrow(YouCamConfigurationError);
    });

    it("rejects unknown skin actions", () => {
      expect(
        () => createProvider({ skinActions: ["not_a_real_action"] }),
      ).toThrow(YouCamConfigurationError);
    });
  });

  describe("analyzeSkin", () => {
    it("uploads file, creates task, polls running then success, maps scores", async () => {
      fetchMock
        .mockResolvedValueOnce(fileMetaResponse("file-abc"))
        .mockResolvedValueOnce(new Response(null, { status: 200 }))
        .mockResolvedValueOnce(jsonResponse({ data: { task_id: "task-skin-1" } }))
        .mockResolvedValueOnce(
          jsonResponse({ data: { task_status: "Running" } }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              task_status: "success",
              results: {
                output: [
                  { type: "texture", ui_score: 85 },
                  { type: "pore", score: 55 },
                  { type: "redness", ui_score: 20 },
                  { type: "radiance", ui_score: 90 },
                  { type: "all", ui_score: 50 },
                  { type: "skin_age", score: 30 },
                  { type: "texture", region: "face" },
                  { type: "unknown_no_score", mask_urls: ["https://x"] },
                ],
              },
            },
          }),
        );

      const provider = createProvider();
      const result = await provider.analyzeSkin({ imageBase64: JPEG_B64 });

      expect(result.isMock).toBe(false);
      expect(result.disclaimer.length).toBeGreaterThan(0);
      expect(result.observations).toHaveLength(4);

      const labels = result.observations.map((o) => o.label);
      expect(labels).toContain("Skin texture");
      expect(labels).toContain("Pore visibility");
      expect(labels).toContain("Evenness");
      expect(labels).toContain("Radiance");

      const byLabel = Object.fromEntries(
        result.observations.map((o) => [o.label, o.severity]),
      );
      expect(byLabel["Skin texture"]).toBe("low");
      expect(byLabel["Pore visibility"]).toBe("moderate");
      expect(byLabel["Evenness"]).toBe("notable");

      expect(fetchMock).toHaveBeenCalledTimes(5);
      for (const call of fetchMock.mock.calls) {
        const url = String(call[0]);
        const init = call[1] as RequestInit | undefined;
        const headers = new Headers(init?.headers);
        if (url === SIGNED_PUT_URL) {
          expect(headers.get("Authorization")).toBeNull();
          expect(headers.get("Cookie")).toBeNull();
          expect(init?.method).toBe("PUT");
        } else {
          expect(headers.get("Authorization")).toBe(`Bearer ${API_KEY}`);
        }
      }

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(API_KEY);
    });

    it("returns empty observations when no numeric outputs", async () => {
      fetchMock
        .mockResolvedValueOnce(fileMetaResponse())
        .mockResolvedValueOnce(new Response(null, { status: 200 }))
        .mockResolvedValueOnce(jsonResponse({ data: { task_id: "t1" } }))
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              task_status: "success",
              results: {
                output: [
                  { type: "all" },
                  { type: "skin_age", score: 40 },
                  { type: "texture" },
                ],
              },
            },
          }),
        );

      const result = await createProvider().analyzeSkin({ imageBase64: JPEG_B64 });
      expect(result.isMock).toBe(false);
      expect(result.observations).toEqual([]);
      expect(result.preparationSuggestions.length).toBeGreaterThan(0);
      expect(result.lightingNotes.length).toBeGreaterThan(0);
    });

    it("accepts data URL input", async () => {
      mockSkinSuccessFlow(fetchMock);
      const result = await createProvider().analyzeSkin({
        imageBase64: `data:image/jpeg;base64,${JPEG_B64}`,
      });
      expect(result.observations).toHaveLength(1);
    });

    it("accepts parseable WebP through mocked skin flow", async () => {
      mockSkinSuccessFlow(fetchMock);
      const result = await createProvider().analyzeSkin({ imageBase64: WEBP_B64 });
      expect(result.isMock).toBe(false);
      expect(result.observations).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe("upload validation", () => {
    it("rejects invalid base64 without fetch", async () => {
      await expect(
        createProvider().analyzeSkin({ imageBase64: "not!!!valid" }),
      ).rejects.toThrow(YouCamConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects unsupported image format without fetch", async () => {
      await expect(
        createProvider().analyzeSkin({ imageBase64: "dGVzdGltYWdlZGF0YQ==" }),
      ).rejects.toThrow(YouCamConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects images larger than 10MB without fetch", async () => {
      const big = Buffer.alloc(10 * 1024 * 1024 + 64);
      big[0] = 0xff;
      big[1] = 0xd8;
      big[2] = 0xff;
      const b64 = big.toString("base64");

      await expect(
        createProvider().analyzeSkin({ imageBase64: b64 }),
      ).rejects.toThrow(YouCamConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects malformed supported JPEG (unparseable dims) before fetch", async () => {
      await expect(
        createProvider().analyzeSkin({ imageBase64: MALFORMED_JPEG_B64 }),
      ).rejects.toThrow(YouCamConfigurationError);
      await expect(
        createProvider().analyzeSkin({ imageBase64: MALFORMED_JPEG_B64 }),
      ).rejects.toThrow(/Unable to read image dimensions/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects undersized parseable JPEG skin image before fetch", async () => {
      const b64 = jpegBase64WithDimensions(200, 200);
      let caught: unknown;
      try {
        await createProvider().analyzeSkin({ imageBase64: b64 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(YouCamConfigurationError);
      const message = (caught as Error).message;
      expect(message).toMatch(/200x200/);
      expect(message).toMatch(/480/);
      expect(message).toMatch(/No upload was attempted/);
      expect(message).not.toContain(API_KEY);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects undersized parseable PNG skin image before fetch", async () => {
      const b64 = pngBase64WithDimensions(100, 400);
      await expect(
        createProvider().analyzeSkin({ imageBase64: b64 }),
      ).rejects.toThrow(YouCamConfigurationError);
      await expect(
        createProvider().analyzeSkin({ imageBase64: b64 }),
      ).rejects.toThrow(/100x400/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects undersized WebP skin image before fetch", async () => {
      const b64 = webpBase64WithDimensions(320, 240);
      await expect(
        createProvider().analyzeSkin({ imageBase64: b64 }),
      ).rejects.toThrow(YouCamConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects oversized-dimension skin image before fetch", async () => {
      const b64 = jpegBase64WithDimensions(5000, 500);
      let caught: unknown;
      try {
        await createProvider().analyzeSkin({ imageBase64: b64 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(YouCamConfigurationError);
      const message = (caught as Error).message;
      expect(message).toMatch(/5000x500/);
      expect(message).toMatch(/4096/);
      expect(message).toMatch(/No upload was attempted/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("HD skin actions require short side >= 1080 before fetch", async () => {
      const b64 = jpegBase64WithDimensions(640, 480);
      await expect(
        createProvider({ skinActions: ["hd_texture", "hd_pore"] }).analyzeSkin({
          imageBase64: b64,
        }),
      ).rejects.toThrow(/1080/);
      expect(fetchMock).not.toHaveBeenCalled();

      mockSkinSuccessFlow(fetchMock);
      const ok = jpegBase64WithDimensions(1920, 1080);
      const result = await createProvider({
        skinActions: ["hd_texture"],
      }).analyzeSkin({ imageBase64: ok });
      expect(result.isMock).toBe(false);
      expect(fetchMock).toHaveBeenCalled();
    });

    it("accepts valid-dimension JPEG through mocked skin flow", async () => {
      mockSkinSuccessFlow(fetchMock);
      const result = await createProvider().analyzeSkin({ imageBase64: JPEG_B64 });

      expect(result.isMock).toBe(false);
      expect(result.observations).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalled();
      expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
        `${BASE_URL}/s2s/v2.0/file`,
      );
      expect(JSON.stringify(result)).not.toContain(API_KEY);
    });

    it("rejects bad signed upload host/method without PUT", async () => {
      fetchMock.mockResolvedValueOnce(
        fileMetaResponse("f1", {
          url: "https://evil.example.com/object",
          method: "PUT",
        }),
      );
      await expect(
        createProvider().analyzeSkin({ imageBase64: JPEG_B64 }),
      ).rejects.toThrow(YouCamApiError);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockReset();
      fetchMock.mockResolvedValueOnce(
        fileMetaResponse("f1", {
          url: SIGNED_PUT_URL,
          method: "POST",
        }),
      );
      await expect(
        createProvider().analyzeSkin({ imageBase64: JPEG_B64 }),
      ).rejects.toThrow(/PUT/);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      fetchMock.mockReset();
      fetchMock.mockResolvedValueOnce(
        fileMetaResponse("f1", {
          url: `http://${YCE_HOST}/object`,
          method: "PUT",
        }),
      );
      await expect(
        createProvider().analyzeSkin({ imageBase64: JPEG_B64 }),
      ).rejects.toThrow(YouCamApiError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("strips Authorization/Cookie from signed upload headers", async () => {
      fetchMock
        .mockResolvedValueOnce(
          fileMetaResponse("f1", {
            headers: {
              "Content-Type": "image/jpeg",
              Authorization: "Bearer should-not-send",
              Cookie: "session=nope",
              "Proxy-Authorization": "Basic xxx",
              "x-amz-security-token": "tok",
            },
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 200 }))
        .mockResolvedValueOnce(jsonResponse({ data: { task_id: "t1" } }))
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              task_status: "success",
              results: { output: [{ type: "texture", ui_score: 80 }] },
            },
          }),
        );

      await createProvider().analyzeSkin({ imageBase64: JPEG_B64 });
      const putCall = fetchMock.mock.calls.find(
        (c) => String(c[0]) === SIGNED_PUT_URL,
      );
      expect(putCall).toBeDefined();
      const headers = new Headers((putCall?.[1] as RequestInit)?.headers);
      expect(headers.get("Authorization")).toBeNull();
      expect(headers.get("Cookie")).toBeNull();
      expect(headers.get("Proxy-Authorization")).toBeNull();
      expect(headers.get("Content-Type")).toBe("image/jpeg");
      expect(headers.get("x-amz-security-token")).toBe("tok");
    });

    it("throws on malformed file API response", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ data: { files: [] } }));

      await expect(
        createProvider().analyzeSkin({ imageBase64: JPEG_B64 }),
      ).rejects.toThrow(YouCamApiError);
    });

    it("throws YouCamApiError on non-OK API response without leaking secrets", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { message: "quota exceeded", error_code: "QUOTA" },
          403,
        ),
      );

      let caught: unknown;
      try {
        await createProvider().analyzeSkin({ imageBase64: JPEG_B64 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(YouCamApiError);
      const err = caught as YouCamApiError;
      expect(err.status).toBe(403);
      expect(err.errorCode).toBe("QUOTA");
      expect(err.message).toContain("403");
      expect(err.message).not.toContain(API_KEY);
      expect(err.message).not.toMatch(/Bearer/i);
      expect(JSON.stringify(err)).not.toContain(API_KEY);
    });
  });

  describe("task polling", () => {
    it("throws on task error status", async () => {
      fetchMock
        .mockResolvedValueOnce(fileMetaResponse())
        .mockResolvedValueOnce(new Response(null, { status: 200 }))
        .mockResolvedValueOnce(jsonResponse({ data: { task_id: "t-err" } }))
        .mockResolvedValueOnce(
          jsonResponse({
            data: {
              task_status: "ERROR",
              message: "face not detected",
              error_code: "NO_FACE",
            },
          }),
        );

      let caught: unknown;
      try {
        await createProvider().analyzeSkin({ imageBase64: JPEG_B64 });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(YouCamApiError);
      const err = caught as YouCamApiError;
      expect(err.taskStatus).toBe("error");
      expect(err.taskId).toBe("t-err");
      expect(err.message).not.toContain(API_KEY);
      expect(err.message).not.toContain("t-err");
    });

    it("treats unknown task status as terminal failure (no poll-until-timeout)", async () => {
      fetchMock
        .mockResolvedValueOnce(fileMetaResponse())
        .mockResolvedValueOnce(new Response(null, { status: 200 }))
        .mockResolvedValueOnce(jsonResponse({ data: { task_id: "t-unk" } }))
        .mockResolvedValueOnce(
          jsonResponse({ data: { task_status: "weird_state" } }),
        );

      let caught: unknown;
      try {
        await createProvider({ timeoutMs: 5_000 }).analyzeSkin({
          imageBase64: JPEG_B64,
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(YouCamApiError);
      expect((caught as YouCamApiError).taskStatus).toBe("weird_state");
      // file meta + PUT + create + one status = 4 (no repeated polls)
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("treats cancelled/failed/expired as terminal", async () => {
      for (const status of ["cancelled", "failed", "expired"]) {
        fetchMock.mockReset();
        fetchMock
          .mockResolvedValueOnce(fileMetaResponse())
          .mockResolvedValueOnce(new Response(null, { status: 200 }))
          .mockResolvedValueOnce(jsonResponse({ data: { task_id: "t-x" } }))
          .mockResolvedValueOnce(
            jsonResponse({ data: { task_status: status } }),
          );

        await expect(
          createProvider().analyzeSkin({ imageBase64: JPEG_B64 }),
        ).rejects.toMatchObject({
          name: "YouCamApiError",
          taskStatus: status,
        });
        expect(fetchMock).toHaveBeenCalledTimes(4);
      }
    });

    it("times out when task never completes under shared deadline", async () => {
      fetchMock.mockImplementation((url: string) => {
        const u = String(url);
        if (u.endsWith("/s2s/v2.0/file")) {
          return Promise.resolve(fileMetaResponse());
        }
        if (u === SIGNED_PUT_URL) {
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        if (
          u.endsWith("/s2s/v2.1/task/skin-analysis") &&
          !u.includes("/s2s/v2.1/task/skin-analysis/")
        ) {
          return Promise.resolve(jsonResponse({ data: { task_id: "t-slow" } }));
        }
        return Promise.resolve(
          jsonResponse({ data: { task_status: "pending" } }),
        );
      });

      const provider = createProvider({ timeoutMs: 80, pollIntervalMs: 15 });
      await expect(
        provider.analyzeSkin({ imageBase64: JPEG_B64 }),
      ).rejects.toMatchObject({
        name: "YouCamApiError",
        message: expect.stringMatching(/timed out/i),
      });
    });
  });

  describe("generateApparelTryOn", () => {
    it("requires garmentImageBase64", async () => {
      await expect(
        createProvider().generateApparelTryOn({
          userImageBase64: JPEG_B64,
          garmentAssetId: "outfit-001",
        }),
      ).rejects.toThrow(YouCamConfigurationError);

      await expect(
        createProvider().generateApparelTryOn({
          userImageBase64: JPEG_B64,
          garmentAssetId: "outfit-001",
        }),
      ).rejects.toThrow(/garmentImageBase64/);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("requires user image", async () => {
      await expect(
        createProvider().generateApparelTryOn({
          garmentAssetId: "outfit-001",
          garmentImageBase64: PNG_B64,
        }),
      ).rejects.toThrow(YouCamConfigurationError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects undersized parseable source image before fetch", async () => {
      const small = jpegBase64WithDimensions(64, 64);
      const garment = jpegBase64WithDimensions(200, 200);
      let caught: unknown;
      try {
        await createProvider().generateApparelTryOn({
          userImageBase64: small,
          garmentAssetId: "outfit-small-src",
          garmentImageBase64: garment,
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(YouCamConfigurationError);
      const message = (caught as Error).message;
      expect(message).toMatch(/source/i);
      expect(message).toMatch(/64x64/);
      expect(message).toMatch(/128/);
      expect(message).toMatch(/No upload was attempted/);
      expect(message).not.toContain(API_KEY);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects undersized parseable garment/reference image before fetch", async () => {
      const source = jpegBase64WithDimensions(200, 200);
      const smallGarment = pngBase64WithDimensions(50, 80);
      await expect(
        createProvider().generateApparelTryOn({
          userImageBase64: source,
          garmentAssetId: "outfit-small-ref",
          garmentImageBase64: smallGarment,
        }),
      ).rejects.toThrow(YouCamConfigurationError);
      await expect(
        createProvider().generateApparelTryOn({
          userImageBase64: source,
          garmentAssetId: "outfit-small-ref",
          garmentImageBase64: smallGarment,
        }),
      ).rejects.toThrow(/garment/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("uploads source + garment, polls, returns trusted YCE result URL", async () => {
      let fileCall = 0;
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.endsWith("/s2s/v2.0/file")) {
          fileCall += 1;
          return Promise.resolve(fileMetaResponse(`file-${fileCall}`));
        }
        if (u === SIGNED_PUT_URL) {
          const headers = new Headers(init?.headers);
          expect(headers.get("Authorization")).toBeNull();
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        if (u.endsWith("/s2s/v2.0/task/cloth-v4")) {
          const headers = new Headers(init?.headers);
          expect(headers.get("Authorization")).toBe(`Bearer ${API_KEY}`);
          const body = JSON.parse(String(init?.body));
          expect(body.src_file_id).toBe("file-1");
          expect(body.ref_file_id).toBe("file-2");
          expect(body.garment_category).toBe("upper_body");
          return Promise.resolve(jsonResponse({ data: { task_id: "cloth-1" } }));
        }
        if (u.includes("/s2s/v2.0/task/cloth-v4/")) {
          return Promise.resolve(
            jsonResponse({
              data: {
                task_status: "success",
                results: { url: RESULT_URL },
              },
            }),
          );
        }
        return Promise.resolve(jsonResponse({}, 500));
      });

      const result = await createProvider().generateApparelTryOn({
        userImageBase64: JPEG_B64,
        garmentAssetId: "outfit-001",
        garmentImageBase64: PNG_B64,
        garmentCategory: "upper_body",
      });

      expect(result.isMock).toBe(false);
      expect(result.renderedImageUrl).toBe(RESULT_URL);
      expect(typeof result.processingTimeMs).toBe("number");
      expect(JSON.stringify(result)).not.toContain(API_KEY);
    });

    it("accepts alternate results shape at root", async () => {
      let fileCall = 0;
      fetchMock.mockImplementation((url: string) => {
        const u = String(url);
        if (u.endsWith("/s2s/v2.0/file")) {
          fileCall += 1;
          return Promise.resolve(fileMetaResponse(`file-${fileCall}`));
        }
        if (u === SIGNED_PUT_URL) {
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        if (u.endsWith("/s2s/v2.0/task/cloth-v4")) {
          return Promise.resolve(jsonResponse({ data: { task_id: "cloth-2" } }));
        }
        if (u.includes("/cloth-v4/")) {
          return Promise.resolve(
            jsonResponse({
              task_status: "success",
              results: { url: `https://${YCE_HOST}/alt.jpg` },
            }),
          );
        }
        return Promise.resolve(jsonResponse({}, 500));
      });

      const result = await createProvider().generateApparelTryOn({
        userImageBase64: JPEG_B64,
        garmentAssetId: "outfit-002",
        garmentImageBase64: JPEG_B64,
      });
      expect(result.renderedImageUrl).toBe(`https://${YCE_HOST}/alt.jpg`);
    });

    it("rejects non-https and non-YCE result URLs", async () => {
      for (const badUrl of [
        "http://yce-us-west-2.s3-accelerate.amazonaws.com/x.jpg",
        "https://cdn.example.com/tryon.jpg",
        `https://user:pass@${YCE_HOST}/x.jpg`,
      ]) {
        let fileCall = 0;
        fetchMock.mockReset();
        fetchMock.mockImplementation((url: string) => {
          const u = String(url);
          if (u.endsWith("/s2s/v2.0/file")) {
            fileCall += 1;
            return Promise.resolve(fileMetaResponse(`file-${fileCall}`));
          }
          if (u === SIGNED_PUT_URL) {
            return Promise.resolve(new Response(null, { status: 200 }));
          }
          if (u.endsWith("/s2s/v2.0/task/cloth-v4")) {
            return Promise.resolve(jsonResponse({ data: { task_id: "cloth-3" } }));
          }
          return Promise.resolve(
            jsonResponse({
              data: {
                task_status: "success",
                results: { url: badUrl },
              },
            }),
          );
        });

        let caught: unknown;
        try {
          await createProvider().generateApparelTryOn({
            userImageBase64: JPEG_B64,
            garmentAssetId: "outfit-003",
            garmentImageBase64: JPEG_B64,
          });
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeInstanceOf(YouCamApiError);
        expect((caught as Error).message).not.toContain(badUrl);
        expect((caught as Error).message).not.toContain(API_KEY);
      }
    });
  });
});
