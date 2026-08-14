import { z } from "zod";
import { MockVenueLookupProvider } from "./mock-provider";
import type { VenueContext, VenueLookupInput, VenueProvider } from "./types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

const ResearchOutputSchema = z.object({
  dressCode: z.enum([
    "casual",
    "smart-casual",
    "business-casual",
    "business-professional",
    "formal",
  ]),
  formalityLevel: z.number().int().min(0).max(4),
  palette: z.array(z.string().trim().min(1)).min(1).max(6),
  cultureHints: z.array(z.string().trim().min(1)).max(3),
  confidence: z.number().min(0).max(1),
  sources: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        url: z.string().url(),
      }),
    )
    .max(3)
    .default([]),
});

type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

interface OpenAIResponse {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{ text?: unknown }>;
  }>;
}

function shouldResearch(input: VenueLookupInput): boolean {
  const text = [input.venueName, input.location].filter(Boolean).join(" ");
  return Boolean(
    input.location?.trim() ||
      /\b(restaurant|bar|cafe|café|hotel|club|venue|gallery|museum|campus|hq|headquarters|rooftop|terrace|resort|country club|theater|theatre)\b/i.test(
        text,
      ),
  );
}

function extractOutputText(response: OpenAIResponse): string {
  if (typeof response.output_text === "string") return response.output_text;

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .filter(Boolean)
    .join("\n");
}

function parseJsonObject(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    }
    throw new Error("OpenAI web research returned invalid JSON.");
  }
}

function buildPrompt(input: VenueLookupInput): string {
  return [
    "Research the event context for an outfit recommendation.",
    "Use web search only when the named venue, company, restaurant, or location is concrete enough to identify.",
    "Return only a JSON object matching the requested schema.",
    "Do not infer the user's identity, body, skin tone, race, gender, or attractiveness.",
    "Use short, practical style context; do not copy long passages from sources.",
    "",
    `Event type: ${input.eventType}`,
    `Event or venue description: ${input.venueName.slice(0, 200)}`,
    `Location or research anchor: ${(input.location ?? "").slice(0, 200) || "none"}`,
    "",
    JSON.stringify({
      dressCode: "casual | smart-casual | business-casual | business-professional | formal",
      formalityLevel: "integer 0 through 4",
      palette: ["lowercase color names"],
      cultureHints: ["one to three short context hints"],
      confidence: "number 0 through 1",
      sources: [{ title: "source title", url: "https://example.com" }],
    }),
  ].join("\n");
}

export class OpenAIWebResearchProvider implements VenueProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fallback = new MockVenueLookupProvider();

  constructor(config: { apiKey: string; model?: string }) {
    if (!config.apiKey.trim()) {
      throw new Error("VENUE_MODE=openai requires OPENAI_API_KEY to be set.");
    }
    this.apiKey = config.apiKey;
    this.model = config.model?.trim() || DEFAULT_MODEL;
  }

  async lookupVenue(input: VenueLookupInput): Promise<VenueContext> {
    if (!shouldResearch(input)) {
      return this.fallback.lookupVenue(input);
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        tools: [{ type: "web_search_preview" }],
        input: buildPrompt(input),
        max_output_tokens: 700,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI web research request failed.");
    }

    const body = (await response.json()) as OpenAIResponse;
    const text = extractOutputText(body);
    const parsed = ResearchOutputSchema.safeParse(parseJsonObject(text));
    if (!parsed.success) {
      throw new Error("OpenAI web research returned an invalid event context.");
    }

    return this.toVenueContext(parsed.data);
  }

  private toVenueContext(result: ResearchOutput): VenueContext {
    return {
      dressCode: result.dressCode,
      formalityLevel: result.formalityLevel,
      palette: Array.from(new Set(result.palette.map((color) => color.toLowerCase()))),
      cultureHints: result.cultureHints,
      confidence: result.confidence,
      isMock: false,
      source: "openai:web-search",
      research: {
        provider: "openai-web-search",
        fetchedAt: new Date().toISOString(),
        sources: result.sources,
      },
    };
  }
}
