import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteRecord } from "@/lib/worn-store";

interface Context {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid record id." }, { status: 400 });
  }
  try {
    const deleted = await deleteRecord(id);
    if (!deleted) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(
      `[DELETE /api/worn/${id}]`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to delete worn record." },
      { status: 500 },
    );
  }
}
