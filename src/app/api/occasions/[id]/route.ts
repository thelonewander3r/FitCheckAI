import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOccasion } from "@/lib/services/occasion-service";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: "Invalid occasion id." },
      { status: 400 },
    );
  }

  try {
    const occasion = await getOccasion(id);
    if (!occasion) {
      return NextResponse.json(
        { error: "Occasion not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(occasion);
  } catch (err) {
    console.error(
      `[GET /api/occasions/${id}]`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to retrieve occasion." },
      { status: 500 },
    );
  }
}
