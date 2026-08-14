import fs from "fs/promises";
import path from "path";
import type { WornOutfitRecord } from "@/types/worn";

const DATA_DIR = path.join(process.cwd(), ".data");
const WORN_FILE = path.join(DATA_DIR, "worn.json");
// NOTE: single-process assumption — the lock below is in-process state and
// this fixed tmp path is not safe across multiple server processes.
const WORN_TMP = path.join(DATA_DIR, `worn.json.${process.pid}.tmp`);

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readWorn(): Promise<WornOutfitRecord[]> {
  try {
    const content = await fs.readFile(WORN_FILE, "utf-8");
    return JSON.parse(content) as WornOutfitRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

async function writeWorn(records: WornOutfitRecord[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(WORN_TMP, JSON.stringify(records, null, 2), "utf-8");
  await fs.rename(WORN_TMP, WORN_FILE);
}

export async function addRecord(
  record: Omit<WornOutfitRecord, "id" | "createdAt">,
): Promise<WornOutfitRecord> {
  return withLock(async () => {
    const records = await readWorn();
    const created: WornOutfitRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    records.push(created);
    await writeWorn(records);
    return created;
  });
}

export async function listRecords(): Promise<WornOutfitRecord[]> {
  const records = await readWorn();
  return [...records].sort((a, b) => {
    const dateCmp = b.wornDate.localeCompare(a.wornDate);
    if (dateCmp !== 0) return dateCmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function deleteRecord(id: string): Promise<boolean> {
  return withLock(async () => {
    const records = await readWorn();
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) return false;
    await writeWorn(next);
    return true;
  });
}
