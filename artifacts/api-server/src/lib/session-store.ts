import fs from "fs/promises";
import path from "path";
import type {
  InterviewContext,
  IntakePayload,
  PreparationPlan,
  RankedOutfit,
  SkinAnalysisResult,
} from "../types/interview";
import type { ApparelTryOnResult } from "./youcam/types";

const BASE_DATA_DIR = path.join(process.cwd(), ".data");

function dataDir(userId: string): string {
  return path.join(BASE_DATA_DIR, userId);
}
function sessionsFile(userId: string): string {
  return path.join(dataDir(userId), "sessions.json");
}
function sessionsTmp(userId: string): string {
  return path.join(dataDir(userId), `sessions.json.${process.pid}.tmp`);
}

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

// Per-user lock queues to prevent concurrent writes to the same user's file
const queues = new Map<string, Promise<unknown>>();
function withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const curr = queues.get(userId) ?? Promise.resolve();
  const run = curr.then(fn, fn);
  queues.set(userId, run.catch(() => {}));
  return run;
}

async function ensureDataDir(userId: string): Promise<void> {
  await fs.mkdir(dataDir(userId), { recursive: true });
}

async function readSessions(userId: string): Promise<Record<string, StoredSession>> {
  try {
    const content = await fs.readFile(sessionsFile(userId), "utf-8");
    return JSON.parse(content) as Record<string, StoredSession>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

async function writeSessions(
  userId: string,
  sessions: Record<string, StoredSession>,
): Promise<void> {
  await ensureDataDir(userId);
  await fs.writeFile(sessionsTmp(userId), JSON.stringify(sessions, null, 2), "utf-8");
  await fs.rename(sessionsTmp(userId), sessionsFile(userId));
}

export async function createSession(
  userId: string,
  intake: IntakePayload,
): Promise<StoredSession> {
  return withLock(userId, async () => {
    const sessions = await readSessions(userId);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session: StoredSession = { id, status: "intake", intake, createdAt: now, updatedAt: now };
    sessions[id] = session;
    await writeSessions(userId, sessions);
    return session;
  });
}

export async function getSession(
  userId: string,
  id: string,
): Promise<StoredSession | null> {
  const sessions = await readSessions(userId);
  if (!Object.hasOwn(sessions, id)) return null;
  return sessions[id]!;
}

export async function updateSession(
  userId: string,
  id: string,
  updates: SessionUpdates | ((curr: StoredSession) => SessionUpdates),
): Promise<StoredSession | null> {
  return withLock(userId, async () => {
    const sessions = await readSessions(userId);
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
    await writeSessions(userId, sessions);
    return updated;
  });
}
