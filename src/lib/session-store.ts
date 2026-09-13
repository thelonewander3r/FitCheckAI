import type {
  InterviewContext,
  IntakePayload,
  PreparationPlan,
  RankedOutfit,
  SkinAnalysisResult,
} from "@/types/interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";
import { JSON_DOC_KEYS } from "@/lib/storage/keys";
import {
  readJsonDocument,
  withDocumentMutation,
  writeJsonDocument,
} from "@/lib/storage/json-document";

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
  userImageBase64?: string;
  createdAt: string;
  updatedAt: string;
}

type SessionUpdates = Partial<Omit<StoredSession, "id" | "createdAt">>;
type SessionsDoc = Record<string, StoredSession>;

export async function createSession(
  intake: IntakePayload,
): Promise<StoredSession> {
  return withDocumentMutation(async () => {
    const sessions = await readJsonDocument<SessionsDoc>(
      JSON_DOC_KEYS.sessions,
      {},
    );
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session: StoredSession = {
      id,
      status: "intake",
      intake,
      createdAt: now,
      updatedAt: now,
    };
    sessions[id] = session;
    await writeJsonDocument(JSON_DOC_KEYS.sessions, sessions);
    return session;
  });
}

export async function getSession(id: string): Promise<StoredSession | null> {
  const sessions = await readJsonDocument<SessionsDoc>(
    JSON_DOC_KEYS.sessions,
    {},
  );
  if (!Object.hasOwn(sessions, id)) return null;
  return sessions[id]!;
}

export async function updateSession(
  id: string,
  updates: SessionUpdates | ((curr: StoredSession) => SessionUpdates),
): Promise<StoredSession | null> {
  return withDocumentMutation(async () => {
    const sessions = await readJsonDocument<SessionsDoc>(
      JSON_DOC_KEYS.sessions,
      {},
    );
    if (!Object.hasOwn(sessions, id)) return null;
    const existing = sessions[id]!;
    const resolved = typeof updates === "function" ? updates(existing) : updates;
    const updated: StoredSession = {
      ...existing,
      ...resolved,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    sessions[id] = updated;
    await writeJsonDocument(JSON_DOC_KEYS.sessions, sessions);
    return updated;
  });
}
