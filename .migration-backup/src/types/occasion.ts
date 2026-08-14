import type { VenueContext } from "@/lib/venue/types";
import type { ComposedOutfit } from "@/lib/wardrobe/composer";

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
