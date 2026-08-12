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
import type { OccasionIntake, OccasionSession } from "@/types/occasion";

const FLATTERING_COLORS_BY_SKIN_TONE: Record<
  NonNullable<OccasionIntake["skinTone"]>,
  string[]
> = {
  fair: ["navy", "black", "white", "burgundy"],
  light: ["navy", "charcoal", "sage", "cream"],
  medium: ["navy", "olive", "rust", "cream"],
  tan: ["black", "white", "gold", "deep green"],
  deep: ["white", "emerald", "gold", "royal blue"],
};

function mergePalette(
  venuePalette: string[],
  skinTone?: OccasionIntake["skinTone"],
): string[] {
  const merged = [
    ...venuePalette,
    ...(skinTone ? FLATTERING_COLORS_BY_SKIN_TONE[skinTone] : []),
  ].map((c) => c.toLowerCase());
  return [...new Set(merged)];
}

export async function createOccasion(
  intake: OccasionIntake,
): Promise<OccasionSession> {
  const venue = await getVenueProvider().lookupVenue({
    venueName: intake.venueName,
    eventType: intake.eventType,
  });

  const items = await listItems();
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
  const preferences = preferencesFromProfile(profile);
  const palette = mergePalette(venue.palette, intake.skinTone);
  const season = "any";
  const composed = composeOutfits(items, {
    formality: formalityLevelToLabel(venue.formalityLevel),
    palette,
    season,
    presentation: intake.presentation ?? "neutral",
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

  const outfits = composed.outfits.map((o) => ({
    ...o,
    items: o.items.map(({ imageBase64: _omit, ...rest }) => rest),
  })) as typeof composed.outfits;

  return storeCreate({
    intake,
    venueContext: { ...venue, cultureHints },
    outfits,
    gaps: composed.gaps,
    isMockMode: venue.isMock,
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
