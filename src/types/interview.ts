export type InterviewFormat =
  | "video"
  | "onsite"
  | "recruiter"
  | "hiring-manager"
  | "executive";

export type InterviewStage =
  | "phone-screen"
  | "first-round"
  | "onsite"
  | "final"
  | "other";

export type StylePreference = "classic" | "modern" | "minimal" | "creative";

export type DressCode =
  | "casual"
  | "smart-casual"
  | "business-casual"
  | "business-professional";

export interface InterviewContext {
  inferredIndustry: string;
  dressCode: DressCode;
  /** 0–1 confidence in the inferred context */
  confidence: number;
  recommendedColors: string[];
  avoidPatterns: string[];
  jacketRecommended: boolean;
  /** Guidance notes — not universal rules */
  rationale: string[];
  /** Derived from skin tone when provided */
  flatteringColors?: string[];
  /** -1 to +1 formality adjustment from company culture */
  cultureFormality?: number;
}

export interface SkinObservation {
  id: string;
  label: string;
  severity: "low" | "moderate" | "notable";
  guidance: string;
}

export interface SkinAnalysisResult {
  observations: SkinObservation[];
  preparationSuggestions: string[];
  lightingNotes: string[];
  disclaimer: string;
  isMock: boolean;
}

export interface OutfitTemplate {
  id: string;
  name: string;
  description: string;
  garments: string[];
  estimatedPrice: number;
  /** 1 (most casual) – 10 (most formal) */
  formality: number;
  baseRoleFit: number;
  baseCameraReadiness: number;
  baseVersatility: number;
  colors: string[];
  hasJacket: boolean;
  genderNeutralNote?: string;
  presentation?: "feminine" | "masculine" | "neutral";
}

export interface OutfitScores {
  roleAppropriateness: number;
  interviewFormatSuitability: number;
  budgetFit: number;
  versatility: number;
  cameraReadiness: number;
  overall: number;
}

export type RankedOutfit = OutfitTemplate & {
  scores: OutfitScores;
  explanation: string;
  fitNote?: string;
};

export interface PreparationPlan {
  selectedOutfitId: string;
  whySelected: string;
  estimatedTotalPrice: number;
  alternativeOutfitId: string;
  fiveDayChecklist: string[];
  nightBeforeChecklist: string[];
  oneHourBeforeChecklist: string[];
  lightingAndCameraSuggestions: string[];
  summaryText: string;
}

export interface IntakePayload {
  jobTitle: string;
  companyName: string;
  industry?: string;
  jobDescription: string;
  interviewStage: InterviewStage;
  interviewFormat: InterviewFormat;
  /** ISO date string */
  interviewDate: string;
  budget: number;
  stylePreference: StylePreference;
  candidateName?: string;
  fitSize?: string;
  weightLbs?: number;
  skinTone?: "fair" | "light" | "medium" | "tan" | "deep";
  presentation?: "feminine" | "masculine" | "neutral";
  companyCulture?:
    | "corporate"
    | "startup"
    | "creative"
    | "client-facing"
    | "government";
}
