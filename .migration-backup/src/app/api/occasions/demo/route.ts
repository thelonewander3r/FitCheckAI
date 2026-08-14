import { NextResponse } from "next/server";
import { createOccasion } from "@/lib/services/occasion-service";
import type { OccasionIntake } from "@/types/occasion";

const DEMO_OCCASION: OccasionIntake = {
  eventType: "dinner",
  venueName: "Skyline Rooftop Bar",
  theme: "team celebration",
  location: "Downtown",
  presentation: "feminine",
  skinTone: "medium",
};

export async function POST(): Promise<NextResponse> {
  try {
    const occasion = await createOccasion(DEMO_OCCASION);
    return NextResponse.json({ occasionId: occasion.id }, { status: 201 });
  } catch (err) {
    console.error(
      "[POST /api/occasions/demo]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to create demo occasion." },
      { status: 500 },
    );
  }
}
