import { NextResponse } from "next/server";
import { DEMO_SCENARIO } from "@/lib/interview/demo-scenario";
import {
  createSession,
  analyzeSession,
} from "@/lib/services/session-service";
import { YouCamApiError } from "@/lib/youcam/live-provider";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await createSession(DEMO_SCENARIO);
    const analyzed = await analyzeSession(session.id);
    return NextResponse.json({ sessionId: analyzed.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/demo] Demo session failed.", {
      errorClass: err instanceof Error ? err.name : "UnknownError",
      ...(err instanceof YouCamApiError && err.status !== undefined
        ? { status: err.status }
        : {}),
      ...(err instanceof YouCamApiError && err.errorCode !== undefined
        ? { errorCode: err.errorCode }
        : {}),
    });
    return NextResponse.json(
      { error: "Failed to create demo session." },
      { status: 500 },
    );
  }
}
