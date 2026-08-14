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
import type { OccasionIntake, OccasionSession } from "@/types/occasion";

export async function createOccasion(
  intake: OccasionIntake,
): Promise<OccasionSession> {
  const venue = await getVenueProvider().lookupVenue({
    venueName: intake.venueName,
    eventType: intake.eventType,
    location: intake.location,
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

  const outfits = composed.outfits.map((o) => ({
    ...o,
    items: o.items.map(({ imageBase64: _omit, ...rest }) => {
      void _omit;
      return rest;
    }),
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
