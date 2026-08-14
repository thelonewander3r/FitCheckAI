import type { OccasionType } from "@/types/occasion";
import type { WardrobeFormality } from "@/types/wardrobe";
import { formalityLevelToLabel } from "@/lib/wardrobe/formality";

export interface VenueLookupInput {
  venueName: string;
  eventType: OccasionType;
  /** Optional restaurant, company, venue, city, or other research anchor. */
  location?: string;
}

export type DressCodeLabel = WardrobeFormality;

export interface VenueSource {
  title: string;
  url: string;
}

export interface VenueResearch {
  provider: "openai-web-search";
  fetchedAt: string;
  sources: VenueSource[];
}

export interface VenueContext {
  dressCode: DressCodeLabel;
  formalityLevel: number; // casual=0 ... formal=4
  palette: string[]; // recommended colors, lowercase
  cultureHints: string[]; // 1-3 short sentences
  confidence: number; // 0..1
  isMock: boolean;
  source: string; // e.g. "mock:curated" | "mock:keyword" | "mock:event-default"
  research?: VenueResearch;
}

export interface VenueProvider {
  lookupVenue(input: VenueLookupInput): Promise<VenueContext>;
}

export { formalityLevelToLabel };
