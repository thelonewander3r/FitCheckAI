import { inferInterviewContext } from "@/lib/interview/context-engine";
import { OUTFIT_TEMPLATES } from "@/lib/outfits/templates";
import { selectTopOutfits } from "@/lib/outfits/ranking";
import { generatePreparationPlan } from "@/lib/prep/plan-generator";
import { runApparelVto } from "@/lib/youcam/apparel-vto";
import { MockYouCamProvider } from "@/lib/youcam/mock-provider";
import { runSkinAnalysis } from "@/lib/youcam/skin-analysis";
import {
  YouCamApiError,
  YouCamConfigurationError,
} from "@/lib/youcam/live-provider";
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

function isLiveYouCamMode(): boolean {
  return (process.env["YOUCAM_MODE"] ?? "mock").toLowerCase() === "live";
}

/**
 * Log only a fixed message plus safe error class/status/errorCode.
 * Never logs provider messages, URLs, IDs, or credentials.
 */
function logYouCamFailure(scope: string, err: unknown): void {
  const info: {
    errorClass: string;
    status?: number;
    errorCode?: string;
  } = {
    errorClass: err instanceof Error ? err.name : "UnknownError",
  };
  if (err instanceof YouCamApiError) {
    if (err.status !== undefined) info.status = err.status;
    if (err.errorCode !== undefined) info.errorCode = err.errorCode;
  } else if (err instanceof YouCamConfigurationError) {
    info.errorClass = err.name;
  }
  console.error(`[${scope}] YouCam provider failed.`, info);
}

export async function createSession(
  intake: IntakePayload,
): Promise<StoredSession> {
  return storeCreate(intake);
}

export async function getSession(id: string): Promise<StoredSession | null> {
  return storeGet(id);
}

/**
 * Session shape returned to the client. Strips the raw selfie and rewrites
 * live try-on result URLs to an app-owned proxy path (never exposes signed YCE URLs).
 */
export function toPublicSession(
  session: StoredSession,
): Omit<StoredSession, "userImageBase64"> {
  const { userImageBase64: _omit, tryOnResults, ...rest } = session;
  void _omit;

  if (!tryOnResults) {
    return rest;
  }

  const rewritten: Record<string, ApparelTryOnResult> = {};
  for (const [outfitId, result] of Object.entries(tryOnResults)) {
    const url = result.renderedImageUrl ?? "";
    if (result.isMock || url.startsWith("data:")) {
      rewritten[outfitId] = result;
      continue;
    }
    // Live https (or any non-mock) result → app-owned relative proxy
    rewritten[outfitId] = {
      ...result,
      renderedImageUrl: `/api/sessions/${session.id}/try-on/${outfitId}/image`,
    };
  }

  return { ...rest, tryOnResults: rewritten };
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
      skinTone: intake.skinTone,
      companyCulture: intake.companyCulture,
    });

    let skinAnalysis: StoredSession["skinAnalysis"] = undefined;
    try {
      skinAnalysis = await runSkinAnalysis({
        imageBase64: imageBase64 ?? PLACEHOLDER_IMAGE_BASE64,
      });
    } catch (err) {
      logYouCamFailure("analyzeSession", err);
      if (isLiveYouCamMode()) {
        throw err;
      }
      // Mock mode: fail soft and continue to a ready session.
    }

    const outfits = selectTopOutfits(
      OUTFIT_TEMPLATES,
      context,
      intake.budget,
      intake.interviewFormat,
      3,
      {
        fitSize: intake.fitSize,
        weightLbs: intake.weightLbs,
        skinTone: intake.skinTone,
        presentation: intake.presentation,
      },
    );

    const isMock = !isLiveYouCamMode();

    const updated = await storeUpdate(id, {
      status: "ready",
      context,
      skinAnalysis,
      outfits,
      isMockMode: isMock,
      ...(imageBase64 && imageBase64.length > 0
        ? { userImageBase64: imageBase64 }
        : {}),
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
  garmentImageBase64?: string,
): Promise<StoredSession> {
  const session = await storeGet(id);
  if (!session) throw new Error(`Session ${id} not found`);

  if (!session.outfits?.some((o) => o.id === outfitId)) {
    throw new Error("Invalid outfit");
  }

  const userImage = session.userImageBase64?.length
    ? session.userImageBase64
    : undefined;

  const live = isLiveYouCamMode();
  // Template outfits have no garment reference; live mode must not invent one
  // or send garmentAssetId as a YouCam file ID.
  if (live && !garmentImageBase64?.trim()) {
    throw new YouCamConfigurationError(
      "Live try-on requires a garment reference image.",
    );
  }

  let vtoResult: ApparelTryOnResult;
  try {
    vtoResult = await runApparelVto({
      userImageBase64: userImage,
      garmentAssetId: outfitId,
      ...(garmentImageBase64?.trim()
        ? { garmentImageBase64: garmentImageBase64.trim() }
        : {}),
    });
  } catch (err) {
    logYouCamFailure("tryOnOutfit", err);
    if (live) {
      throw err;
    }
    // Mock mode must always leave a visible preview behind, even if a local
    // provider call is interrupted or receives an unusual image payload.
    vtoResult = await new MockYouCamProvider().generateApparelTryOn({
      userImageBase64: userImage,
      garmentAssetId: outfitId,
    });
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
