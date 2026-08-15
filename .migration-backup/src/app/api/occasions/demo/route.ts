import { NextResponse } from "next/server";
import { createOccasion } from "@/lib/services/occasion-service";
import {
  DEMO_OCCASION,
  DEMO_PREVIEW_IMAGES,
  DEMO_WARDROBE,
} from "@/lib/occasion/demo-fixture";

export async function POST(): Promise<NextResponse> {
  try {
    const occasion = await createOccasion(DEMO_OCCASION, {
      wardrobeItems: DEMO_WARDROBE,
      previewImageUrls: DEMO_PREVIEW_IMAGES,
      isDemo: true,
    });
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
