import type { OccasionType } from "@/types/occasion";

interface OccasionRule {
  type: OccasionType;
  keywords: string[];
}

const RULES: OccasionRule[] = [
  {
    type: "interview",
    keywords: ["interview", "job interview", "screening"],
  },
  {
    type: "wedding",
    keywords: ["wedding", "reception", "bridesmaid", "groomsman"],
  },
  {
    type: "gala",
    keywords: ["gala", "black tie", "black-tie", "opera", "theater", "theatre"],
  },
  {
    type: "date",
    keywords: ["date", "anniversary"],
  },
  {
    type: "client-meeting",
    keywords: ["client", "board meeting", "consulting", "law firm", "bank"],
  },
  {
    type: "conference",
    keywords: ["conference", "convention", "summit", "trade show"],
  },
  {
    type: "casual-outing",
    keywords: [
      "picnic",
      "park",
      "hike",
      "hiking",
      "beach",
      "errand",
      "brunch",
      "casual outing",
    ],
  },
  {
    type: "dinner",
    keywords: ["dinner", "restaurant", "rooftop", "bar", "celebration"],
  },
];

/**
 * Infers a broad occasion category from plain-language situation text.
 * This is intentionally conservative: the wardrobe context and venue rules
 * do the detailed recommendation work after this first pass.
 */
export function inferOccasionType(text: string): OccasionType {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return "dinner";

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.type;
    }
  }

  return "dinner";
}
