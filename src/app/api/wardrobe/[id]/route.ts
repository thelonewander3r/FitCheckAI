import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_COLORS,
  WARDROBE_FORMALITY,
  WARDROBE_SEASONS,
} from "@/types/wardrobe";
import {
  deleteItem,
  getItem,
  updateItem,
} from "@/lib/wardrobe-store";

const PatchWardrobeItemSchema = z
  .object({
    name: z.string().optional(),
    category: z.enum(WARDROBE_CATEGORIES).optional(),
    color: z.enum(WARDROBE_COLORS).optional(),
    formality: z.enum(WARDROBE_FORMALITY).optional(),
    seasons: z.array(z.enum(WARDROBE_SEASONS)).min(1).optional(),
    fitNote: z.string().optional(),
    favorite: z.boolean().optional(),
    imageBase64: z
      .string()
      .min(1)
      .max(3_000_000)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  });

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  }
  try {
    const item = await getItem(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (err) {
    console.error(
      `[GET /api/wardrobe/${id}]`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to retrieve wardrobe item." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = PatchWardrobeItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  try {
    const updated = await updateItem(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error(
      `[PATCH /api/wardrobe/${id}]`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to update wardrobe item." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: Context,
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  }
  try {
    const deleted = await deleteItem(id);
    if (!deleted) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(
      `[DELETE /api/wardrobe/${id}]`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to delete wardrobe item." },
      { status: 500 },
    );
  }
}
