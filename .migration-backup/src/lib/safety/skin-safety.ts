import type { SkinAnalysisResult, SkinObservation } from "@/types/interview";

export const COSMETIC_DISCLAIMER =
  "This is cosmetic appearance guidance and not medical advice. Consult a qualified medical professional for skin concerns.";

// ---------------------------------------------------------------------------
// Prohibited terms
// ---------------------------------------------------------------------------

/**
 * Terms that must not appear in any user-facing skin analysis output.
 * Organised into categories for easier auditing.
 */
const PROHIBITED_TERMS: readonly string[] = [
  // Diagnostic / disease language
  "diagnos",
  "disease",
  "disorder",
  "condition",
  "symptom",
  "medical",
  "clinical",
  "treatment",
  "cure",
  "therapy",
  "prescription",
  "medication",
  "dermatitis",
  "rosacea",
  "psoriasis",
  "eczema",
  "acne vulgaris",
  "seborrheic",
  "malignant",
  "benign",
  "lesion",
  "patholog",
  // Attractiveness / hiring language
  "attractive",
  "unattractive",
  "beautiful",
  "ugly",
  "hire",
  "hiring",
  "hired",
  "employable",
  "employed",
  "employer preference",
  "candidate appearance",
  // Demographic inference
  "race",
  "ethnicity",
  "ethnic",
  "skin color",
  "complexion type",
  "fitzpatrick",
  "dark skin",
  "light skin",
  "melanin",
  "albinism",
];

// ---------------------------------------------------------------------------
// Sanitizer
// ---------------------------------------------------------------------------

export interface SanitizeResult {
  ok: boolean;
  text: string;
  rejectedTerms: string[];
}

/**
 * Checks a string for prohibited language.
 * Returns the original text and a list of matched prohibited terms.
 * Does NOT auto-redact — callers decide whether to show or discard the text.
 */
export function sanitizeSkinAnalysisText(text: string): SanitizeResult {
  const lower = text.toLowerCase();
  const rejectedTerms: string[] = [];

  for (const term of PROHIBITED_TERMS) {
    if (lower.includes(term)) {
      rejectedTerms.push(term);
    }
  }

  return {
    ok: rejectedTerms.length === 0,
    text,
    rejectedTerms,
  };
}

// ---------------------------------------------------------------------------
// Observation filter
// ---------------------------------------------------------------------------

function isSafeObservation(obs: SkinObservation): boolean {
  const combined = `${obs.label} ${obs.guidance}`;
  return sanitizeSkinAnalysisText(combined).ok;
}

function isSafeSuggestion(suggestion: string): boolean {
  return sanitizeSkinAnalysisText(suggestion).ok;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Filters a raw SkinAnalysisResult, removing any observations or suggestions
 * that contain prohibited language. Always appends the cosmetic disclaimer.
 */
export function applySkinSafety(
  result: SkinAnalysisResult,
): SkinAnalysisResult {
  const safeObservations = result.observations.filter(isSafeObservation);

  const safePreparationSuggestions =
    result.preparationSuggestions.filter(isSafeSuggestion);

  const safeLightingNotes = result.lightingNotes.filter(isSafeSuggestion);

  return {
    ...result,
    observations: safeObservations,
    preparationSuggestions: safePreparationSuggestions,
    lightingNotes: safeLightingNotes,
    disclaimer: COSMETIC_DISCLAIMER,
  };
}
