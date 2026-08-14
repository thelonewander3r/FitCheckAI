import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/session-service", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/services/session-service";
import { GET } from "./route";

const getSessionMock = vi.mocked(getSession);

describe("GET try-on image proxy", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects invalid session UUID", async () => {
    const res = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "not-a-uuid", outfitId: "outfit-001" }),
    });
    expect(res.status).toBe(400);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("rejects invalid outfit id", async () => {
    const res = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({
        id: "11111111-1111-4111-8111-111111111111",
        outfitId: "../evil",
      }),
    });
    expect(res.status).toBe(400);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("does not accept a URL from the request and ignores query params", async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await GET(
      new Request(
        "http://localhost/api/sessions/x/try-on/y/image?url=https://evil.example.com/x.jpg",
      ),
      {
        params: Promise.resolve({
          id: "11111111-1111-4111-8111-111111111111",
          outfitId: "outfit-001",
        }),
      },
    );
    expect(res.status).toBe(404);
    expect(getSessionMock).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("fails closed when stored URL is not a trusted YCE host", async () => {
    getSessionMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      tryOnResults: {
        "outfit-001": {
          renderedImageUrl: "https://cdn.example.com/tryon.jpg",
          isMock: false,
        },
      },
    } as never);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({
        id: "11111111-1111-4111-8111-111111111111",
        outfitId: "outfit-001",
      }),
    });

    expect(res.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Try-on image unavailable.");
    expect(JSON.stringify(body)).not.toContain("cdn.example.com");
  });

  it("proxies trusted YCE image bytes without exposing the upstream URL", async () => {
    const upstream =
      "https://yce-us-west-2.s3-accelerate.amazonaws.com/results/tryon.jpg";
    getSessionMock.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      tryOnResults: {
        "outfit-001": {
          renderedImageUrl: upstream,
          isMock: false,
        },
      },
    } as never);

    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(new Request("http://localhost/x"), {
      params: Promise.resolve({
        id: "11111111-1111-4111-8111-111111111111",
        outfitId: "outfit-001",
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(upstream);
    const text = await res.text();
    expect(text).not.toContain("amazonaws.com");
  });
});
