import type {
  InterviewContext,
  IntakePayload,
  PreparationPlan,
  RankedOutfit,
  SkinAnalysisResult,
} from "./interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";

export type SessionStatus =
  | "intake"
  | "analyzing"
  | "ready"
  | "selecting"
  | "complete"
  | "failed";

export interface StoredSession {
  id: string;
  status: SessionStatus;
  intake: IntakePayload;
  context?: InterviewContext;
  skinAnalysis?: SkinAnalysisResult;
  outfits?: RankedOutfit[];
  selectedOutfitId?: string;
  tryOnResults?: Record<string, ApparelTryOnResult>;
  plan?: PreparationPlan;
  isMockMode?: boolean;
  createdAt: string;
  updatedAt: string;
}
