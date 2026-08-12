import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generatePlan,
  toPublicSession,
} from "@/lib/services/session-service";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }
  try {
    const session = await generatePlan(id);
    return NextResponse.json(toPublicSession(session));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[POST /api/sessions/${id}/plan]`, msg);
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (msg.includes("No ranked outfits")) {
      return NextResponse.json(
        { error: "Run analyze first." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Plan generation failed." },
      { status: 500 },
    );
  }
}
