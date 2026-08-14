import type {
  DressCode,
  InterviewContext,
  InterviewFormat,
  InterviewStage,
} from "../../types/interview";

interface ContextInput {
  jobTitle: string;
  companyName?: string;
  industry?: string;
  jobDescription: string;
  interviewFormat: InterviewFormat;
  interviewStage: InterviewStage;
  skinTone?: "fair" | "light" | "medium" | "tan" | "deep";
  companyCulture?:
    | "corporate"
    | "startup"
    | "creative"
    | "client-facing"
    | "government";
}

// Keyword sets for industry inference
const FORMAL_KEYWORDS: readonly string[] = [
  "finance",
  "financial",
  "banking",
  "investment",
  "law",
  "legal",
  "attorney",
  "government",
  "federal",
  "public sector",
  "compliance",
  "audit",
  "accounting",
  "insurance",
  "consulting",
  "management consulting",
];

const SEMIFORMAL_KEYWORDS: readonly string[] = [
  "healthcare",
  "medical",
  "pharma",
  "education",
  "university",
  "nonprofit",
  "marketing",
  "sales",
  "retail",
  "real estate",
];

const CASUAL_KEYWORDS: readonly string[] = [
  "startup",
  "tech",
  "software",
  "saas",
  "app",
  "platform",
  "agency",
  "creative",
  "design",
  "media",
  "advertising",
  "game",
  "gaming",
  "music",
  "entertainment",
];

const FLATTERING_COLORS_BY_SKIN_TONE: Record<
  NonNullable<ContextInput["skinTone"]>,
  string[]
> = {
  fair: ["navy", "black", "white", "burgundy"],
  light: ["navy", "charcoal", "sage", "cream"],
  medium: ["navy", "olive", "rust", "cream"],
  tan: ["black", "white", "gold", "deep green"],
  deep: ["white", "emerald", "gold", "royal blue"],
};

const CULTURE_FORMALITY: Record<
  NonNullable<ContextInput["companyCulture"]>,
  number
> = {
  corporate: 1,
  startup: -1,
  creative: -1,
  "client-facing": 0.5,
  government: 1,
};

type FormalityLevel = "formal" | "semiformal" | "casual";

function detectFormalityFromText(text: string): {
  level: FormalityLevel;
  inferredIndustry: string;
  confidence: number;
} {
  const normalized = text.toLowerCase();

  for (const kw of FORMAL_KEYWORDS) {
    if (normalized.includes(kw)) {
      return {
        level: "formal",
        inferredIndustry: kw.charAt(0).toUpperCase() + kw.slice(1),
        confidence: 0.8,
      };
    }
  }

  for (const kw of SEMIFORMAL_KEYWORDS) {
    if (normalized.includes(kw)) {
      return {
        level: "semiformal",
        inferredIndustry: kw.charAt(0).toUpperCase() + kw.slice(1),
        confidence: 0.7,
      };
    }
  }

  for (const kw of CASUAL_KEYWORDS) {
    if (normalized.includes(kw)) {
      return {
        level: "casual",
        inferredIndustry: kw.charAt(0).toUpperCase() + kw.slice(1),
        confidence: 0.65,
      };
    }
  }

  return { level: "semiformal", inferredIndustry: "General", confidence: 0.4 };
}

function resolveDressCode(
  base: FormalityLevel,
  format: InterviewFormat,
  stage: InterviewStage,
  cultureFormality = 0,
): DressCode {
  // Start with base formality level value (0=casual, 1=semiformal, 2=formal)
  let level = base === "formal" ? 2 : base === "semiformal" ? 1 : 0;

  // Executive format → always bump up
  if (format === "executive") level = Math.min(level + 1, 2);

  // Onsite is at least as formal as video
  if (format === "onsite" && level < 1) level = 1;

  // Final round or executive stage → bump up
  if (stage === "final") level = Math.min(level + 1, 2);

  // Phone screen / recruiter → relax slightly unless already formal
  if ((format === "recruiter" || stage === "phone-screen") && level === 2)
    level = 1;

  // The numeric formality index is adjusted by cultureFormality before the
  // dress-code label is chosen.
  level = Math.max(0, Math.min(2, Math.round(level + cultureFormality)));

  if (level >= 2) return "business-professional";
  if (level >= 1) return "business-casual";
  return "smart-casual";
}

const NEUTRAL_RECOMMENDED = ["navy", "charcoal", "white", "light blue", "gray"];
const FORMAL_RECOMMENDED = [
  "navy",
  "charcoal",
  "black",
  "white",
  "burgundy",
  "deep blue",
];
const CASUAL_RECOMMENDED = [
  "navy",
  "gray",
  "white",
  "earth tones",
  "muted greens",
];

const VIDEO_AVOID_PATTERNS = [
  "fine stripes",
  "houndstooth",
  "tiny checks",
  "moiré",
  "busy prints",
];
const GENERAL_AVOID_PATTERNS = ["loud prints", "neon", "overly busy patterns"];

export function inferInterviewContext(input: ContextInput): InterviewContext {
  const searchText = [
    input.jobTitle,
    input.companyName ?? "",
    input.industry ?? "",
    input.jobDescription,
  ]
    .join(" ")
    .toLowerCase();

  const { level, inferredIndustry, confidence } =
    detectFormalityFromText(searchText);

  const cultureFormality = input.companyCulture
    ? CULTURE_FORMALITY[input.companyCulture]
    : undefined;

  const dressCode = resolveDressCode(
    level,
    input.interviewFormat,
    input.interviewStage,
    cultureFormality ?? 0,
  );

  const recommendedColors =
    level === "formal"
      ? FORMAL_RECOMMENDED
      : level === "casual"
        ? CASUAL_RECOMMENDED
        : NEUTRAL_RECOMMENDED;

  const avoidPatterns =
    input.interviewFormat === "video"
      ? [...VIDEO_AVOID_PATTERNS, ...GENERAL_AVOID_PATTERNS]
      : GENERAL_AVOID_PATTERNS;

  const jacketRecommended =
    dressCode === "business-professional" ||
    dressCode === "business-casual" ||
    input.interviewFormat === "executive" ||
    input.interviewStage === "final";

  const rationaleFragments: string[] = [];

  if (level === "formal") {
    rationaleFragments.push(
      `${inferredIndustry} roles often lean toward polished, professional attire.`,
    );
  } else if (level === "casual") {
    rationaleFragments.push(
      `${inferredIndustry} environments tend to be less formal — business-casual often fits well.`,
    );
  } else {
    rationaleFragments.push(
      `Context suggests a broadly professional standard is appropriate.`,
    );
  }

  if (input.interviewFormat === "video") {
    rationaleFragments.push(
      "Video interviews benefit from solid colors and careful attention to contrast against your background.",
    );
  }
  if (input.interviewFormat === "executive") {
    rationaleFragments.push(
      "Executive-level interviewers typically expect well-tailored, conservative attire.",
    );
  }
  if (input.interviewStage === "final") {
    rationaleFragments.push(
      "Final-round interviews often call for a step up in formality.",
    );
  }

  rationaleFragments.push(
    "These are guidance notes based on common patterns — your specific company culture may differ.",
  );

  const flatteringColors = input.skinTone
    ? FLATTERING_COLORS_BY_SKIN_TONE[input.skinTone]
    : undefined;

  return {
    inferredIndustry,
    dressCode,
    confidence,
    recommendedColors,
    avoidPatterns,
    jacketRecommended,
    rationale: rationaleFragments,
    ...(flatteringColors ? { flatteringColors } : {}),
    ...(cultureFormality !== undefined ? { cultureFormality } : {}),
  };
}
