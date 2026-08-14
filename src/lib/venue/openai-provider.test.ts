import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIWebResearchProvider } from "./openai-provider";

const OPENAI_CONTEXT = {
  dressCode: "smart-casual",
  formalityLevel: 1,
  palette: ["navy", "cream", "emerald"],
  cultureHints: ["The venue leans polished but relaxed."],
  confidence: 0.82,
  sources: [
    { title: "Venue details", url: "https://example.com/venue" },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OpenAIWebResearchProvider", () => {
  it("requires a server-side API key", () => {
    expect(() => new OpenAIWebResearchProvider({ apiKey: "" })).toThrow(
      "OPENAI_API_KEY",
    );
  });

  it("uses the deterministic provider when no concrete research anchor exists", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIWebResearchProvider({ apiKey: "test-key" });
    const result = await provider.lookupVenue({
      venueName: "a wedding",
      eventType: "wedding",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.isMock).toBe(true);
    expect(result.source).toBe("mock:curated");
  });

  it("researches a concrete location and maps structured context plus sources", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ output_text: JSON.stringify(OPENAI_CONTEXT) }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIWebResearchProvider({
      apiKey: "test-key",
      model: "test-model",
    });
    const result = await provider.lookupVenue({
      venueName: "The Lantern Rooftop",
      eventType: "dinner",
      location: "Brooklyn, NY",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "test-model",
      tools: [{ type: "web_search_preview" }],
    });
    expect(result.isMock).toBe(false);
    expect(result.source).toBe("openai:web-search");
    expect(result.research?.provider).toBe("openai-web-search");
    expect(result.research?.sources[0]?.url).toBe("https://example.com/venue");
  });

  it("fails without exposing the response body when OpenAI rejects the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("private upstream detail", { status: 500 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAIWebResearchProvider({ apiKey: "test-key" });
    await expect(
      provider.lookupVenue({
        venueName: "The Lantern Rooftop",
        eventType: "dinner",
        location: "Brooklyn, NY",
      }),
    ).rejects.toThrow("OpenAI web research request failed.");
  });
});
