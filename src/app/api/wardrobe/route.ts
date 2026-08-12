import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_COLORS,
  WARDROBE_FORMALITY,
  WARDROBE_SEASONS,
} from "@/types/wardrobe";
import { createItem, listItems } from "@/lib/wardrobe-store";

const CreateWardrobeItemSchema = z.object({
  name: z.string().optional().default(""),
  category: z.enum(WARDROBE_CATEGORIES),
  color: z.enum(WARDROBE_COLORS),
  formality: z.enum(WARDROBE_FORMALITY),
  seasons: z
    .array(z.enum(WARDROBE_SEASONS))
    .min(1)
    .optional()
    .default(["any"]),
  fitNote: z.string().optional(),
  favorite: z.boolean().optional().default(false),
  imageBase64: z
    .string()
    .min(1)
    .max(3_000_000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export async function GET(): Promise<NextResponse> {
  try {
    const items = await listItems();
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return NextResponse.json({ items: sorted });
  } catch (err) {
    console.error(
      "[GET /api/wardrobe]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to list wardrobe items." },
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

  const parsed = CreateWardrobeItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const item = await createItem(parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error(
      "[POST /api/wardrobe]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to create wardrobe item." },
      { status: 500 },
    );
  }
}
