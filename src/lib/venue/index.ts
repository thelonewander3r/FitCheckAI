import { LiveVenueLookupProvider } from "./live-provider";
import { MockVenueLookupProvider } from "./mock-provider";
import { OpenAIWebResearchProvider } from "./openai-provider";
import type { VenueProvider } from "./types";

export { formalityLevelToLabel } from "./types";
export { LiveVenueLookupProvider } from "./live-provider";
export { MockVenueLookupProvider } from "./mock-provider";
export { OpenAIWebResearchProvider } from "./openai-provider";
export type {
  DressCodeLabel,
  VenueContext,
  VenueLookupInput,
  VenueProvider,
  VenueResearch,
  VenueSource,
} from "./types";

/**
 * Returns the venue provider based on VENUE_MODE.
 * Defaults to the mock provider when the variable is absent or not "openai".
 * The OpenAI provider only researches concrete venue/location anchors.
 */
export function getVenueProvider(): VenueProvider {
  if (process.env["VENUE_MODE"] === "openai") {
    return new OpenAIWebResearchProvider({
      apiKey: process.env["OPENAI_API_KEY"] ?? "",
      model: process.env["OPENAI_WEB_SEARCH_MODEL"],
    });
  }
  if (process.env["VENUE_MODE"] === "live") {
    return new LiveVenueLookupProvider();
  }
  return new MockVenueLookupProvider();
}
