import { Router } from "express";
import { z } from "zod";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_COLORS,
  WARDROBE_FORMALITY,
} from "../types/wardrobe.js";
import { addRecord, deleteRecord, listRecords } from "../lib/worn-store.js";
import { buildStyleProfile } from "../lib/services/style-service.js";
import { getUserId } from "../lib/req-session.js";
import type { Request, Response } from "express";
import type { WornItemRef } from "../types/worn.js";

const router = Router();
const UuidSchema = z.string().uuid();

const CreateWornRecordSchema = z.object({
  wardrobeItemId: z.string().uuid().optional(),
  category: z.enum(WARDROBE_CATEGORIES),
  color: z.enum(WARDROBE_COLORS),
  formality: z.enum(WARDROBE_FORMALITY),
  occasion: z.string().max(200).optional(),
  wornDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rating: z.enum(["loved", "liked", "meh"]).optional(),
});

// GET /api/worn
router.get("/worn", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const records = await listRecords(userId);
    const profile = buildStyleProfile(records);
    res.json({ records, profile });
  } catch (err) {
    req.log.error({ err }, "GET /worn failed");
    res.status(500).json({ error: "Failed to list worn records." });
  }
});

// POST /api/worn
router.post("/worn", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const parsed = CreateWornRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Validation failed.", issues: parsed.error.issues });
    return;
  }
  try {
    const { wardrobeItemId, category, color, formality, occasion, wornDate: _wd, rating } = parsed.data;
    const wornDate = _wd ?? new Date().toISOString().slice(0, 10);

    const items: WornItemRef[] = [
      {
        id: wardrobeItemId ?? crypto.randomUUID(),
        name: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " "),
        category,
        color,
        formality,
      },
    ];

    const record = await addRecord(userId, {
      items,
      wornDate,
      eventType: occasion as "general" | undefined,
      rating,
    });

    res.status(201).json({ id: record.id });
  } catch (err) {
    req.log.error({ err }, "POST /worn failed");
    res.status(500).json({ error: "Failed to create worn record." });
  }
});

// DELETE /api/worn/:id
router.delete("/worn/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) {
    res.status(400).json({ error: "Invalid record id." });
    return;
  }
  try {
    const deleted = await deleteRecord(userId, id);
    if (!deleted) { res.status(404).json({ error: "Record not found." }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, `DELETE /worn/${id} failed`);
    res.status(500).json({ error: "Failed to delete worn record." });
  }
});

export default router;
