import { NextRequest, NextResponse } from "next/server";
import { IntakeSchema } from "@/lib/validation/schemas";
import {
  createSession,
  analyzeSession,
} from "@/lib/services/session-service";
import { YouCamApiError } from "@/lib/youcam/live-provider";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Extract imageBase64 before schema validation (not part of IntakeSchema)
  const { imageBase64, ...rest } =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const parsed = IntakeSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const safeImageBase64 =
    typeof imageBase64 === "string" ? imageBase64 : undefined;

  try {
    const session = await createSession(parsed.data);
    const analyzed = await analyzeSession(session.id, safeImageBase64);
    return NextResponse.json({ sessionId: analyzed.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sessions] YouCam/session operation failed.", {
      errorClass: err instanceof Error ? err.name : "UnknownError",
      ...(err instanceof YouCamApiError && err.status !== undefined
        ? { status: err.status }
        : {}),
      ...(err instanceof YouCamApiError && err.errorCode !== undefined
        ? { errorCode: err.errorCode }
        : {}),
    });
    return NextResponse.json(
      { error: "Failed to create session." },
      { status: 500 },
    );
  }
}
