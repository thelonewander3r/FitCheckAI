import type { OccasionSession } from "@/types/occasion";
import { JSON_DOC_KEYS } from "@/lib/storage/keys";
import {
  readJsonDocument,
  withDocumentMutation,
  writeJsonDocument,
} from "@/lib/storage/json-document";

type OccasionsDoc = OccasionSession[];

export async function listOccasions(): Promise<OccasionSession[]> {
  return readJsonDocument<OccasionsDoc>(JSON_DOC_KEYS.occasions, []);
}

export async function createOccasion(
  input: Pick<OccasionSession, "intake"> &
    Partial<
      Pick<
        OccasionSession,
        "venueContext" | "outfits" | "gaps" | "isMockMode" | "isDemo"
      >
    >,
): Promise<OccasionSession> {
  return withDocumentMutation(async () => {
    const occasions = await readJsonDocument<OccasionsDoc>(
      JSON_DOC_KEYS.occasions,
      [],
    );
    const now = new Date().toISOString();
    const session: OccasionSession = {
      id: crypto.randomUUID(),
      intake: input.intake,
      venueContext: input.venueContext,
      outfits: input.outfits ?? [],
      gaps: input.gaps ?? [],
      isMockMode: input.isMockMode,
      isDemo: input.isDemo,
      createdAt: now,
      updatedAt: now,
    };
    occasions.push(session);
    await writeJsonDocument(JSON_DOC_KEYS.occasions, occasions);
    return session;
  });
}

export async function getOccasion(
  id: string,
): Promise<OccasionSession | null> {
  const occasions = await readJsonDocument<OccasionsDoc>(
    JSON_DOC_KEYS.occasions,
    [],
  );
  return occasions.find((o) => o.id === id) ?? null;
}

export async function updateOccasion(
  id: string,
  patch: Partial<OccasionSession>,
): Promise<OccasionSession | null> {
  return withDocumentMutation(async () => {
    const occasions = await readJsonDocument<OccasionsDoc>(
      JSON_DOC_KEYS.occasions,
      [],
    );
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
    await writeJsonDocument(JSON_DOC_KEYS.occasions, occasions);
    return updated;
  });
}
