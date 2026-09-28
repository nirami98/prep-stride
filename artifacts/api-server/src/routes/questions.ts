import { Router } from "express";
import { db } from "@workspace/db";
import { questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/questions
router.get("/", async (req: any, res: any) => {
  try {
    const { category } = req.query;
    let questions;
    if (category && typeof category === "string") {
      questions = await db
        .select()
        .from(questionsTable)
        .where(eq(questionsTable.category, category));
    } else {
      questions = await db.select().from(questionsTable);
    }
    res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Failed to list questions");
    res.status(500).json({ error: "Failed to list questions" });
  }
});

export default router;
