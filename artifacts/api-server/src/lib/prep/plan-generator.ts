import type {
  InterviewContext,
  InterviewFormat,
  PreparationPlan,
  RankedOutfit,
} from "../../types/interview";

interface PlanInput {
  selected: RankedOutfit;
  alternative: RankedOutfit;
  context: InterviewContext;
  interviewFormat: InterviewFormat;
  interviewDate: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Checklist builders
// ---------------------------------------------------------------------------

function buildFiveDayChecklist(
  outfit: RankedOutfit,
  daysAway: number,
): string[] {
  const label = daysAway >= 5 ? "5 days" : `${daysAway} day${daysAway !== 1 ? "s" : ""}`;

  return [
    `[Day 1] Confirm you own or can source all garments for "${outfit.name}": ${outfit.garments.join(", ")}.`,
    `[Day 2] Try on the complete outfit in good lighting and check for fit issues, loose buttons, or missing accessories.`,
    `[Day 3] Launder, dry-clean, or steam any items that need it — allow 24 h drying time.`,
    `[Day 4] Press or iron all garments. Polish footwear. Check that all pieces are stain-free.`,
    `[Day 5 / ${label} out] Hang the complete outfit in a visible location so nothing gets forgotten. Confirm shoes, belt/bag, and any accessories.`,
  ];
}

function buildNightBeforeChecklist(outfit: RankedOutfit): string[] {
  return [
    `Set out the full "${outfit.name}" ensemble — every garment, shoes, and accessories — so nothing is rushed in the morning.`,
    "Do a final press or steam if needed.",
    "Check that shoes are clean and polished.",
    "Lay out any grooming items you'll need (lint roller, fabric shaver if applicable).",
    "Confirm your travel plans and the interview location / video link.",
    "Get to bed at a reasonable hour — rest shows.",
  ];
}

function buildOneHourChecklist(
  outfit: RankedOutfit,
  interviewFormat: InterviewFormat,
): string[] {
  const base = [
    `Dress in the "${outfit.name}" outfit — allow yourself unhurried time.`,
    "Do a final mirror check: collar, cuffs, trousers/skirt hem, no visible tags.",
    "Use a lint roller on dark garments.",
    "Ensure grooming is complete (hair, nails, fragrance — subtle if any).",
  ];

  if (interviewFormat === "video") {
    base.push(
      "Open your video platform and check your camera framing — shoulders and head centred, no distracting objects behind you.",
      "Verify your background is clean and neutral.",
      "Test audio and microphone.",
      "Close unnecessary browser tabs and notifications.",
    );
  } else {
    base.push(
      "Leave enough time to arrive 10–15 minutes early.",
      "Bring a copy of your résumé in a clean folder or portfolio.",
      "Silence your phone before entering the building.",
    );
  }

  return base;
}

function buildLightingAndCameraSuggestions(
  interviewFormat: InterviewFormat,
  outfit: RankedOutfit,
): string[] {
  const colorNote =
    outfit.colors.length > 0
      ? `Your outfit includes ${outfit.colors.join(", ")} — solid tones generally read well on camera.`
      : "Solid, muted tones generally read well on camera.";

  if (interviewFormat !== "video") {
    return [
      "This interview is not scheduled as video — keep these tips handy if a virtual round is added.",
      colorNote,
      "If you join a video screen-share later, sit facing a light source and avoid fine patterns that moiré on camera.",
    ];
  }

  return [
    "Position a light source in front of you (facing your face), not behind — back-lighting creates silhouettes.",
    "Natural window light from the side or front is ideal; overcast daylight works well.",
    "Avoid sitting directly under harsh overhead lighting, which can create unflattering shadows.",
    "A ring light or a lamp with a white/warm-white bulb placed at eye level works well if natural light is unavailable.",
    colorNote,
    "Avoid fine stripes, houndstooth, or tiny checks — they can create a moiré shimmer effect on camera.",
    "Set your camera at eye level; looking slightly up into the lens conveys more presence than looking down.",
    "Test your background: a plain wall, bookshelf, or neutral virtual background is professional and non-distracting.",
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generatePreparationPlan(input: PlanInput): PreparationPlan {
  const { selected, alternative, context, interviewFormat, interviewDate } =
    input;

  const daysAway = daysUntil(interviewDate);

  const fiveDayChecklist = buildFiveDayChecklist(selected, daysAway);
  const nightBeforeChecklist = buildNightBeforeChecklist(selected);
  const oneHourBeforeChecklist = buildOneHourChecklist(
    selected,
    interviewFormat,
  );
  const lightingAndCameraSuggestions = buildLightingAndCameraSuggestions(
    interviewFormat,
    selected,
  );

  const whySelected =
    `"${selected.name}" scored ${selected.scores.overall}/100 overall — the strongest match for a ` +
    `${context.dressCode} ${interviewFormat} interview. ` +
    selected.explanation;

  const summaryText =
    `You have ${daysAway} day${daysAway !== 1 ? "s" : ""} until your interview. ` +
    `Your recommended outfit is "${selected.name}" (est. $${selected.estimatedPrice}). ` +
    `If unavailable, "${alternative.name}" (est. $${alternative.estimatedPrice}) is a solid backup. ` +
    (interviewFormat === "video"
      ? "Because this is a video interview, pay special attention to lighting and camera setup. "
      : "") +
    `Follow the preparation checklist above to arrive confident and polished.`;

  return {
    selectedOutfitId: selected.id,
    whySelected,
    estimatedTotalPrice: selected.estimatedPrice,
    alternativeOutfitId: alternative.id,
    fiveDayChecklist,
    nightBeforeChecklist,
    oneHourBeforeChecklist,
    lightingAndCameraSuggestions,
    summaryText,
  };
}
