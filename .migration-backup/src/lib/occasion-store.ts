import fs from "fs/promises";
import path from "path";
import type { OccasionSession } from "@/types/occasion";

const DATA_DIR = path.join(process.cwd(), ".data");
const OCCASIONS_FILE = path.join(DATA_DIR, "occasions.json");
// NOTE: single-process assumption — the lock below is in-process state and
// this fixed tmp path is not safe across multiple server processes.
const OCCASIONS_TMP = path.join(
  DATA_DIR,
  `occasions.json.${process.pid}.tmp`,
);

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readOccasions(): Promise<OccasionSession[]> {
  try {
    const content = await fs.readFile(OCCASIONS_FILE, "utf-8");
    return JSON.parse(content) as OccasionSession[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

async function writeOccasions(occasions: OccasionSession[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(
    OCCASIONS_TMP,
    JSON.stringify(occasions, null, 2),
    "utf-8",
  );
  await fs.rename(OCCASIONS_TMP, OCCASIONS_FILE);
}

export async function listOccasions(): Promise<OccasionSession[]> {
  return readOccasions();
}

export async function createOccasion(
  input: Pick<OccasionSession, "intake"> &
    Partial<
      Pick<
        OccasionSession,
        "venueContext" | "outfits" | "gaps" | "isMockMode"
      >
    >,
): Promise<OccasionSession> {
  return withLock(async () => {
    const occasions = await readOccasions();
    const now = new Date().toISOString();
    const session: OccasionSession = {
      id: crypto.randomUUID(),
      intake: input.intake,
      venueContext: input.venueContext,
      outfits: input.outfits ?? [],
      gaps: input.gaps ?? [],
      isMockMode: input.isMockMode,
      createdAt: now,
      updatedAt: now,
    };
    occasions.push(session);
    await writeOccasions(occasions);
    return session;
  });
}

export async function getOccasion(
  id: string,
): Promise<OccasionSession | null> {
  const occasions = await readOccasions();
  return occasions.find((o) => o.id === id) ?? null;
}

export async function updateOccasion(
  id: string,
  patch: Partial<OccasionSession>,
): Promise<OccasionSession | null> {
  return withLock(async () => {
    const occasions = await readOccasions();
    const index = occasions.findIndex((o) => o.id === id);
    if (index === -1) return null;
    const existing = occasions[index]!;
    const updated: OccasionSession = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    occasions[index] = updated;
    await writeOccasions(occasions);
    return updated;
  });
}
