import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeSession } from "@/lib/services/session-service";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }

  let imageBase64: string | undefined;
  try {
    const body = (await req.json()) as { imageBase64?: string };
    imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : undefined;
  } catch {
    // body is optional for this route
  }

  try {
    const session = await analyzeSession(id, imageBase64);
    return NextResponse.json(session);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[POST /api/sessions/${id}/analyze]`, msg);
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}
