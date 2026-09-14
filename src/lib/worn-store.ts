import type { WornOutfitRecord } from "@/types/worn";
import { JSON_DOC_KEYS } from "@/lib/storage/keys";
import {
  readJsonDocument,
  withDocumentMutation,
  writeJsonDocument,
} from "@/lib/storage/json-document";

type WornDoc = WornOutfitRecord[];

export async function addRecord(
  record: Omit<WornOutfitRecord, "id" | "createdAt">,
): Promise<WornOutfitRecord> {
  return withDocumentMutation(async () => {
    const records = await readJsonDocument<WornDoc>(JSON_DOC_KEYS.worn, []);
    const created: WornOutfitRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    records.push(created);
    await writeJsonDocument(JSON_DOC_KEYS.worn, records);
    return created;
  });
}

export async function listRecords(): Promise<WornOutfitRecord[]> {
  const records = await readJsonDocument<WornDoc>(JSON_DOC_KEYS.worn, []);
  return [...records].sort((a, b) => {
    const dateCmp = b.wornDate.localeCompare(a.wornDate);
    if (dateCmp !== 0) return dateCmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function deleteRecord(id: string): Promise<boolean> {
  return withDocumentMutation(async () => {
    const records = await readJsonDocument<WornDoc>(JSON_DOC_KEYS.worn, []);
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) return false;
    await writeJsonDocument(JSON_DOC_KEYS.worn, next);
    return true;
  });
}
