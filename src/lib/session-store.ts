import fs from "fs/promises";
import path from "path";
import type {
  InterviewContext,
  IntakePayload,
  PreparationPlan,
  RankedOutfit,
  SkinAnalysisResult,
} from "@/types/interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
// NOTE: single-process assumption — the lock below is in-process state and
// this fixed tmp path is not safe across multiple server processes.
const SESSIONS_TMP = path.join(
  DATA_DIR,
  `sessions.json.${process.pid}.tmp`,
);

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

type SessionUpdates = Partial<Omit<StoredSession, "id" | "createdAt">>;

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readSessions(): Promise<Record<string, StoredSession>> {
  try {
    const content = await fs.readFile(SESSIONS_FILE, "utf-8");
    return JSON.parse(content) as Record<string, StoredSession>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

async function writeSessions(
  sessions: Record<string, StoredSession>,
): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(
    SESSIONS_TMP,
    JSON.stringify(sessions, null, 2),
    "utf-8",
  );
  await fs.rename(SESSIONS_TMP, SESSIONS_FILE);
}

export async function createSession(
  intake: IntakePayload,
): Promise<StoredSession> {
  return withLock(async () => {
    const sessions = await readSessions();
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
    await writeSessions(sessions);
    return session;
  });
}

export async function getSession(id: string): Promise<StoredSession | null> {
  const sessions = await readSessions();
  if (!Object.hasOwn(sessions, id)) return null;
  return sessions[id]!;
}

export async function updateSession(
  id: string,
  updates: SessionUpdates | ((curr: StoredSession) => SessionUpdates),
): Promise<StoredSession | null> {
  return withLock(async () => {
    const sessions = await readSessions();
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
    await writeSessions(sessions);
    return updated;
  });
}
