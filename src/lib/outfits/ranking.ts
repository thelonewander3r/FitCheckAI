import type {
  InterviewContext,
  InterviewFormat,
  OutfitScores,
  OutfitTemplate,
  RankedOutfit,
} from "@/types/interview";

export interface PersonProfile {
  fitSize?: string;
  weightLbs?: number;
  skinTone?: "fair" | "light" | "medium" | "tan" | "deep";
  presentation?: "feminine" | "masculine" | "neutral";
}

// ---------------------------------------------------------------------------
// Budget fit
// ---------------------------------------------------------------------------

/**
 * Returns 0–100. Full marks when price ≤ budget.
 * Decays linearly: 0 at 2× budget.
 */
export function scoreBudgetFit(price: number, budget: number): number {
  if (budget <= 0) return 0;
  if (price <= budget) return 100;
  const overRatio = (price - budget) / budget; // 0→1 as price goes from budget → 2×budget
  return Math.max(0, Math.round(100 * (1 - overRatio)));
}

// ---------------------------------------------------------------------------
// Role appropriateness
// ---------------------------------------------------------------------------

function scoreRoleAppropriateness(
  outfit: OutfitTemplate,
  context: InterviewContext,
): number {
  const { dressCode } = context;

  const dresscodeFormality: Record<typeof dressCode, number> = {
    casual: 2,
    "smart-casual": 4,
    "business-casual": 6,
    "business-professional": 8,
  };

  const targetFormality = dresscodeFormality[dressCode];
  const diff = Math.abs(outfit.formality - targetFormality);

  // Perfect match = 100; each point of difference costs 12 points
  const base = Math.max(0, 100 - diff * 12);

  // Blend with the template's own baseRoleFit (40/60)
  return Math.round(base * 0.6 + outfit.baseRoleFit * 0.4);
}

// ---------------------------------------------------------------------------
// Interview format suitability
// ---------------------------------------------------------------------------

function scoreFormatSuitability(
  outfit: OutfitTemplate,
  interviewFormat: InterviewFormat,
): number {
  let base = outfit.baseCameraReadiness;

  if (interviewFormat === "video") {
    // Solid colors score better; penalise low camera-readiness templates less
    // (already baked into baseCameraReadiness)
    base = outfit.baseCameraReadiness;
  } else if (interviewFormat === "onsite") {
    // Full-outfit presence matters; jackets help
    base = outfit.baseRoleFit * 0.5 + outfit.baseCameraReadiness * 0.5;
    if (outfit.hasJacket) base = Math.min(100, base + 5);
  } else if (interviewFormat === "executive") {
    // High formality required; jacket is essentially mandatory
    base = outfit.formality * 10;
    if (!outfit.hasJacket) base = Math.max(0, base - 15);
  } else {
    // recruiter / hiring-manager — moderate bar
    base = (outfit.baseRoleFit + outfit.baseCameraReadiness) / 2;
  }

  return Math.min(100, Math.max(0, Math.round(base)));
}

// ---------------------------------------------------------------------------
// Person-profile bonuses (additive to overall)
// ---------------------------------------------------------------------------

function scorePresentationBonus(
  outfit: OutfitTemplate,
  presentation?: PersonProfile["presentation"],
): number {
  if (!presentation) return 0;
  if (outfit.presentation === presentation) return 3;
  if (outfit.presentation === "neutral") return 1;
  return 0;
}

function scoreColorBonus(
  outfit: OutfitTemplate,
  context: InterviewContext,
): number {
  if (!context.flatteringColors?.length) return 0;
  const flattering = new Set(
    context.flatteringColors.map((c) => c.toLowerCase()),
  );
  let hits = 0;
  for (const color of outfit.colors) {
    if (flattering.has(color.toLowerCase())) hits += 1;
  }
  return Math.min(4, hits * 2);
}

function buildFitNote(person?: PersonProfile): string | undefined {
  if (!person?.fitSize && person?.weightLbs == null) return undefined;
  const sizeLabel =
    person.fitSize ??
    (person.weightLbs != null ? `${person.weightLbs} lbs` : undefined);
  if (!sizeLabel) return undefined;
  return `Tailoring note: confirm jacket shoulders for ${sizeLabel}.`;
}

// ---------------------------------------------------------------------------
// Overall score
// ---------------------------------------------------------------------------

function computeOverall(scores: Omit<OutfitScores, "overall">): number {
  return Math.round(
    scores.roleAppropriateness * 0.35 +
      scores.interviewFormatSuitability * 0.2 +
      scores.budgetFit * 0.2 +
      scores.versatility * 0.15 +
      scores.cameraReadiness * 0.1,
  );
}

// ---------------------------------------------------------------------------
// Explanation builder
// ---------------------------------------------------------------------------

function buildExplanation(
  outfit: OutfitTemplate,
  scores: OutfitScores,
  context: InterviewContext,
  interviewFormat: InterviewFormat,
  budget?: number,
): string {
  const parts: string[] = [];

  parts.push(
    `Role fit score of ${scores.roleAppropriateness}/100 reflects a ${context.dressCode} expectation.`,
  );

  if (interviewFormat === "video") {
    parts.push(
      `The solid colors in this outfit perform well on camera (${scores.cameraReadiness}/100 camera readiness).`,
    );
  }

  if (outfit.hasJacket && context.jacketRecommended) {
    parts.push(`A jacket is recommended for this context — this outfit includes one.`);
  }

  if (budget !== undefined) {
    if (scores.budgetFit < 80) {
      parts.push(
        `This outfit is slightly above your stated budget (budget fit: ${scores.budgetFit}/100).`,
      );
    } else {
      parts.push(`This outfit fits comfortably within your budget.`);
    }
  }

  parts.push(
    `Versatility score of ${scores.versatility}/100 — could be worn across multiple professional settings.`,
  );

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function rankOutfits(
  templates: OutfitTemplate[],
  context: InterviewContext,
  budget: number | undefined,
  interviewFormat: InterviewFormat,
  person?: PersonProfile,
): RankedOutfit[] {
  const fitNote = buildFitNote(person);

  return templates
    .map((outfit): RankedOutfit => {
      const roleAppropriateness = scoreRoleAppropriateness(outfit, context);
      const interviewFormatSuitability = scoreFormatSuitability(
        outfit,
        interviewFormat,
      );
      const budgetFit =
        budget === undefined ? 100 : scoreBudgetFit(outfit.estimatedPrice, budget);
      const versatility = Math.round(outfit.baseVersatility);
      const cameraReadiness = Math.round(outfit.baseCameraReadiness);

      const partial = {
        roleAppropriateness,
        interviewFormatSuitability,
        budgetFit,
        versatility,
        cameraReadiness,
      };

      const presentationBonus = scorePresentationBonus(
        outfit,
        person?.presentation,
      );
      const colorBonus = scoreColorBonus(outfit, context);
      const overall = Math.min(
        100,
        Math.max(0, computeOverall(partial) + presentationBonus + colorBonus),
      );
      const scores: OutfitScores = { ...partial, overall };

      return {
        ...outfit,
        scores,
        explanation: buildExplanation(
          outfit,
          scores,
          context,
          interviewFormat,
          budget,
        ),
        ...(fitNote ? { fitNote } : {}),
      };
    })
    .sort((a, b) => b.scores.overall - a.scores.overall);
}

export function selectTopOutfits(
  templates: OutfitTemplate[],
  context: InterviewContext,
  budget: number | undefined,
  interviewFormat: InterviewFormat,
  count = 3,
  person?: PersonProfile,
): RankedOutfit[] {
  return rankOutfits(templates, context, budget, interviewFormat, person).slice(
    0,
    count,
  );
}
