import { inferInterviewContext } from "@/lib/interview/context-engine";
import { OUTFIT_TEMPLATES } from "@/lib/outfits/templates";
import { selectTopOutfits } from "@/lib/outfits/ranking";
import { generatePreparationPlan } from "@/lib/prep/plan-generator";
import { runApparelVto } from "@/lib/youcam/apparel-vto";
import { runSkinAnalysis } from "@/lib/youcam/skin-analysis";
import type { RankedOutfit } from "@/types/interview";
import type { ApparelTryOnResult } from "@/lib/youcam/types";
import {
  createSession as storeCreate,
  getSession as storeGet,
  updateSession as storeUpdate,
  type StoredSession,
} from "@/lib/session-store";
import type { IntakePayload } from "@/types/interview";

export type { StoredSession };

/** 1×1 transparent PNG — safe placeholder for mock skin/VTO calls */
const PLACEHOLDER_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export async function createSession(
  intake: IntakePayload,
): Promise<StoredSession> {
  return storeCreate(intake);
}

export async function getSession(id: string): Promise<StoredSession | null> {
  return storeGet(id);
}

export async function analyzeSession(
  id: string,
  imageBase64?: string,
): Promise<StoredSession> {
  const session = await storeGet(id);
  if (!session) throw new Error(`Session ${id} not found`);

  await storeUpdate(id, { status: "analyzing" });

  try {
    const { intake } = session;

    const context = inferInterviewContext({
      jobTitle: intake.jobTitle,
      companyName: intake.companyName,
      industry: intake.industry,
      jobDescription: intake.jobDescription,
      interviewFormat: intake.interviewFormat,
      interviewStage: intake.interviewStage,
    });

    let skinAnalysis: StoredSession["skinAnalysis"] = undefined;
    try {
      skinAnalysis = await runSkinAnalysis({
        imageBase64: imageBase64 ?? PLACEHOLDER_IMAGE_BASE64,
      });
    } catch (err) {
      console.error(
        "[analyzeSession] Skin analysis failed:",
        err instanceof Error ? err.message : "unknown",
      );
    }

    const outfits = selectTopOutfits(
      OUTFIT_TEMPLATES,
      context,
      intake.budget,
      intake.interviewFormat,
      3,
    );

    const isMock = process.env["YOUCAM_MODE"] !== "live";

    const updated = await storeUpdate(id, {
      status: "ready",
      context,
      skinAnalysis,
      outfits,
      isMockMode: isMock,
    });

    if (!updated) throw new Error(`Failed to update session ${id}`);
    return updated;
  } catch (err) {
    await storeUpdate(id, { status: "failed" });
    throw err;
  }
}

export async function tryOnOutfit(
  id: string,
  outfitId: string,
): Promise<StoredSession> {
  const session = await storeGet(id);
  if (!session) throw new Error(`Session ${id} not found`);

  if (!session.outfits?.some((o) => o.id === outfitId)) {
    throw new Error("Invalid outfit");
  }

  let vtoResult: ApparelTryOnResult;
  try {
    vtoResult = await runApparelVto({
      userImageBase64: PLACEHOLDER_IMAGE_BASE64,
      garmentAssetId: outfitId,
    });
  } catch (err) {
    console.error(
      "[tryOnOutfit] VTO failed:",
      err instanceof Error ? err.message : "unknown",
    );
    vtoResult = { renderedImageUrl: "", isMock: true, processingTimeMs: 0 };
  }

  const updated = await storeUpdate(id, (curr) => ({
    tryOnResults: { ...(curr.tryOnResults ?? {}), [outfitId]: vtoResult },
  }));

  if (!updated) throw new Error(`Failed to update session ${id}`);
  return updated;
}

export async function selectOutfit(
  id: string,
  outfitId: string,
): Promise<StoredSession> {
  const session = await storeGet(id);
  if (!session) throw new Error(`Session ${id} not found`);

  if (!session.outfits?.some((o) => o.id === outfitId)) {
    throw new Error("Invalid outfit");
  }

  const updated = await storeUpdate(id, {
    selectedOutfitId: outfitId,
    status: "selecting",
  });
  if (!updated) throw new Error(`Failed to update session ${id}`);
  return updated;
}

export async function generatePlan(id: string): Promise<StoredSession> {
  const session = await storeGet(id);
  if (!session) throw new Error(`Session ${id} not found`);

  if (!session.outfits || session.outfits.length < 1) {
    throw new Error("No ranked outfits — run analyze first");
  }

  const outfits = session.outfits as RankedOutfit[];
  const selectedId = session.selectedOutfitId;

  const selected =
    (selectedId ? outfits.find((o) => o.id === selectedId) : undefined) ??
    outfits[0]!;
  const alternative =
    outfits.find((o) => o.id !== selected.id) ?? outfits[1] ?? selected;

  const plan = generatePreparationPlan({
    selected,
    alternative,
    context: session.context!,
    interviewFormat: session.intake.interviewFormat,
    interviewDate: session.intake.interviewDate,
  });

  const updated = await storeUpdate(id, { plan, status: "complete" });
  if (!updated) throw new Error(`Failed to update session ${id}`);
  return updated;
}
