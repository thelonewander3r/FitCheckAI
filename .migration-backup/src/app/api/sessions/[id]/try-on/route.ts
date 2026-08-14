import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  toPublicSession,
  tryOnOutfit,
} from "@/lib/services/session-service";
import { YouCamConfigurationError } from "@/lib/youcam/live-provider";

interface Context {
  params: Promise<{ id: string }>;
}

const TryOnBody = z.object({ outfitId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
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
      { error: "outfitId is required." },
      { status: 422 },
    );
  }

  try {
    const session = await tryOnOutfit(id, parsed.data.outfitId);
    return NextResponse.json(toPublicSession(session));
  } catch (err) {
    if (err instanceof YouCamConfigurationError) {
      const msg = err.message;
      if (/garment reference image/i.test(msg) || /garmentImageBase64/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "Live try-on is not available for this outfit (missing garment reference image).",
          },
          { status: 501 },
        );
      }
      console.error("[POST /api/sessions/try-on]", {
        errorClass: err.name,
      });
      return NextResponse.json({ error: "Try-on failed." }, { status: 500 });
    }

    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/sessions/try-on]", {
      errorClass: err instanceof Error ? err.name : "UnknownError",
    });
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (msg.includes("Invalid outfit")) {
      return NextResponse.json(
        { error: "Unknown outfitId for this session." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Try-on failed." }, { status: 500 });
  }
}
