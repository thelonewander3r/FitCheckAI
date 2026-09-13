import { NextResponse } from "next/server";
import { z } from "zod";
import { getOccasion } from "@/lib/services/occasion-service";
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
 * Proxy a stored live AI Clothes render through the app.
 * Never accepts a URL from the request; only fetches the trusted YCE URL
 * already stored on the occasion.
 */
export async function GET(
  _req: Request,
  ctx: Context,
): Promise<NextResponse> {
  const { id, outfitId } = await ctx.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid occasion id." }, { status: 400 });
  }
  if (!OutfitIdSchema.safeParse(outfitId).success) {
    return NextResponse.json({ error: "Invalid outfit id." }, { status: 400 });
  }

  const occasion = await getOccasion(id);
  if (!occasion) {
    return NextResponse.json({ error: "Occasion not found." }, { status: 404 });
  }

  return proxyStoredTryOnImage(occasion.tryOnResults?.[outfitId]);
}
