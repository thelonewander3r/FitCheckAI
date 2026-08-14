import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOccasion } from "@/lib/services/occasion-service";
import { inferOccasionType } from "@/lib/occasion/inference";
import { OCCASION_TYPES } from "@/types/occasion";

const OccasionIntakeSchema = z.object({
  eventType: z.enum(OCCASION_TYPES).optional(),
  venueName: z.string().trim().min(1, "Situation is required").max(200),
  theme: z.string().max(200).optional(),
  // Kept optional for old links/API clients; the new UI does not ask for it.
  location: z.string().max(200).optional(),
  eventDate: z.string().max(32).optional(),
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
    const inferredEventType =
      parsed.data.eventType ??
      inferOccasionType(
        [parsed.data.venueName, parsed.data.theme, parsed.data.location]
          .filter(Boolean)
          .join(" "),
      );
    const occasion = await createOccasion({
      ...parsed.data,
      eventType: inferredEventType,
    });
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
