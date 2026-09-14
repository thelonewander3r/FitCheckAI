import {
  createOccasion as storeCreate,
  getOccasion as storeGet,
  listOccasions as storeList,
  updateOccasion as storeUpdate,
} from "@/lib/occasion-store";
import { composeOutfits } from "@/lib/wardrobe/composer";
import { getItem, listItems } from "@/lib/wardrobe-store";
import { selectGarmentReference } from "@/lib/wardrobe/garment-reference";
import { runApparelVto } from "@/lib/youcam/apparel-vto";
import {
  assertTryOnSourcePhoto,
  isUsableGarmentPhoto,
} from "@/lib/youcam/try-on-photo-gate";
import { TRY_ON_GARMENT_UNUSABLE } from "@/lib/youcam/try-on-photo-messages";
import { runSkinAnalysis } from "@/lib/youcam/skin-analysis";
import { MockYouCamProvider } from "@/lib/youcam/mock-provider";
import { isLiveYouCamMode, logYouCamFailure } from "@/lib/youcam/logging";
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
  OccasionTryOnResult,
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

/**
 * Occasion shape returned to the client. Live AI Clothes results are signed,
 * expiring YCE URLs, so they are rewritten to an app-owned proxy path and the
 * signed URL stays on the server.
 */
export function toPublicOccasion(occasion: OccasionSession): OccasionSession {
  const { tryOnResults } = occasion;
  if (!tryOnResults) return occasion;

  const rewritten: Record<string, OccasionTryOnResult> = {};
  for (const [outfitId, result] of Object.entries(tryOnResults)) {
    const url = result.renderedImageUrl ?? "";
    if (result.isMock || url.startsWith("data:")) {
      rewritten[outfitId] = result;
      continue;
    }
    rewritten[outfitId] = {
      ...result,
      renderedImageUrl: `/api/occasions/${occasion.id}/try-on/${outfitId}/image`,
    };
  }

  return { ...occasion, tryOnResults: rewritten };
}

/** Raised when an outfit has no wardrobe photo that AI Clothes can render. */
export class GarmentReferenceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GarmentReferenceUnavailableError";
  }
}

/**
 * Render one piece of a composed outfit onto the user's photo with YouCam
 * AI Clothes.
 *
 * The garment reference is the photo the user already saved for that wardrobe
 * piece, which is what makes live try-on possible from the closet rather than
 * from a catalog. The user photo is passed through to the provider and never
 * persisted; only the resulting render is stored.
 */
export async function tryOnOccasionOutfit(
  occasionId: string,
  outfitId: string,
  userImageBase64: string,
  preferredItemId?: string,
): Promise<OccasionSession> {
  const occasion = await storeGet(occasionId);
  if (!occasion) throw new Error(`Occasion ${occasionId} not found`);

  const outfit = occasion.outfits.find((o) => o.id === outfitId);
  if (!outfit) throw new Error("Invalid outfit");

  // Reject empty / tiny source photos before any YouCam upload.
  assertTryOnSourcePhoto(userImageBase64);

  const reference = selectGarmentReference(outfit.items, preferredItemId);
  if (!reference) {
    throw new GarmentReferenceUnavailableError(
      preferredItemId
        ? "That piece is not available for try-on in this look."
        : "This look has no garment that AI Clothes can render.",
    );
  }

  // Composed outfits persist garment metadata only; the photo lives in the
  // wardrobe store and is read back here at request time.
  const stored = await getItem(reference.item.id);
  const garmentImageBase64 = stored?.imageBase64?.trim();

  const live = isLiveYouCamMode();
  if (live && (!garmentImageBase64 || !isUsableGarmentPhoto(garmentImageBase64))) {
    throw new GarmentReferenceUnavailableError(TRY_ON_GARMENT_UNUSABLE);
  }

  let vtoResult;
  try {
    vtoResult = await runApparelVto({
      userImageBase64,
      garmentAssetId: reference.item.id,
      garmentCategory: reference.garmentCategory,
      ...(garmentImageBase64 ? { garmentImageBase64 } : {}),
    });
  } catch (err) {
    logYouCamFailure("tryOnOccasionOutfit", err);
    if (live) throw err;
    // Mock mode always leaves a visible preview behind.
    vtoResult = await new MockYouCamProvider().generateApparelTryOn({
      userImageBase64,
      garmentAssetId: reference.item.id,
    });
  }

  const result: OccasionTryOnResult = {
    ...vtoResult,
    garmentItemId: reference.item.id,
    garmentCategory: reference.garmentCategory,
    ...(reference.item.name ? { garmentItemName: reference.item.name } : {}),
  };

  const updated = await storeUpdate(occasionId, {
    tryOnResults: { ...(occasion.tryOnResults ?? {}), [outfitId]: result },
  });
  if (!updated) throw new Error(`Failed to update occasion ${occasionId}`);
  return updated;
}

/**
 * Run YouCam Skin AI on a permitted photo for pre-event cosmetic prep.
 *
 * Kept deliberately separate from wardrobe reasoning: the result never feeds
 * outfit composition, and the photo is not persisted.
 */
export async function runOccasionSkinPrep(
  occasionId: string,
  imageBase64: string,
): Promise<OccasionSession> {
  const occasion = await storeGet(occasionId);
  if (!occasion) throw new Error(`Occasion ${occasionId} not found`);

  let skinPrep;
  try {
    skinPrep = await runSkinAnalysis({ imageBase64 });
  } catch (err) {
    logYouCamFailure("runOccasionSkinPrep", err);
    throw err;
  }

  const updated = await storeUpdate(occasionId, { skinPrep });
  if (!updated) throw new Error(`Failed to update occasion ${occasionId}`);
  return updated;
}
