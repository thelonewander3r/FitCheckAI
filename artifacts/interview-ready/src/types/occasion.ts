import type { WardrobeFormality } from "./wardrobe";
import type { ComposedOutfit } from "@/lib/wardrobe/composer";

export type { ComposedOutfit };

export const OCCASION_TYPES = [
  "interview",
  "client-meeting",
  "gala",
  "dinner",
  "wedding",
  "casual-outing",
  "conference",
  "date",
  "other",
] as const;

export type OccasionType = (typeof OCCASION_TYPES)[number];

export interface OccasionIntake {
  eventType: OccasionType;
  theme?: string;
  venueName: string;
  location?: string;
  eventDate?: string;
  presentation?: "feminine" | "masculine" | "neutral";
  skinTone?: "fair" | "light" | "medium" | "tan" | "deep";
}

/** Inlined from venue/types — server-only venue module was removed from the frontend bundle */
export interface VenueContext {
  dressCode: WardrobeFormality;
  formalityLevel: number;
  palette: string[];
  cultureHints: string[];
  confidence: number;
  isMock: boolean;
  source: string;
}

export interface OccasionSession {
  id: string;
  intake: OccasionIntake;
  venueContext?: VenueContext;
  outfits: ComposedOutfit[];
  gaps: string[];
  isMockMode?: boolean;
  createdAt: string;
  updatedAt: string;
}
