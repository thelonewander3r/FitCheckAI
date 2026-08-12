import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selectOutfit } from "@/lib/services/session-service";

interface Context {
  params: Promise<{ id: string }>;
}

const SelectBody = z.object({ outfitId: z.string().min(1) });

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

  const parsed = SelectBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "outfitId is required." },
      { status: 422 },
    );
  }

  try {
    const session = await selectOutfit(id, parsed.data.outfitId);
    return NextResponse.json(session);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[POST /api/sessions/${id}/select]`, msg);
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (msg.includes("Invalid outfit")) {
      return NextResponse.json(
        { error: "Unknown outfitId for this session." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Select failed." }, { status: 500 });
  }
}
