import type { VenueContext } from "@/lib/venue/types";
import type { WardrobeItem } from "@/types/wardrobe";
import type { ApparelTryOnResult, GarmentCategory } from "@/lib/youcam/types";
import type { SkinAnalysisResult } from "@/types/interview";

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

/**
 * An AI Clothes render for one outfit, plus the wardrobe piece that was sent as
 * the garment reference. The piece is recorded so the UI can say exactly what
 * was rendered instead of implying the whole outfit was generated.
 */
export interface OccasionTryOnResult extends ApparelTryOnResult {
  garmentItemId: string;
  garmentItemName?: string;
  garmentCategory: GarmentCategory;
}

export interface OccasionSession {
  id: string;
  intake: OccasionIntake;
  venueContext?: VenueContext;
  outfits: PersistedOutfit[];
  gaps: string[];
  isMockMode?: boolean;
  isDemo?: boolean;
  /** AI Clothes renders keyed by outfit id. User photos are never persisted. */
  tryOnResults?: Record<string, OccasionTryOnResult>;
  /** Skin AI observations for pre-event cosmetic prep, safety-filtered. */
  skinPrep?: SkinAnalysisResult;
  createdAt: string;
  updatedAt: string;
}
