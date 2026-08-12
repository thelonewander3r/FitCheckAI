import fs from "fs/promises";
import path from "path";
import type { WardrobeItem } from "@/types/wardrobe";

const DATA_DIR = path.join(process.cwd(), ".data");
const WARDROBE_FILE = path.join(DATA_DIR, "wardrobe.json");
// NOTE: single-process assumption — the lock below is in-process state and
// this fixed tmp path is not safe across multiple server processes.
const WARDROBE_TMP = path.join(
  DATA_DIR,
  `wardrobe.json.${process.pid}.tmp`,
);

export type CreateWardrobeItemInput = Omit<
  WardrobeItem,
  "id" | "createdAt" | "updatedAt"
>;

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readWardrobe(): Promise<WardrobeItem[]> {
  try {
    const content = await fs.readFile(WARDROBE_FILE, "utf-8");
    return JSON.parse(content) as WardrobeItem[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

async function writeWardrobe(items: WardrobeItem[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(WARDROBE_TMP, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(WARDROBE_TMP, WARDROBE_FILE);
}

export async function listItems(): Promise<WardrobeItem[]> {
  return readWardrobe();
}

export async function getItem(id: string): Promise<WardrobeItem | null> {
  const items = await readWardrobe();
  return items.find((item) => item.id === id) ?? null;
}

export async function createItem(
  input: CreateWardrobeItemInput,
): Promise<WardrobeItem> {
  return withLock(async () => {
    const items = await readWardrobe();
    const now = new Date().toISOString();
    const item: WardrobeItem = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    items.push(item);
    await writeWardrobe(items);
    return item;
  });
}

export async function updateItem(
  id: string,
  patch: Partial<WardrobeItem>,
): Promise<WardrobeItem | null> {
  return withLock(async () => {
    const items = await readWardrobe();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const existing = items[index]!;
    const updated: WardrobeItem = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    items[index] = updated;
    await writeWardrobe(items);
    return updated;
  });
}

export async function deleteItem(id: string): Promise<boolean> {
  return withLock(async () => {
    const items = await readWardrobe();
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await writeWardrobe(next);
    return true;
  });
}
