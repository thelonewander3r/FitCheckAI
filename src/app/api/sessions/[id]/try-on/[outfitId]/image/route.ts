import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/services/session-service";
import { proxyStoredTryOnImage } from "@/lib/youcam/image-proxy";

interface Context {
  params: Promise<{ id: string; outfitId: string }>;
}

const OutfitIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

/**
 * Proxy a stored live try-on result image through the app.
 * Never accepts a URL from the request; only fetches the trusted YCE URL
 * already stored on the session.
 */
export async function GET(
  _req: Request,
  ctx: Context,
): Promise<NextResponse> {
  const { id, outfitId } = await ctx.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }
  if (!OutfitIdSchema.safeParse(outfitId).success) {
    return NextResponse.json({ error: "Invalid outfit id." }, { status: 400 });
  }

  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return proxyStoredTryOnImage(session.tryOnResults?.[outfitId]);
}
