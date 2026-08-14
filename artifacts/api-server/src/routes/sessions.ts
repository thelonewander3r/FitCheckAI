import { Router } from "express";
import { z } from "zod";
import {
  createSession,
  analyzeSession,
  getSession,
  toPublicSession,
  tryOnOutfit,
  selectOutfit,
  generatePlan,
} from "../lib/services/session-service.js";
import { IntakeSchema } from "../lib/validation/schemas.js";
import {
  YouCamApiError,
  YouCamConfigurationError,
} from "../lib/youcam/live-provider.js";
import { getUserId } from "../lib/req-session.js";
import type { Request, Response } from "express";

const router = Router();
const UuidSchema = z.string().uuid();

const MAX_PROXY_BYTES = 10 * 1024 * 1024; // 10 MB
const PROXY_TIMEOUT_MS = 10_000;

function safeImageContentType(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.split(";")[0]?.trim().toLowerCase() ?? "";
  return ["image/jpeg", "image/png", "image/webp"].includes(lower) ? lower : null;
}

// POST /api/sessions — create + analyze
router.post("/sessions", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { imageBase64, ...rest } =
    typeof req.body === "object" && req.body !== null
      ? (req.body as Record<string, unknown>)
      : {};

  const parsed = IntakeSchema.safeParse(rest);
  if (!parsed.success) {
    res.status(422).json({ error: "Validation failed.", issues: parsed.error.issues });
    return;
  }

  const safeImageBase64 = typeof imageBase64 === "string" ? imageBase64 : undefined;

  try {
    const session = await createSession(userId, parsed.data);
    const analyzed = await analyzeSession(userId, session.id, safeImageBase64);
    res.status(201).json({ sessionId: analyzed.id });
  } catch (err) {
    req.log.error(
      {
        errorClass: err instanceof Error ? err.name : "UnknownError",
        ...(err instanceof YouCamApiError && err.status !== undefined ? { ycStatus: err.status } : {}),
      },
      "Session creation failed",
    );
    res.status(500).json({ error: "Failed to create session." });
  }
});

// GET /api/sessions/:id
router.get("/sessions/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  try {
    const session = await getSession(userId, id);
    if (!session) { res.status(404).json({ error: "Session not found." }); return; }
    res.json(toPublicSession(session));
  } catch (err) {
    req.log.error({ err }, `GET /sessions/${id} failed`);
    res.status(500).json({ error: "Failed to retrieve session." });
  }
});

// POST /api/sessions/:id/analyze
router.post("/sessions/:id/analyze", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  const imageBase64 = typeof req.body?.imageBase64 === "string" ? req.body.imageBase64 : undefined;
  try {
    const session = await analyzeSession(userId, id, imageBase64);
    res.json(toPublicSession(session));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, `Analysis failed for ${id}`);
    if (msg.includes("not found")) { res.status(404).json({ error: "Session not found." }); return; }
    res.status(500).json({ error: "Analysis failed." });
  }
});

// POST /api/sessions/:id/try-on
router.post("/sessions/:id/try-on", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  const TryOnBody = z.object({
    outfitId: z.string().min(1),
    garmentImageBase64: z.string().optional(),
  });
  const parsed = TryOnBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "outfitId is required." });
    return;
  }
  try {
    const session = await tryOnOutfit(userId, id, parsed.data.outfitId, parsed.data.garmentImageBase64);
    res.json(toPublicSession(session));
  } catch (err) {
    if (err instanceof YouCamConfigurationError) {
      const msg = err.message;
      if (/garment reference image/i.test(msg) || /garmentImageBase64/i.test(msg)) {
        res.status(501).json({ error: "Live try-on requires a garment reference image.", code: "LIVE_VTO_NO_GARMENT" });
        return;
      }
    }
    if (err instanceof YouCamApiError) {
      req.log.error({ status: err.status, errorCode: err.errorCode }, `VTO failed for ${id}`);
      res.status(502).json({ error: "Try-on service unavailable. Please try again." });
      return;
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, `tryOnOutfit failed for ${id}`);
    if (msg.includes("Invalid outfit")) { res.status(400).json({ error: "Invalid outfit id." }); return; }
    if (msg.includes("not found")) { res.status(404).json({ error: "Session not found." }); return; }
    res.status(500).json({ error: "Try-on failed." });
  }
});

// POST /api/sessions/:id/select
router.post("/sessions/:id/select", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  const SelectBody = z.object({ outfitId: z.string().min(1) });
  const parsed = SelectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "outfitId is required." });
    return;
  }
  try {
    const session = await selectOutfit(userId, id, parsed.data.outfitId);
    res.json(toPublicSession(session));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Invalid outfit")) { res.status(400).json({ error: "Invalid outfit id." }); return; }
    if (msg.includes("not found")) { res.status(404).json({ error: "Session not found." }); return; }
    res.status(500).json({ error: "Selection failed." });
  }
});

// POST /api/sessions/:id/plan
router.post("/sessions/:id/plan", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params as { id: string };
  if (!UuidSchema.safeParse(id).success) {
    res.status(400).json({ error: "Invalid session id." });
    return;
  }
  try {
    const session = await generatePlan(userId, id);
    res.json(toPublicSession(session));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, `generatePlan failed for ${id}`);
    if (msg.includes("not found")) { res.status(404).json({ error: "Session not found." }); return; }
    if (msg.includes("No ranked outfits")) { res.status(409).json({ error: "Analyze the session first." }); return; }
    res.status(500).json({ error: "Failed to generate plan." });
  }
});

// GET /api/sessions/:id/try-on/:outfitId/image — proxy live VTO image
router.get(
  "/sessions/:id/try-on/:outfitId/image",
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id, outfitId } = req.params as { id: string; outfitId: string };
    try {
      const session = await getSession(userId, id);
      if (!session) { res.status(404).json({ error: "Session not found." }); return; }

      const result = session.tryOnResults?.[outfitId];
      if (!result) { res.status(404).json({ error: "Try-on result not found." }); return; }

      if (result.isMock || result.renderedImageUrl.startsWith("data:")) {
        res.status(400).json({ error: "Proxy not needed for mock/data-URL results." });
        return;
      }

      const upstreamUrl = result.renderedImageUrl;
      if (!upstreamUrl) { res.status(502).json({ error: "Try-on image unavailable." }); return; }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
      try {
        const upstream = await fetch(upstreamUrl, {
          signal: controller.signal,
          redirect: "error",
          headers: { Accept: "image/*" },
        });
        if (!upstream.ok) { res.status(502).json({ error: "Try-on image unavailable." }); return; }
        const contentType = safeImageContentType(upstream.headers.get("content-type"));
        if (!contentType) { res.status(502).json({ error: "Try-on image unavailable." }); return; }
        const arrayBuffer = await upstream.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_PROXY_BYTES) { res.status(502).json({ error: "Try-on image unavailable." }); return; }
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "private, max-age=60");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.send(Buffer.from(arrayBuffer));
      } finally {
        clearTimeout(timer);
      }
    } catch {
      res.status(502).json({ error: "Try-on image unavailable." });
    }
  },
);

export default router;
