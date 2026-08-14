import type { VenueContext } from "@/lib/venue/types";
import type { ComposedOutfit } from "@/lib/wardrobe/composer";

import type { OccasionSkinTone } from "@/lib/occasion/preferences";

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
  /** Optional manual preference; never inferred from an image. */
  colorPreference?: string;
  /** Optional manual preference; never inferred from an image. */
  skinTonePreference?: OccasionSkinTone;
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
