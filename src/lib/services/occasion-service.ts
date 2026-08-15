import {
  createOccasion as storeCreate,
  getOccasion as storeGet,
  listOccasions as storeList,
} from "@/lib/occasion-store";
import { composeOutfits } from "@/lib/wardrobe/composer";
import { listItems } from "@/lib/wardrobe-store";
import { listRecords } from "@/lib/worn-store";
import {
  buildStyleProfile,
  preferencesFromProfile,
} from "@/lib/services/style-service";
import { formalityLevelToLabel, getVenueProvider } from "@/lib/venue";
import {
  colorsForSkinTonePreference,
  parseColorPreferences,
} from "@/lib/occasion/preferences";
import type {
  OccasionIntake,
  OccasionSession,
  PersistedOutfit,
  PersistedWardrobeItem,
} from "@/types/occasion";
import type { WardrobeItem } from "@/types/wardrobe";

export interface OccasionCreationOptions {
  /** Deterministic wardrobe used by the public demo; real users use their store. */
  wardrobeItems?: WardrobeItem[];
  /** Editorial reference images used only by the public demo result. */
  previewImageUrls?: string[];
  isDemo?: boolean;
}

/**
 * DTO boundary: persisted occasion outfits never carry wardrobe image bytes.
 * The composed in-memory shape may include imageBase64; the stored shape may not.
 */
function toPersistedWardrobeItem(item: WardrobeItem): PersistedWardrobeItem {
  const { imageBase64: _omit, ...rest } = item;
  void _omit;
  return rest;
}

export async function createOccasion(
  intake: OccasionIntake,
  options: OccasionCreationOptions = {},
): Promise<OccasionSession> {
  const venue = await getVenueProvider().lookupVenue({
    venueName: intake.venueName,
    eventType: intake.eventType,
    location: intake.location,
  });

  const items = options.wardrobeItems ?? (await listItems());
  let wornRecords: Awaited<ReturnType<typeof listRecords>> = [];
  try {
    wornRecords = await listRecords();
  } catch (err) {
    console.error(
      "[createOccasion] worn-store read failed; continuing without style preferences:",
      err instanceof Error ? err.message : err,
    );
  }
  const profile = buildStyleProfile(wornRecords);
  const profilePreferences = preferencesFromProfile(profile);
  const requestedColors = parseColorPreferences(intake.colorPreference);
  const skinToneColors = colorsForSkinTonePreference(intake.skinTonePreference);
  const preferenceColors = [
    ...new Set([...requestedColors, ...skinToneColors]),
  ];
  const preferences = {
    ...profilePreferences,
    colors: [...new Set([...(profilePreferences.colors ?? []), ...preferenceColors])],
  };
  const palette = [
    ...new Set([
      ...venue.palette.map((c) => c.toLowerCase()),
      ...preferenceColors,
    ]),
  ];
  const season = "any";
  const composed = composeOutfits(items, {
    formality: formalityLevelToLabel(venue.formalityLevel),
    palette,
    season,
    preferences,
  });

  const cultureHints = [...venue.cultureHints];
  const theme = intake.theme?.trim();
  if (theme) {
    const themeHint = `Theme "${theme}" — match the occasion's stated dress expectations.`;
    if (!cultureHints.includes(themeHint)) {
      cultureHints.push(themeHint);
    }
  }

  const outfits: PersistedOutfit[] = composed.outfits.map((o, index) => {
    const previewImageUrl = options.previewImageUrls?.[index];
    return {
      id: o.id,
      score: o.score,
      why: [...o.why],
      items: o.items.map(toPersistedWardrobeItem),
      ...(previewImageUrl
        ? {
            previewImageUrl,
            previewImageAlt: `Editorial reference for ${intake.eventType} outfit ${index + 1}`,
          }
        : {}),
    };
  });

  return storeCreate({
    intake,
    venueContext: { ...venue, cultureHints },
    outfits,
    gaps: composed.gaps,
    isMockMode: venue.isMock,
    isDemo: options.isDemo,
  });
}

export async function getOccasion(
  id: string,
): Promise<OccasionSession | null> {
  return storeGet(id);
}

export async function listOccasions(): Promise<OccasionSession[]> {
  return storeList();
}
