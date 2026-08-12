import type { OccasionType } from "@/types/occasion";
import type { WardrobeFormality } from "@/types/wardrobe";
import { WARDROBE_FORMALITY } from "@/types/wardrobe";

export interface VenueLookupInput {
  venueName: string;
  eventType: OccasionType;
}

export type DressCodeLabel = WardrobeFormality;

export interface VenueContext {
  dressCode: DressCodeLabel;
  formalityLevel: number; // casual=0 ... formal=4
  palette: string[]; // recommended colors, lowercase
  cultureHints: string[]; // 1-3 short sentences
  confidence: number; // 0..1
  isMock: boolean;
  source: string; // e.g. "mock:curated" | "mock:keyword" | "mock:event-default"
}

export interface VenueProvider {
  lookupVenue(input: VenueLookupInput): Promise<VenueContext>;
}

export function formalityLevelToLabel(level: number): DressCodeLabel {
  if (!Number.isFinite(level)) return "smart-casual";
  const clamped = Math.max(0, Math.min(4, Math.round(level)));
  return WARDROBE_FORMALITY[clamped]!;
}
