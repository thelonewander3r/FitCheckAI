export interface EventDetailAssessment {
  needsFollowUp: boolean;
  questions: string[];
}

const PLACE_OR_HOST_MARKER =
  /\b(at|in|near|restaurant|venue|company|office|hq|headquarters|hotel|resort|pavilion|museum|gallery|campus|downtown|city)\b/i;
const DRESS_OR_SETTING_MARKER =
  /\b(black[- ]tie|formal|cocktail|business|casual|garden|rooftop|beach|outdoor|indoor|dress code|dressy)\b/i;

/**
 * Decides whether a short event request has enough context to research and
 * compose an outfit. This is intentionally conservative and deterministic;
 * a future research/AI layer can replace it without changing the UI contract.
 */
export function assessEventDetail(text: string): EventDetailAssessment {
  const normalized = text.trim();
  const questions: string[] = [];

  if (!PLACE_OR_HOST_MARKER.test(normalized)) {
    questions.push("Where is it happening?");
  }
  if (!DRESS_OR_SETTING_MARKER.test(normalized)) {
    questions.push("Is there a dress code or a particular vibe?");
  }

  return {
    needsFollowUp:
      normalized.split(/\s+/).filter(Boolean).length < 3 ||
      questions.length === 2,
    questions,
  };
}
