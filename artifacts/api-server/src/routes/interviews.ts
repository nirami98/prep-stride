import { Router } from "express";
import { db } from "@workspace/db";
import {
  interviewSessionsTable,
  questionsTable,
  answersTable,
  feedbackTable,
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  CreateInterviewBody,
  SubmitAnswerBody,
  TranscribeAnswerBody,
} from "@workspace/api-zod";
import { getAuth } from "@clerk/express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function getTimeLimitSeconds(difficulty: string) {
  if (difficulty === "easy") return 120;
  if (difficulty === "medium") return 90;
  return 75;
}

// GET /api/interviews
router.get("/", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const sessions = await db
      .select()
      .from(interviewSessionsTable)
      .where(eq(interviewSessionsTable.userId, userId!))
      .orderBy(desc(interviewSessionsTable.startedAt));
    res.json(sessions);
  } catch (err) {
    req.log.error({ err }, "Failed to list interviews");
    res.status(500).json({ error: "Failed to list interviews" });
  }
});

// POST /api/interviews
router.post("/", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const parsed = CreateInterviewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const { jobRole, difficulty, questionCount = 5 } = parsed.data;
    const [session] = await db
      .insert(interviewSessionsTable)
      .values({
        userId: userId!,
        jobRole,
        difficulty: difficulty as "easy" | "medium" | "hard",
        questionCount,
        status: "active",
      })
      .returning();
    res.status(201).json({ ...session, timeLimitSeconds: getTimeLimitSeconds(session.difficulty) });
  } catch (err) {
    req.log.error({ err }, "Failed to create interview");
    res.status(500).json({ error: "Failed to create interview" });
  }
});

// GET /api/interviews/:id
router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const [session] = await db
      .select()
      .from(interviewSessionsTable)
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.userId, userId!),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const answers = await db
      .select({
        id: answersTable.id,
        sessionId: answersTable.sessionId,
        questionId: answersTable.questionId,
        response: answersTable.response,
        createdAt: answersTable.createdAt,
        question: {
          id: questionsTable.id,
          content: questionsTable.content,
          category: questionsTable.category,
          difficulty: questionsTable.difficulty,
        },
      })
      .from(answersTable)
      .leftJoin(questionsTable, eq(answersTable.questionId, questionsTable.id))
      .where(eq(answersTable.sessionId, id));
    const [feedback] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, id));
    const feedbackFormatted = feedback
      ? {
          ...feedback,
          strengths: JSON.parse(feedback.strengths),
          weaknesses: JSON.parse(feedback.weaknesses),
          suggestions: JSON.parse(feedback.suggestions),
        }
      : null;
    res.json({ ...session, answers, feedback: feedbackFormatted, timeLimitSeconds: getTimeLimitSeconds(session.difficulty) });
  } catch (err) {
    req.log.error({ err }, "Failed to get interview");
    res.status(500).json({ error: "Failed to get interview" });
  }
});

// PATCH /api/interviews/:id (end)
router.patch("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const [session] = await db
      .update(interviewSessionsTable)
      .set({ status: "completed", endedAt: new Date() })
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.userId, userId!),
        ),
      )
      .returning();
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to end interview");
    res.status(500).json({ error: "Failed to end interview" });
  }
});

// GET /api/interviews/:id/next-question
router.get("/:id/next-question", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const [session] = await db
      .select()
      .from(interviewSessionsTable)
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.userId, userId!),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const answeredIds = await db
      .select({ questionId: answersTable.questionId })
      .from(answersTable)
      .where(eq(answersTable.sessionId, id));
    const answeredQuestionIds = answeredIds.map((a) => a.questionId);
    if (answeredQuestionIds.length >= session.questionCount) {
      res.status(204).send();
      return;
    }
    let questionsQuery = db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.difficulty, session.difficulty))
      .orderBy(sql`RANDOM()`)
      .limit(1);

    let [question] = await questionsQuery;

    if (!question) {
      const [fallback] = await db
        .select()
        .from(questionsTable)
        .orderBy(sql`RANDOM()`)
        .limit(1);
      question = fallback;
    }
    if (!question) {
      res.status(204).send();
      return;
    }
    res.json(question);
  } catch (err) {
    req.log.error({ err }, "Failed to get next question");
    res.status(500).json({ error: "Failed to get next question" });
  }
});

// POST /api/interviews/:id/answers
router.post("/:id/answers", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const parsed = SubmitAnswerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const [session] = await db
      .select()
      .from(interviewSessionsTable)
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.userId, userId!),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const [question] = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.id, parsed.data.questionId));
    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }
    const [answer] = await db
      .insert(answersTable)
      .values({
        sessionId: id,
        questionId: parsed.data.questionId,
        response: parsed.data.response,
      })
      .returning();
    res.status(201).json(answer);
  } catch (err) {
    req.log.error({ err }, "Failed to submit answer");
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// POST /api/interviews/:id/feedback
router.post("/:id/feedback", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const [session] = await db
      .select()
      .from(interviewSessionsTable)
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.userId, userId!),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const answers = await db
      .select({
        response: answersTable.response,
        question: {
          content: questionsTable.content,
          category: questionsTable.category,
        },
      })
      .from(answersTable)
      .leftJoin(questionsTable, eq(answersTable.questionId, questionsTable.id))
      .where(eq(answersTable.sessionId, id));
    const prompt = [
      `Job role: ${session.jobRole}`,
      `Difficulty: ${session.difficulty}`,
      `Evaluate these interview answers with a score out of 100.`,
      `Return JSON with keys score, strengths, weaknesses, suggestions, summary.`,
      `Answers: ${JSON.stringify(answers)}`,
    ].join("\n");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const [feedback] = await db
      .insert(feedbackTable)
      .values({
        sessionId: id,
        score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
        strengths: JSON.stringify(Array.isArray(parsed.strengths) ? parsed.strengths : []),
        weaknesses: JSON.stringify(Array.isArray(parsed.weaknesses) ? parsed.weaknesses : []),
        suggestions: JSON.stringify(Array.isArray(parsed.suggestions) ? parsed.suggestions : []),
        summary: String(parsed.summary ?? ""),
      })
      .returning();
    res.status(201).json({
      ...feedback,
      strengths: JSON.parse(feedback.strengths),
      weaknesses: JSON.parse(feedback.weaknesses),
      suggestions: JSON.parse(feedback.suggestions),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate feedback");
    res.status(500).json({ error: "Failed to generate feedback" });
  }
});

// GET /api/interviews/:id/feedback
router.get("/:id/feedback", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const [session] = await db
      .select()
      .from(interviewSessionsTable)
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.userId, userId!),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const [feedback] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, id));
    if (!feedback) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }
    res.json({
      ...feedback,
      strengths: JSON.parse(feedback.strengths),
      weaknesses: JSON.parse(feedback.weaknesses),
      suggestions: JSON.parse(feedback.suggestions),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get feedback");
    res.status(500).json({ error: "Failed to get feedback" });
  }
});

// POST /api/interviews/:id/transcribe
router.post("/:id/transcribe", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const parsed = TranscribeAnswerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const [session] = await db
      .select()
      .from(interviewSessionsTable)
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.userId, userId!),
        ),
      );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const transcription = await openai.audio.transcriptions.create({
      file: Buffer.from(parsed.data.audioBase64, "base64"),
      model: "gpt-4o-mini-transcribe",
      language: "en",
    } as any);
    res.json({ transcript: transcription.text });
  } catch (err) {
    req.log.error({ err }, "Failed to transcribe answer");
    res.status(500).json({ error: "Failed to transcribe answer" });
  }
});

export default router;
