import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  GarmentReferenceUnavailableError,
  toPublicOccasion,
  tryOnOccasionOutfit,
} from "@/lib/services/occasion-service";
import {
  YouCamApiError,
  YouCamConfigurationError,
} from "@/lib/youcam/live-provider";
import { TryOnPhotoRejectedError } from "@/lib/youcam/try-on-photo-gate";

interface Context {
  params: Promise<{ id: string }>;
}

/** ~12MB of base64 characters; the provider enforces the 10MB decoded limit. */
const MAX_IMAGE_CHARS = 12 * 1024 * 1024;

const TryOnBody = z.object({
  outfitId: z.string().min(1).max(128),
  userImageBase64: z.string().min(1).max(MAX_IMAGE_CHARS),
  /** Optional: try a specific piece of the look instead of the default. */
  itemId: z.string().min(1).max(128).optional(),
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

  const parsed = TryOnBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "outfitId and a photo are required." },
      { status: 422 },
    );
  }

  try {
    const occasion = await tryOnOccasionOutfit(
      id,
      parsed.data.outfitId,
      parsed.data.userImageBase64,
      parsed.data.itemId,
    );
    return NextResponse.json(toPublicOccasion(occasion));
  } catch (err) {
    // Garment reference gaps are an expected product state, not a failure.
    if (err instanceof GarmentReferenceUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    if (err instanceof TryOnPhotoRejectedError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    console.error("[POST /api/occasions/try-on]", {
      errorClass: err instanceof Error ? err.name : "UnknownError",
      ...(err instanceof YouCamApiError && err.status !== undefined
        ? { status: err.status }
        : {}),
      ...(err instanceof YouCamApiError && err.errorCode !== undefined
        ? { errorCode: err.errorCode }
        : {}),
    });

    if (err instanceof YouCamConfigurationError) {
      const detail = err.message.replace(/^YouCamConfigurationError:\s*/, "");
      if (/garment/i.test(detail)) {
        return NextResponse.json(
          {
            error:
              "This wardrobe piece's photo isn't usable for try-on. Add the piece with a clearer photo.",
          },
          { status: 422 },
        );
      }
      if (
        /image|photo|JPEG|PNG|WebP|dimension|base64|source/i.test(detail)
      ) {
        return NextResponse.json(
          {
            error:
              "This photo isn't usable for try-on. Use a clear, full-length photo of a person.",
          },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: "Try-on is not configured on this server." },
        { status: 501 },
      );
    }

    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Occasion not found." }, { status: 404 });
    }
    if (msg.includes("Invalid outfit")) {
      return NextResponse.json(
        { error: "Unknown outfit for this plan." },
        { status: 422 },
      );
    }
    if (err instanceof YouCamApiError) {
      return NextResponse.json(
        { error: "The try-on service could not render this look." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Try-on failed." }, { status: 500 });
  }
}
