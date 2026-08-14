import fs from "fs/promises";
import path from "path";
import type { OccasionSession } from "../types/occasion";

const BASE_DATA_DIR = path.join(process.cwd(), ".data");

function dataDir(userId: string): string {
  return path.join(BASE_DATA_DIR, userId);
}
function occasionsFile(userId: string): string {
  return path.join(dataDir(userId), "occasions.json");
}
function occasionsTmp(userId: string): string {
  return path.join(dataDir(userId), `occasions.json.${process.pid}.tmp`);
}

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

async function readOccasions(userId: string): Promise<OccasionSession[]> {
  try {
    const content = await fs.readFile(occasionsFile(userId), "utf-8");
    return JSON.parse(content) as OccasionSession[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeOccasions(userId: string, occasions: OccasionSession[]): Promise<void> {
  await ensureDataDir(userId);
  await fs.writeFile(occasionsTmp(userId), JSON.stringify(occasions, null, 2), "utf-8");
  await fs.rename(occasionsTmp(userId), occasionsFile(userId));
}

export async function listOccasions(userId: string): Promise<OccasionSession[]> {
  return readOccasions(userId);
}

export async function createOccasion(
  userId: string,
  input: Pick<OccasionSession, "intake"> &
    Partial<Pick<OccasionSession, "venueContext" | "outfits" | "gaps" | "isMockMode">>,
): Promise<OccasionSession> {
  return withLock(userId, async () => {
    const occasions = await readOccasions(userId);
    const now = new Date().toISOString();
    const occasion: OccasionSession = {
      id: crypto.randomUUID(),
      intake: input.intake,
      venueContext: input.venueContext,
      outfits: input.outfits ?? [],
      gaps: input.gaps ?? [],
      isMockMode: input.isMockMode,
      createdAt: now,
      updatedAt: now,
    };
    occasions.push(occasion);
    await writeOccasions(userId, occasions);
    return occasion;
  });
}

export async function getOccasion(
  userId: string,
  id: string,
): Promise<OccasionSession | null> {
  const occasions = await readOccasions(userId);
  return occasions.find((o) => o.id === id) ?? null;
}
