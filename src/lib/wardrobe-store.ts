import type { WardrobeItem } from "@/types/wardrobe";
import { JSON_DOC_KEYS } from "@/lib/storage/keys";
import {
  readJsonDocument,
  withDocumentMutation,
  writeJsonDocument,
} from "@/lib/storage/json-document";

export type CreateWardrobeItemInput = Omit<
  WardrobeItem,
  "id" | "createdAt" | "updatedAt"
>;

type WardrobeDoc = WardrobeItem[];

export async function listItems(): Promise<WardrobeItem[]> {
  return readJsonDocument<WardrobeDoc>(JSON_DOC_KEYS.wardrobe, []);
}

export async function getItem(id: string): Promise<WardrobeItem | null> {
  const items = await readJsonDocument<WardrobeDoc>(JSON_DOC_KEYS.wardrobe, []);
  return items.find((item) => item.id === id) ?? null;
}

export async function createItem(
  input: CreateWardrobeItemInput,
): Promise<WardrobeItem> {
  return withDocumentMutation(async () => {
    const items = await readJsonDocument<WardrobeDoc>(JSON_DOC_KEYS.wardrobe, []);
    const now = new Date().toISOString();
    const item: WardrobeItem = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    items.push(item);
    await writeJsonDocument(JSON_DOC_KEYS.wardrobe, items);
    return item;
  });
}

export async function updateItem(
  id: string,
  patch: Partial<WardrobeItem>,
): Promise<WardrobeItem | null> {
  return withDocumentMutation(async () => {
    const items = await readJsonDocument<WardrobeDoc>(JSON_DOC_KEYS.wardrobe, []);
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
    await writeJsonDocument(JSON_DOC_KEYS.wardrobe, items);
    return updated;
  });
}

export async function deleteItem(id: string): Promise<boolean> {
  return withDocumentMutation(async () => {
    const items = await readJsonDocument<WardrobeDoc>(JSON_DOC_KEYS.wardrobe, []);
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await writeJsonDocument(JSON_DOC_KEYS.wardrobe, next);
    return true;
  });
}
