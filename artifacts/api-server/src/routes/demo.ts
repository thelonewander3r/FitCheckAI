import { Router } from "express";
import { DEMO_SCENARIO } from "../lib/interview/demo-scenario.js";
import {
  createSession,
  analyzeSession,
} from "../lib/services/session-service.js";
import { YouCamApiError } from "../lib/youcam/live-provider.js";
import { getUserId } from "../lib/req-session.js";
import type { Request, Response } from "express";

const router = Router();

// POST /api/demo — create a demo session scoped to the current user
router.post("/demo", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  try {
    const session = await createSession(userId, DEMO_SCENARIO);
    const analyzed = await analyzeSession(userId, session.id);
    res.status(201).json({ sessionId: analyzed.id });
  } catch (err) {
    req.log.error(
      {
        errorClass: err instanceof Error ? err.name : "UnknownError",
        ...(err instanceof YouCamApiError && err.status !== undefined
          ? { ycStatus: err.status }
          : {}),
      },
      "Demo session creation failed",
    );
    res.status(500).json({ error: "Failed to create demo session." });
  }
});

export default router;
