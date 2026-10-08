import { Router, type IRouter } from "express";
import healthRouter from "./health";
import interviewsRouter from "./interviews";
import analyticsRouter from "./analytics";
import plansRouter from "./plans";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/interviews", interviewsRouter);
router.use("/analytics", analyticsRouter);
router.use("/plans", plansRouter);

export default router;
