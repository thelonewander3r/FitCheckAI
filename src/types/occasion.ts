import type { VenueContext } from "@/lib/venue/types";
import type { WardrobeItem } from "@/types/wardrobe";

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

/**
 * Wardrobe item as persisted inside an occasion session.
 * Deliberately omits imageBase64: composed plans persist garment metadata and
 * editorial references, never user wardrobe image bytes.
 */
export type PersistedWardrobeItem = Omit<WardrobeItem, "imageBase64">;

/** Outfit as persisted inside an occasion session (no image bytes). */
export interface PersistedOutfit {
  id: string;
  items: PersistedWardrobeItem[];
  score: number;
  why: string[];
  /** Optional editorial preview used by the deterministic public demo only. */
  previewImageUrl?: string;
  previewImageAlt?: string;
}

export interface OccasionSession {
  id: string;
  intake: OccasionIntake;
  venueContext?: VenueContext;
  outfits: PersistedOutfit[];
  gaps: string[];
  isMockMode?: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}
