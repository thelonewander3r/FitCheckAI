import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  runOccasionSkinPrep,
  toPublicOccasion,
} from "@/lib/services/occasion-service";
import {
  YouCamApiError,
  YouCamConfigurationError,
} from "@/lib/youcam/live-provider";

interface Context {
  params: Promise<{ id: string }>;
}

/** ~12MB of base64 characters; the provider enforces the 10MB decoded limit. */
const MAX_IMAGE_CHARS = 12 * 1024 * 1024;

const SkinPrepBody = z.object({
  imageBase64: z.string().min(1).max(MAX_IMAGE_CHARS),
});

export async function POST(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid occasion id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = SkinPrepBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A photo is required." }, { status: 422 });
  }

  try {
    const occasion = await runOccasionSkinPrep(id, parsed.data.imageBase64);
    return NextResponse.json(toPublicOccasion(occasion));
  } catch (err) {
    console.error("[POST /api/occasions/skin-prep]", {
      errorClass: err instanceof Error ? err.name : "UnknownError",
      ...(err instanceof YouCamApiError && err.status !== undefined
        ? { status: err.status }
        : {}),
      ...(err instanceof YouCamApiError && err.errorCode !== undefined
        ? { errorCode: err.errorCode }
        : {}),
    });

    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Occasion not found." }, { status: 404 });
    }
    // Image too small / unsupported format is user-correctable, so surface the
    // provider's own guidance (it never contains URLs, ids, or credentials).
    if (err instanceof YouCamConfigurationError) {
      return NextResponse.json(
        { error: err.message.replace(/^YouCamConfigurationError:\s*/, "") },
        { status: 422 },
      );
    }
    if (err instanceof YouCamApiError) {
      return NextResponse.json(
        { error: "Skin AI could not analyze this photo." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Skin analysis failed." }, { status: 500 });
  }
}
