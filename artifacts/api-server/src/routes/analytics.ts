import { Router } from "express";
import { db } from "@workspace/db";
import {
  interviewSessionsTable,
  feedbackTable,
} from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// GET /api/analytics/overview
router.get("/overview", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);

    const sessions = await db
      .select()
      .from(interviewSessionsTable)
      .where(eq(interviewSessionsTable.userId, userId!))
      .orderBy(desc(interviewSessionsTable.startedAt));

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "completed",
    ).length;

    const scoredSessions = sessions.filter(
      (s) => s.score !== null && s.score !== undefined,
    );
    const averageScore =
      scoredSessions.length > 0
        ? scoredSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) /
          scoredSessions.length
        : null;

    const bestScore =
      scoredSessions.length > 0
        ? Math.max(...scoredSessions.map((s) => s.score ?? 0))
        : null;

    const easyScores = scoredSessions.filter((s) => s.difficulty === "easy");
    const mediumScores = scoredSessions.filter(
      (s) => s.difficulty === "medium",
    );
    const hardScores = scoredSessions.filter((s) => s.difficulty === "hard");

    const avgByDifficulty = (arr: typeof scoredSessions) =>
      arr.length > 0
        ? arr.reduce((sum, s) => sum + (s.score ?? 0), 0) / arr.length
        : null;

    const sessionIds = sessions.map((session) => session.id);
    const feedbackRows = sessionIds.length
      ? await db.select({ categoryScores: feedbackTable.categoryScores }).from(feedbackTable)
        .where(inArray(feedbackTable.sessionId, sessionIds))
      : [];
    const categoryTotals = new Map<string, { total: number; count: number }>();
    for (const row of feedbackRows) {
      try {
        for (const item of JSON.parse(row.categoryScores) as Array<{ category: string; score: number }>) {
          const current = categoryTotals.get(item.category) ?? { total: 0, count: 0 };
          categoryTotals.set(item.category, { total: current.total + item.score, count: current.count + 1 });
        }
      } catch { /* Ignore malformed legacy feedback. */ }
    }
    const topCategory = [...categoryTotals.entries()]
      .map(([category, value]) => ({ category, score: value.total / value.count }))
      .sort((a, b) => b.score - a.score)[0]?.category ?? null;

    const recentActivity = sessions.slice(0, 5).map((s) => ({
      id: s.id,
      jobRole: s.jobRole,
      difficulty: s.difficulty,
      score: s.score ?? null,
      questionCount: s.questionCount,
      startedAt: s.startedAt,
      endedAt: s.endedAt ?? null,
      status: s.status,
    }));

    res.json({
      totalSessions,
      completedSessions,
      averageScore,
      bestScore,
      topCategory,
      recentActivity,
      scoresByDifficulty: {
        easy: avgByDifficulty(easyScores),
        medium: avgByDifficulty(mediumScores),
        hard: avgByDifficulty(hardScores),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get analytics overview");
    res.status(500).json({ error: "Failed to get analytics overview" });
  }
});

// GET /api/analytics/history
router.get("/history", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const sessions = await db
      .select()
      .from(interviewSessionsTable)
      .where(eq(interviewSessionsTable.userId, userId!))
      .orderBy(desc(interviewSessionsTable.startedAt));

    res.json(
      sessions.map((s) => ({
        id: s.id,
        jobRole: s.jobRole,
        difficulty: s.difficulty,
        score: s.score ?? null,
        questionCount: s.questionCount,
        startedAt: s.startedAt,
        endedAt: s.endedAt ?? null,
        status: s.status,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get analytics history");
    res.status(500).json({ error: "Failed to get analytics history" });
  }
});

export default router;
