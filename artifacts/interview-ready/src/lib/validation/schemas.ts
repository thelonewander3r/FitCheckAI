import { z } from "zod";
import type {
  InterviewFormat,
  InterviewStage,
  StylePreference,
} from "@/types/interview";

const INTERVIEW_FORMATS: [InterviewFormat, ...InterviewFormat[]] = [
  "video",
  "onsite",
  "recruiter",
  "hiring-manager",
  "executive",
];

const INTERVIEW_STAGES: [InterviewStage, ...InterviewStage[]] = [
  "phone-screen",
  "first-round",
  "onsite",
  "final",
  "other",
];

const STYLE_PREFERENCES: [StylePreference, ...StylePreference[]] = [
  "classic",
  "modern",
  "minimal",
  "creative",
];

export const IntakeSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  jobDescription: z
    .string()
    .min(20, "Job description must be at least 20 characters"),
  interviewStage: z.enum(INTERVIEW_STAGES),
  interviewFormat: z.enum(INTERVIEW_FORMATS),
  /** ISO 8601 date or datetime string */
  interviewDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}/,
      "interviewDate must be an ISO date string (YYYY-MM-DD…)",
    ),
  budget: z.number().positive("Budget must be a positive number"),
  stylePreference: z.enum(STYLE_PREFERENCES),
  candidateName: z.string().optional(),
  fitSize: z.string().max(20).optional(),
  weightLbs: z.number().positive().max(1000).optional(),
  skinTone: z.enum(["fair", "light", "medium", "tan", "deep"]).optional(),
  presentation: z.enum(["feminine", "masculine", "neutral"]).optional(),
  companyCulture: z
    .enum(["corporate", "startup", "creative", "client-facing", "government"])
    .optional(),
});

export type IntakeInput = z.input<typeof IntakeSchema>;
export type IntakeOutput = z.output<typeof IntakeSchema>;
