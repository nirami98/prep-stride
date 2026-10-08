import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { CreateInterviewBody as PlanRequestBody } from "@workspace/api-zod";
import { db, interviewPlansTable } from "@workspace/db";
import { generateInterviewMaterials } from "../services/interviewAi";
import { aiMutationRateLimit } from "../middlewares/rateLimit";

const router = Router();
router.use(aiMutationRateLimit);

function requireAuth(req: any, res: any, next: any) {
  if (!getAuth(req).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function parseArray(value: string) {
  try {
    const result = JSON.parse(value);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

function formatPlan(plan: typeof interviewPlansTable.$inferSelect) {
  return {
    ...plan,
    rounds: parseArray(plan.rounds),
    schedule: parseArray(plan.schedule),
    sources: parseArray(plan.sources),
  };
}

router.get("/", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const plans = await db.select().from(interviewPlansTable)
      .where(eq(interviewPlansTable.userId, userId!))
      .orderBy(desc(interviewPlansTable.createdAt));
    res.json(plans.map(formatPlan));
  } catch (err) {
    req.log.error({ err }, "Failed to list plans");
    res.status(500).json({ error: "Failed to list interview plans" });
  }
});

router.post("/", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const parsed = PlanRequestBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const body = parsed.data;
    const generated = await generateInterviewMaterials({
      ...body,
      userId: userId!,
      difficulty: "medium",
      questionCount: 3,
      companyName: body.companyName || undefined,
      roundDetails: body.roundDetails || undefined,
      jobDescription: body.jobDescription || undefined,
    });
    const [plan] = await db.insert(interviewPlansTable).values({
      userId: userId!,
      companyName: body.companyName?.trim() || null,
      jobRole: body.jobRole.trim(),
      experienceLevel: body.experienceLevel,
      interviewRounds: body.interviewRounds,
      candidateSummary: generated.candidateSummary,
      roleSummary: generated.roleSummary,
      researchSummary: generated.researchSummary,
      rounds: JSON.stringify(generated.rounds),
      schedule: JSON.stringify(generated.schedule),
      sources: JSON.stringify(generated.sources),
    }).returning();
    res.status(201).json(formatPlan(plan));
  } catch (err) {
    req.log.error({ err }, "Failed to create plan");
    const message = err instanceof Error ? err.message : "Failed to create interview plan";
    res.status(message.includes("document") || message.includes("MB") ? 400 : 502).json({ error: message });
  }
});

router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const [plan] = await db.select().from(interviewPlansTable)
      .where(eq(interviewPlansTable.id, req.params.id));
    if (!plan || plan.userId !== userId) return res.status(404).json({ error: "Plan not found" });
    res.json(formatPlan(plan));
  } catch (err) {
    req.log.error({ err }, "Failed to get plan");
    res.status(500).json({ error: "Failed to get interview plan" });
  }
});

export default router;
