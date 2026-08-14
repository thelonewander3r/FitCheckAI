import { inferInterviewContext } from "../interview/context-engine";
import { OUTFIT_TEMPLATES } from "../outfits/templates";
import { selectTopOutfits } from "../outfits/ranking";
import { generatePreparationPlan } from "../prep/plan-generator";
import { runApparelVto } from "../youcam/apparel-vto";
import { runSkinAnalysis } from "../youcam/skin-analysis";
import {
  YouCamApiError,
  YouCamConfigurationError,
} from "../youcam/live-provider";
import type { RankedOutfit } from "../../types/interview";
import type { ApparelTryOnResult } from "../youcam/types";
import {
  createSession as storeCreate,
  getSession as storeGet,
  updateSession as storeUpdate,
  type StoredSession,
} from "../session-store";
import type { IntakePayload } from "../../types/interview";

export type { StoredSession };

/** 1×1 transparent PNG — safe placeholder for mock skin/VTO calls */
const PLACEHOLDER_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function isLiveYouCamMode(): boolean {
  return (process.env["YOUCAM_MODE"] ?? "mock").toLowerCase() === "live";
}

function logYouCamFailure(scope: string, err: unknown): void {
  const info: { errorClass: string; status?: number; errorCode?: string } = {
    errorClass: err instanceof Error ? err.name : "UnknownError",
  };
  if (err instanceof YouCamApiError) {
    if (err.status !== undefined) info.status = err.status;
    if (err.errorCode !== undefined) info.errorCode = err.errorCode;
  }
  console.error(`[${scope}] YouCam provider failed.`, info);
}

export async function createSession(
  userId: string,
  intake: IntakePayload,
): Promise<StoredSession> {
  return storeCreate(userId, intake);
}

export async function getSession(
  userId: string,
  id: string,
): Promise<StoredSession | null> {
  return storeGet(userId, id);
}

/**
 * Session shape returned to the client. Strips the raw selfie and rewrites
 * live try-on result URLs to an app-owned proxy path.
 */
export function toPublicSession(
  session: StoredSession,
): Omit<StoredSession, "userImageBase64"> {
  const { userImageBase64: _omit, tryOnResults, ...rest } = session;
  void _omit;

  if (!tryOnResults) return rest;

  const rewritten: Record<string, ApparelTryOnResult> = {};
  for (const [outfitId, result] of Object.entries(tryOnResults)) {
    const url = result.renderedImageUrl ?? "";
    if (result.isMock || url.startsWith("data:")) {
      rewritten[outfitId] = result;
      continue;
    }
    rewritten[outfitId] = {
      ...result,
      renderedImageUrl: `/api/sessions/${session.id}/try-on/${outfitId}/image`,
    };
  }

  return { ...rest, tryOnResults: rewritten };
}

export async function analyzeSession(
  userId: string,
  id: string,
  imageBase64?: string,
): Promise<StoredSession> {
  const session = await storeGet(userId, id);
  if (!session) throw new Error(`Session ${id} not found`);

  await storeUpdate(userId, id, { status: "analyzing" });

  try {
    const { intake } = session;

    const context = inferInterviewContext({
      jobTitle: intake.jobTitle,
      companyName: intake.companyName,
      industry: intake.industry,
      jobDescription: intake.jobDescription,
      interviewFormat: intake.interviewFormat,
      interviewStage: intake.interviewStage,
      skinTone: intake.skinTone,
      companyCulture: intake.companyCulture,
    });

    let skinAnalysis: StoredSession["skinAnalysis"] = undefined;
    try {
      skinAnalysis = await runSkinAnalysis({
        imageBase64: imageBase64 ?? PLACEHOLDER_IMAGE_BASE64,
      });
    } catch (err) {
      logYouCamFailure("analyzeSession:skin", err);
      // Skin analysis is optional — continue without it
    }

    const outfitTemplates = [...OUTFIT_TEMPLATES];
    const outfits: RankedOutfit[] = selectTopOutfits(
      outfitTemplates,
      context,
      intake.budget ?? 500,
      intake.interviewFormat,
    );

    const updated = await storeUpdate(userId, id, {
      context,
      skinAnalysis,
      outfits,
      status: "ready",
      isMockMode: !isLiveYouCamMode(),
      userImageBase64: imageBase64,
    });

    if (!updated) throw new Error(`Failed to update session ${id}`);
    return updated;
  } catch (err) {
    await storeUpdate(userId, id, { status: "failed" }).catch(() => {});
    throw err;
  }
}

export async function tryOnOutfit(
  userId: string,
  id: string,
  outfitId: string,
  garmentImageBase64?: string,
): Promise<StoredSession> {
  const session = await storeGet(userId, id);
  if (!session) throw new Error(`Session ${id} not found`);

  if (!session.outfits?.some((o) => o.id === outfitId)) {
    throw new Error("Invalid outfit");
  }

  const userImage = session.userImageBase64?.length ? session.userImageBase64 : undefined;
  const live = isLiveYouCamMode();

  if (live && !garmentImageBase64?.trim()) {
    throw new YouCamConfigurationError("Live try-on requires a garment reference image.");
  }

  let vtoResult: ApparelTryOnResult;
  try {
    vtoResult = await runApparelVto({
      userImageBase64: userImage,
      garmentAssetId: outfitId,
      ...(garmentImageBase64?.trim() ? { garmentImageBase64: garmentImageBase64.trim() } : {}),
    });
  } catch (err) {
    logYouCamFailure("tryOnOutfit", err);
    if (live) throw err;
    vtoResult = { renderedImageUrl: "", isMock: true, processingTimeMs: 0 };
  }

  const updated = await storeUpdate(userId, id, (curr) => ({
    tryOnResults: { ...(curr.tryOnResults ?? {}), [outfitId]: vtoResult },
  }));

  if (!updated) throw new Error(`Failed to update session ${id}`);
  return updated;
}

export async function selectOutfit(
  userId: string,
  id: string,
  outfitId: string,
): Promise<StoredSession> {
  const session = await storeGet(userId, id);
  if (!session) throw new Error(`Session ${id} not found`);

  if (!session.outfits?.some((o) => o.id === outfitId)) {
    throw new Error("Invalid outfit");
  }

  const updated = await storeUpdate(userId, id, {
    selectedOutfitId: outfitId,
    status: "selecting",
  });
  if (!updated) throw new Error(`Failed to update session ${id}`);
  return updated;
}

export async function generatePlan(
  userId: string,
  id: string,
): Promise<StoredSession> {
  const session = await storeGet(userId, id);
  if (!session) throw new Error(`Session ${id} not found`);

  if (!session.outfits || session.outfits.length < 1) {
    throw new Error("No ranked outfits — run analyze first");
  }

  const outfits = session.outfits as RankedOutfit[];
  const selectedId = session.selectedOutfitId;
  const selected = (selectedId ? outfits.find((o) => o.id === selectedId) : undefined) ?? outfits[0]!;
  const alternative = outfits.find((o) => o.id !== selected.id) ?? outfits[1] ?? selected;

  const plan = generatePreparationPlan({
    selected,
    alternative,
    context: session.context!,
    interviewFormat: session.intake.interviewFormat,
    interviewDate: session.intake.interviewDate,
  });

  const updated = await storeUpdate(userId, id, { plan, status: "complete" });
  if (!updated) throw new Error(`Failed to update session ${id}`);
  return updated;
}
