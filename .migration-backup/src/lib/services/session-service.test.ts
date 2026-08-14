import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoredSession } from "@/lib/session-store";
import type { ApparelTryOnResult } from "@/lib/youcam/types";
import { YouCamApiError, YouCamConfigurationError } from "@/lib/youcam/live-provider";

vi.mock("@/lib/session-store", () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock("@/lib/youcam/skin-analysis", () => ({
  runSkinAnalysis: vi.fn(),
}));

vi.mock("@/lib/youcam/apparel-vto", () => ({
  runApparelVto: vi.fn(),
}));

vi.mock("@/lib/interview/context-engine", () => ({
  inferInterviewContext: vi.fn(() => ({
    inferredIndustry: "tech",
    dressCode: "business-casual",
    confidence: 0.8,
    recommendedColors: ["navy"],
  })),
}));

vi.mock("@/lib/outfits/ranking", () => ({
  selectTopOutfits: vi.fn(() => [
    { id: "outfit-001", name: "Test Outfit", score: 80 },
  ]),
}));

vi.mock("@/lib/outfits/templates", () => ({
  OUTFIT_TEMPLATES: [{ id: "outfit-001" }],
}));

vi.mock("@/lib/prep/plan-generator", () => ({
  generatePreparationPlan: vi.fn(),
}));

import { getSession as storeGet, updateSession as storeUpdate } from "@/lib/session-store";
import { runSkinAnalysis } from "@/lib/youcam/skin-analysis";
import { runApparelVto } from "@/lib/youcam/apparel-vto";
import {
  analyzeSession,
  toPublicSession,
  tryOnOutfit,
} from "./session-service";

const storeGetMock = vi.mocked(storeGet);
const storeUpdateMock = vi.mocked(storeUpdate);
const runSkinAnalysisMock = vi.mocked(runSkinAnalysis);
const runApparelVtoMock = vi.mocked(runApparelVto);

function baseSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    status: "intake",
    intake: {
      jobTitle: "Engineer",
      companyName: "Acme",
      industry: "tech",
      jobDescription: "Build things",
      interviewFormat: "video",
      interviewStage: "final",
      interviewDate: "2026-09-01",
      budget: 200,
      stylePreference: "classic",
      skinTone: "medium",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    outfits: [{ id: "outfit-001", name: "Test", score: 80 } as never],
    ...overrides,
  };
}

describe("toPublicSession", () => {
  it("strips userImageBase64 and rewrites live try-on URLs to proxy paths", () => {
    const liveUrl =
      "https://yce-us-west-2.s3-accelerate.amazonaws.com/results/tryon.jpg";
    const mockDataUrl = "data:image/svg+xml;base64,YWJj";
    const session = baseSession({
      userImageBase64: "SENSETIVE_SELFIE_BYTES",
      tryOnResults: {
        "outfit-001": {
          renderedImageUrl: liveUrl,
          isMock: false,
          processingTimeMs: 12,
        },
        "outfit-002": {
          renderedImageUrl: mockDataUrl,
          isMock: true,
        },
      },
    });

    const pub = toPublicSession(session);
    expect(pub).not.toHaveProperty("userImageBase64");
    expect(pub.tryOnResults?.["outfit-001"]?.renderedImageUrl).toBe(
      `/api/sessions/${session.id}/try-on/outfit-001/image`,
    );
    expect(pub.tryOnResults?.["outfit-001"]?.renderedImageUrl).not.toContain(
      "amazonaws.com",
    );
    expect(pub.tryOnResults?.["outfit-002"]?.renderedImageUrl).toBe(mockDataUrl);
  });
});

describe("analyzeSession live vs mock", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env["YOUCAM_MODE"];
  });

  it("re-throws skin analysis failures in live mode", async () => {
    process.env["YOUCAM_MODE"] = "live";
    const session = baseSession();
    storeGetMock.mockResolvedValue(session);
    storeUpdateMock.mockImplementation(async (_id, updates) => ({
      ...session,
      ...(typeof updates === "function" ? updates(session) : updates),
      updatedAt: "2026-01-01T00:00:01.000Z",
    }));
    runSkinAnalysisMock.mockRejectedValue(
      new YouCamApiError("HTTP 503", { status: 503, errorCode: "UNAVAILABLE" }),
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(analyzeSession(session.id)).rejects.toBeInstanceOf(YouCamApiError);

    expect(errorSpy).toHaveBeenCalledWith(
      "[analyzeSession] YouCam provider failed.",
      expect.objectContaining({
        errorClass: "YouCamApiError",
        status: 503,
        errorCode: "UNAVAILABLE",
      }),
    );
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain("HTTP 503");
    expect(logged).not.toContain("SENSETIVE");
    errorSpy.mockRestore();
  });

  it("fail-soft continues in mock mode when skin analysis fails", async () => {
    process.env["YOUCAM_MODE"] = "mock";
    const session = baseSession();
    storeGetMock.mockResolvedValue(session);
    storeUpdateMock.mockImplementation(async (_id, updates) => ({
      ...session,
      ...(typeof updates === "function" ? updates(session) : updates),
      status: "ready",
      updatedAt: "2026-01-01T00:00:01.000Z",
    }));
    runSkinAnalysisMock.mockRejectedValue(new Error("mock provider hiccup"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await analyzeSession(session.id);
    expect(result.status).toBe("ready");
    expect(runSkinAnalysisMock).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("tryOnOutfit live vs mock", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env["YOUCAM_MODE"];
  });

  it("throws YouCamConfigurationError in live mode without garment image (no VTO call)", async () => {
    process.env["YOUCAM_MODE"] = "live";
    const session = baseSession();
    storeGetMock.mockResolvedValue(session);

    await expect(tryOnOutfit(session.id, "outfit-001")).rejects.toBeInstanceOf(
      YouCamConfigurationError,
    );
    expect(runApparelVtoMock).not.toHaveBeenCalled();
  });

  it("re-throws live VTO failures instead of storing empty mock result", async () => {
    process.env["YOUCAM_MODE"] = "live";
    const session = baseSession();
    storeGetMock.mockResolvedValue(session);
    storeUpdateMock.mockImplementation(async (_id, updates) => ({
      ...session,
      ...(typeof updates === "function" ? updates(session) : updates),
      updatedAt: "2026-01-01T00:00:01.000Z",
    }));
    runApparelVtoMock.mockRejectedValue(
      new YouCamApiError("Task failed.", { taskStatus: "error" }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      tryOnOutfit(session.id, "outfit-001", pngTiny()),
    ).rejects.toBeInstanceOf(YouCamApiError);

    expect(storeUpdateMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("stores empty mock fallback only in mock mode on VTO failure", async () => {
    process.env["YOUCAM_MODE"] = "mock";
    const session = baseSession();
    storeGetMock.mockResolvedValue(session);
    let stored: ApparelTryOnResult | undefined;
    storeUpdateMock.mockImplementation(async (_id, updates) => {
      const patch = typeof updates === "function" ? updates(session) : updates;
      stored = patch.tryOnResults?.["outfit-001"];
      return {
        ...session,
        ...patch,
        updatedAt: "2026-01-01T00:00:01.000Z",
      };
    });
    runApparelVtoMock.mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await tryOnOutfit(session.id, "outfit-001");
    expect(stored).toEqual({
      renderedImageUrl: "",
      isMock: true,
      processingTimeMs: 0,
    });
    errorSpy.mockRestore();
  });
});

/** Tiny valid PNG base64 (1×1) — not used as a real secret. */
function pngTiny(): string {
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}
