import {
  createOccasion as storeCreate,
  getOccasion as storeGet,
  listOccasions as storeList,
} from "../occasion-store";
import { composeOutfits } from "../wardrobe/composer";
import { listItems } from "../wardrobe-store";
import { listRecords } from "../worn-store";
import {
  buildStyleProfile,
  preferencesFromProfile,
} from "../services/style-service";
import { formalityLevelToLabel, getVenueProvider } from "../venue";
import type { OccasionIntake, OccasionSession } from "../../types/occasion";

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
  userId: string,
  intake: OccasionIntake,
): Promise<OccasionSession> {
  const venue = await getVenueProvider().lookupVenue({
    venueName: intake.venueName,
    eventType: intake.eventType,
  });

  const items = await listItems(userId);
  let wornRecords: Awaited<ReturnType<typeof listRecords>> = [];
  try {
    wornRecords = await listRecords(userId);
  } catch (err) {
    console.error(
      "[createOccasion] worn-store read failed; continuing without style preferences:",
      err instanceof Error ? err.message : err,
    );
  }

  const profile = buildStyleProfile(wornRecords);
  const preferences = preferencesFromProfile(profile);
  const palette = mergePalette(venue.palette, intake.skinTone);
  const composed = composeOutfits(items, {
    formality: formalityLevelToLabel(venue.formalityLevel),
    palette,
    season: "any",
    presentation: intake.presentation ?? "neutral",
    preferences,
  });

  const cultureHints = [...venue.cultureHints];
  const theme = intake.theme?.trim();
  if (theme) {
    const themeHint = `Theme "${theme}" — match the occasion's stated dress expectations.`;
    if (!cultureHints.includes(themeHint)) cultureHints.push(themeHint);
  }

  const outfits = composed.outfits.map((o) => ({
    ...o,
    items: o.items.map(({ imageBase64: _omit, ...rest }) => {
      void _omit;
      return rest;
    }),
  })) as typeof composed.outfits;

  return storeCreate(userId, {
    intake,
    venueContext: { ...venue, cultureHints },
    outfits,
    gaps: composed.gaps,
    isMockMode: venue.isMock,
  });
}

export async function getOccasion(
  userId: string,
  id: string,
): Promise<OccasionSession | null> {
  return storeGet(userId, id);
}

export async function listOccasions(userId: string): Promise<OccasionSession[]> {
  return storeList(userId);
}
