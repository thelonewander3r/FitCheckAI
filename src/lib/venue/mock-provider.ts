import type { OccasionType } from "@/types/occasion";
import type {
  DressCodeLabel,
  VenueContext,
  VenueLookupInput,
  VenueProvider,
} from "./types";
import { formalityLevelToLabel } from "./types";

const PALETTE_BY_LEVEL: Record<number, string[]> = {
  0: ["olive", "cream"],
  1: ["navy", "white"],
  2: ["navy", "gray"],
  3: ["navy", "charcoal"],
  4: ["black", "navy"],
};

const EVENT_DEFAULT_LEVEL: Record<OccasionType, number> = {
  interview: 3,
  "client-meeting": 2,
  gala: 4,
  dinner: 1,
  wedding: 4,
  "casual-outing": 0,
  conference: 2,
  date: 1,
  other: 1,
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(name: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(name);
}

interface CuratedRule {
  match: (name: string, eventType: OccasionType) => boolean;
  dressCode: DressCodeLabel;
  formalityLevel: number;
  palette: string[];
  cultureHints: string[];
  confidence: number;
}

const CURATED_RULES: CuratedRule[] = [
  {
    match: (name) =>
      matchesKeyword(name, "rooftop") ||
      matchesKeyword(name, "sky") ||
      matchesKeyword(name, "terrace"),
    dressCode: "smart-casual",
    formalityLevel: 1,
    palette: ["navy", "white", "charcoal"],
    cultureHints: [
      "Rooftop venues trend upscale-casual — tailored but relaxed.",
    ],
    confidence: 0.85,
  },
  {
    match: (name) =>
      matchesKeyword(name, "gallery") ||
      matchesKeyword(name, "museum") ||
      matchesKeyword(name, "exhibit"),
    dressCode: "smart-casual",
    formalityLevel: 1,
    palette: ["black", "white", "emerald"],
    cultureHints: [
      "Arts venues reward a polished, slightly creative look.",
    ],
    confidence: 0.8,
  },
  {
    match: (name) =>
      matchesKeyword(name, "resort") ||
      matchesKeyword(name, "mountain") ||
      matchesKeyword(name, "lake") ||
      matchesKeyword(name, "vineyard"),
    dressCode: "casual",
    formalityLevel: 0,
    palette: ["cream", "olive", "navy"],
    cultureHints: [
      "Outdoor/relaxed venue — prioritize comfort and layers.",
    ],
    confidence: 0.8,
  },
  {
    match: (name, eventType) =>
      eventType === "wedding" || matchesKeyword(name, "wedding"),
    dressCode: "formal",
    formalityLevel: 4,
    palette: ["ivory", "navy", "blush"],
    cultureHints: ["Weddings call for elevated, celebratory dressing."],
    confidence: 0.85,
  },
  {
    match: (name) =>
      matchesKeyword(name, "bank") ||
      matchesKeyword(name, "financial") ||
      matchesKeyword(name, "law") ||
      matchesKeyword(name, "consulting"),
    dressCode: "business-professional",
    formalityLevel: 3,
    palette: ["navy", "charcoal", "white"],
    cultureHints: ["Formal services environments skew traditional."],
    confidence: 0.85,
  },
  {
    match: (name) =>
      matchesKeyword(name, "startup") ||
      matchesKeyword(name, "tech") ||
      matchesKeyword(name, "campus"),
    dressCode: "business-casual",
    formalityLevel: 2,
    palette: ["navy", "gray", "olive"],
    cultureHints: ["Tech companies skew casual — skip the tie."],
    confidence: 0.8,
  },
  {
    match: (name) =>
      matchesKeyword(name, "gala") ||
      matchesKeyword(name, "opera") ||
      matchesKeyword(name, "theater"),
    dressCode: "formal",
    formalityLevel: 4,
    palette: ["black", "navy", "gold"],
    cultureHints: [
      "Evening formal events call for dark, elegant dressing.",
    ],
    confidence: 0.85,
  },
];

export class MockVenueLookupProvider implements VenueProvider {
  async lookupVenue(input: VenueLookupInput): Promise<VenueContext> {
    const name = input.venueName.toLowerCase();

    for (const rule of CURATED_RULES) {
      if (rule.match(name, input.eventType)) {
        const formalityLevel = Math.max(
          rule.formalityLevel,
          EVENT_DEFAULT_LEVEL[input.eventType] ?? 1,
        );
        return {
          dressCode: formalityLevelToLabel(formalityLevel),
          formalityLevel,
          palette: [...rule.palette],
          cultureHints: [...rule.cultureHints],
          confidence: rule.confidence,
          isMock: true,
          source: "mock:curated",
        };
      }
    }

    const formalityLevel = EVENT_DEFAULT_LEVEL[input.eventType] ?? 1;
    return {
      dressCode: formalityLevelToLabel(formalityLevel),
      formalityLevel,
      palette: [...(PALETTE_BY_LEVEL[formalityLevel] ?? PALETTE_BY_LEVEL[1]!)],
      cultureHints: [],
      confidence: 0.5,
      isMock: true,
      source: "mock:event-default",
    };
  }
}
