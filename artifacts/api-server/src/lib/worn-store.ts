import fs from "fs/promises";
import path from "path";
import type { WornOutfitRecord } from "../types/worn";

const BASE_DATA_DIR = path.join(process.cwd(), ".data");

function dataDir(userId: string): string {
  return path.join(BASE_DATA_DIR, userId);
}
function wornFile(userId: string): string {
  return path.join(dataDir(userId), "worn.json");
}
function wornTmp(userId: string): string {
  return path.join(dataDir(userId), `worn.json.${process.pid}.tmp`);
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

async function readWorn(userId: string): Promise<WornOutfitRecord[]> {
  try {
    const content = await fs.readFile(wornFile(userId), "utf-8");
    return JSON.parse(content) as WornOutfitRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeWorn(userId: string, records: WornOutfitRecord[]): Promise<void> {
  await ensureDataDir(userId);
  await fs.writeFile(wornTmp(userId), JSON.stringify(records, null, 2), "utf-8");
  await fs.rename(wornTmp(userId), wornFile(userId));
}

export async function addRecord(
  userId: string,
  record: Omit<WornOutfitRecord, "id" | "createdAt">,
): Promise<WornOutfitRecord> {
  return withLock(userId, async () => {
    const records = await readWorn(userId);
    const created: WornOutfitRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    records.push(created);
    await writeWorn(userId, records);
    return created;
  });
}

export async function listRecords(userId: string): Promise<WornOutfitRecord[]> {
  const records = await readWorn(userId);
  return [...records].sort((a, b) => {
    const dateCmp = b.wornDate.localeCompare(a.wornDate);
    if (dateCmp !== 0) return dateCmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function deleteRecord(userId: string, id: string): Promise<boolean> {
  return withLock(userId, async () => {
    const records = await readWorn(userId);
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) return false;
    await writeWorn(userId, next);
    return true;
  });
}
