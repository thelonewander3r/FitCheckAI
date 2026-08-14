import { Router } from "express";
import { z } from "zod";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_COLORS,
  WARDROBE_FORMALITY,
  WARDROBE_SEASONS,
} from "../types/wardrobe.js";
import {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
} from "../lib/wardrobe-store.js";
import { getUserId } from "../lib/req-session.js";
import type { Request, Response } from "express";

const router = Router();
const UuidSchema = z.string().uuid();

const CreateWardrobeItemSchema = z.object({
  name: z.string().optional().default(""),
  category: z.enum(WARDROBE_CATEGORIES),
  color: z.enum(WARDROBE_COLORS),
  formality: z.enum(WARDROBE_FORMALITY),
  seasons: z.array(z.enum(WARDROBE_SEASONS)).min(1).optional().default(["any"]),
  fitNote: z.string().optional(),
  favorite: z.boolean().optional().default(false),
  imageBase64: z
    .string()
    .min(1)
    .max(3_000_000)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

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

// GET /api/wardrobe
router.get("/wardrobe", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const items = await listItems(userId);
    const sorted = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    res.json({ items: sorted });
  } catch (err) {
    req.log.error({ err }, "GET /wardrobe failed");
    res.status(500).json({ error: "Failed to list wardrobe items." });
  }
});

// POST /api/wardrobe
router.post("/wardrobe", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const parsed = CreateWardrobeItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Validation failed.", issues: parsed.error.issues });
    return;
  }
  try {
    const item = await createItem(userId, parsed.data);
    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, "POST /wardrobe failed");
    res.status(500).json({ error: "Failed to create wardrobe item." });
  }
});

// GET /api/wardrobe/:id
router.get("/wardrobe/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) { res.status(400).json({ error: "Invalid item id." }); return; }
  try {
    const item = await getItem(userId, id);
    if (!item) { res.status(404).json({ error: "Item not found." }); return; }
    res.json(item);
  } catch (err) {
    req.log.error({ err }, `GET /wardrobe/${id} failed`);
    res.status(500).json({ error: "Failed to retrieve wardrobe item." });
  }
});

// PATCH /api/wardrobe/:id
router.patch("/wardrobe/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) { res.status(400).json({ error: "Invalid item id." }); return; }
  const parsed = PatchWardrobeItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Validation failed.", issues: parsed.error.issues });
    return;
  }
  try {
    const updated = await updateItem(userId, id, parsed.data);
    if (!updated) { res.status(404).json({ error: "Item not found." }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, `PATCH /wardrobe/${id} failed`);
    res.status(500).json({ error: "Failed to update wardrobe item." });
  }
});

// DELETE /api/wardrobe/:id
router.delete("/wardrobe/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) { res.status(400).json({ error: "Invalid item id." }); return; }
  try {
    const deleted = await deleteItem(userId, id);
    if (!deleted) { res.status(404).json({ error: "Item not found." }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, `DELETE /wardrobe/${id} failed`);
    res.status(500).json({ error: "Failed to delete wardrobe item." });
  }
});

export default router;
