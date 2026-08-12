import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OCCASION_TYPES } from "@/types/occasion";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_COLORS,
  WARDROBE_FORMALITY,
} from "@/types/wardrobe";
import { addRecord, listRecords } from "@/lib/worn-store";
import { buildStyleProfile } from "@/lib/services/style-service";

const WORN_EVENT_TYPES = [...OCCASION_TYPES, "general"] as const;

const WornItemSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  category: z.enum(WARDROBE_CATEGORIES),
  color: z.enum(WARDROBE_COLORS),
  formality: z.enum(WARDROBE_FORMALITY),
});

const CreateWornRecordSchema = z.object({
  occasionId: z.string().max(100).optional(),
  eventType: z.enum(WORN_EVENT_TYPES).optional(),
  wornDate: z.string().max(32).optional(),
  rating: z.enum(["loved", "liked", "meh"]).optional(),
  items: z.array(WornItemSchema).min(1).max(12),
});
export async function GET(): Promise<NextResponse> {
  try {
    const records = await listRecords();
    const profile = buildStyleProfile(records);
    return NextResponse.json({ records, profile });
  } catch (err) {
    console.error(
      "[GET /api/worn]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to list worn records." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateWornRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const wornDate =
      parsed.data.wornDate ?? new Date().toISOString().slice(0, 10);
    const record = await addRecord({
      ...parsed.data,
      wornDate,
    });
    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error(
      "[POST /api/worn]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to create worn record." },
      { status: 500 },
    );
  }
}
