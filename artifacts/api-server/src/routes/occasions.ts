import { Router } from "express";
import { z } from "zod";
import { OCCASION_TYPES } from "../types/occasion.js";
import { createOccasion, getOccasion } from "../lib/services/occasion-service.js";
import { getUserId } from "../lib/req-session.js";
import { ensureDemoWardrobe } from "../lib/demo-wardrobe.js";
import type { Request, Response } from "express";

const router = Router();
const UuidSchema = z.string().uuid();

const OccasionIntakeSchema = z.object({
  eventType: z.enum(OCCASION_TYPES),
  venueName: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  theme: z.string().max(200).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  presentation: z.enum(["feminine", "masculine", "neutral"]).optional(),
  skinTone: z.enum(["fair", "light", "medium", "tan", "deep"]).optional(),
  demo: z.boolean().optional(),
});

// POST /api/occasions
router.post("/occasions", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const parsed = OccasionIntakeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Validation failed.", issues: parsed.error.issues });
    return;
  }
  try {
    if (parsed.data.demo) await ensureDemoWardrobe(userId);
    const { demo: _demo, ...intake } = parsed.data;
    const occasion = await createOccasion(userId, intake);
    res.status(201).json({ occasionId: occasion.id });
  } catch (err) {
    req.log.error({ err }, "POST /occasions failed");
    res.status(500).json({ error: "Failed to create occasion." });
  }
});

// POST /api/occasions/demo
router.post("/occasions/demo", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const occasion = await createOccasion(userId, {
      eventType: "dinner",
      venueName: "The Capital Grille",
      location: "New York",
      theme: "Business casual",
    });
    res.status(201).json({ occasionId: occasion.id });
  } catch (err) {
    req.log.error({ err }, "POST /occasions/demo failed");
    res.status(500).json({ error: "Failed to create demo occasion." });
  }
});

// GET /api/occasions/:id
router.get("/occasions/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) {
    res.status(400).json({ error: "Invalid occasion id." });
    return;
  }
  try {
    const occasion = await getOccasion(userId, id);
    if (!occasion) { res.status(404).json({ error: "Occasion not found." }); return; }
    res.json(occasion);
  } catch (err) {
    req.log.error({ err }, `GET /occasions/${id} failed`);
    res.status(500).json({ error: "Failed to retrieve occasion." });
  }
});

export default router;
