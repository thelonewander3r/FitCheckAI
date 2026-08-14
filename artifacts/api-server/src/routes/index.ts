import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import sessionsRouter from "./sessions.js";
import wardrobeRouter from "./wardrobe.js";
import occasionsRouter from "./occasions.js";
import wornRouter from "./worn.js";
import demoRouter from "./demo.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionsRouter);
router.use(wardrobeRouter);
router.use(occasionsRouter);
router.use(wornRouter);
router.use(demoRouter);

export default router;
