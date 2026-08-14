import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOccasion } from "@/lib/services/occasion-service";
import { OCCASION_TYPES } from "@/types/occasion";

const OccasionIntakeSchema = z.object({
  eventType: z.enum(OCCASION_TYPES),
  venueName: z.string().trim().min(1, "Venue name is required").max(200),
  theme: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  eventDate: z.string().max(32).optional(),
  presentation: z.enum(["feminine", "masculine", "neutral"]).optional(),
  skinTone: z.enum(["fair", "light", "medium", "tan", "deep"]).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = OccasionIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const occasion = await createOccasion(parsed.data);
    return NextResponse.json({ occasionId: occasion.id }, { status: 201 });
  } catch (err) {
    console.error(
      "[POST /api/occasions]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to create occasion." },
      { status: 500 },
    );
  }
}
