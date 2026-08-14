import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSession,
  toPublicSession,
} from "@/lib/services/session-service";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }
  try {
    const session = await getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    return NextResponse.json(toPublicSession(session));
  } catch (err) {
    console.error(
      `[GET /api/sessions/${id}]`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to retrieve session." },
      { status: 500 },
    );
  }
}
