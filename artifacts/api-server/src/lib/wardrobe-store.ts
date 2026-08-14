import fs from "fs/promises";
import path from "path";
import type { WardrobeItem } from "../types/wardrobe";

const BASE_DATA_DIR = path.join(process.cwd(), ".data");

function dataDir(userId: string): string {
  return path.join(BASE_DATA_DIR, userId);
}
function wardrobeFile(userId: string): string {
  return path.join(dataDir(userId), "wardrobe.json");
}
function wardrobeTmp(userId: string): string {
  return path.join(dataDir(userId), `wardrobe.json.${process.pid}.tmp`);
}

export type CreateWardrobeItemInput = Omit<WardrobeItem, "id" | "createdAt" | "updatedAt">;

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

async function readWardrobe(userId: string): Promise<WardrobeItem[]> {
  try {
    const content = await fs.readFile(wardrobeFile(userId), "utf-8");
    return JSON.parse(content) as WardrobeItem[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeWardrobe(userId: string, items: WardrobeItem[]): Promise<void> {
  await ensureDataDir(userId);
  await fs.writeFile(wardrobeTmp(userId), JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(wardrobeTmp(userId), wardrobeFile(userId));
}

export async function listItems(userId: string): Promise<WardrobeItem[]> {
  return readWardrobe(userId);
}

export async function getItem(userId: string, id: string): Promise<WardrobeItem | null> {
  const items = await readWardrobe(userId);
  return items.find((item) => item.id === id) ?? null;
}

export async function createItem(
  userId: string,
  input: CreateWardrobeItemInput,
): Promise<WardrobeItem> {
  return withLock(userId, async () => {
    const items = await readWardrobe(userId);
    const now = new Date().toISOString();
    const item: WardrobeItem = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    items.push(item);
    await writeWardrobe(userId, items);
    return item;
  });
}

export async function updateItem(
  userId: string,
  id: string,
  patch: Partial<WardrobeItem>,
): Promise<WardrobeItem | null> {
  return withLock(userId, async () => {
    const items = await readWardrobe(userId);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const existing = items[index]!;
    const updated: WardrobeItem = {
      ...existing, ...patch, id: existing.id, createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    items[index] = updated;
    await writeWardrobe(userId, items);
    return updated;
  });
}

export async function deleteItem(userId: string, id: string): Promise<boolean> {
  return withLock(userId, async () => {
    const items = await readWardrobe(userId);
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await writeWardrobe(userId, next);
    return true;
  });
}
