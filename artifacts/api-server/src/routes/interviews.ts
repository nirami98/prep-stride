import { Router } from "express";
import { toFile } from "openai";
import { and, asc, desc, eq, notInArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { CreateInterviewBody, SubmitAnswerBody, TranscribeAnswerBody } from "@workspace/api-zod";
import {
  answersTable,
  db,
  feedbackTable,
  interviewPlansTable,
  interviewSessionsTable,
  questionsTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  generateInterviewMaterials,
  scoreInterview,
  type InterviewGenerationInput,
} from "../services/interviewAi";
import { aiMutationRateLimit } from "../middlewares/rateLimit";

const router = Router();
router.use(aiMutationRateLimit);

function requireAuth(req: any, res: any, next: any) {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function timeLimit(difficulty: string) {
  return difficulty === "easy" ? 120 : difficulty === "hard" ? 75 : 90;
}

function jsonArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatFeedback(feedback: typeof feedbackTable.$inferSelect) {
  return {
    ...feedback,
    strengths: jsonArray(feedback.strengths),
    weaknesses: jsonArray(feedback.weaknesses),
    suggestions: jsonArray(feedback.suggestions),
    categoryScores: jsonArray(feedback.categoryScores),
    answerBreakdown: jsonArray(feedback.answerBreakdown),
  };
}

async function ownedSession(id: string, userId: string) {
  const [session] = await db
    .select()
    .from(interviewSessionsTable)
    .where(and(
      eq(interviewSessionsTable.id, id),
      eq(interviewSessionsTable.userId, userId),
    ));
  return session;
}

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

router.post("/", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const parsed = CreateInterviewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const body = parsed.data;
    const generationInput: InterviewGenerationInput = {
      ...body,
      userId: userId!,
      questionCount: body.questionCount ?? 5,
      companyName: body.companyName || undefined,
      roundDetails: body.roundDetails || undefined,
      jobDescription: body.jobDescription || undefined,
      jobDescriptionFile: body.jobDescriptionFile,
      resumeFile: body.resumeFile,
    };
    const generated = await generateInterviewMaterials(generationInput);

    const session = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(interviewSessionsTable)
        .values({
          userId: userId!,
          jobRole: body.jobRole.trim(),
          companyName: body.companyName?.trim() || null,
          experienceLevel: body.experienceLevel,
          jobDescription: body.jobDescription?.trim() || null,
          resumeSummary: generated.candidateSummary,
          interviewRounds: body.interviewRounds,
          roundDetails: body.roundDetails?.trim() || null,
          difficulty: body.difficulty,
          questionCount: body.questionCount ?? 5,
          status: "active",
        })
        .returning();

      await tx.insert(questionsTable).values(
        generated.questions.map((question: any, index: number) => ({
          sessionId: created.id,
          sequence: index + 1,
          content: question.content,
          category: question.category,
          roundName: question.roundName,
          difficulty: question.difficulty,
          rubric: JSON.stringify(question.rubric),
          expectedSignals: JSON.stringify(question.expectedSignals),
        })),
      );

      await tx.insert(interviewPlansTable).values({
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
      });
      return created;
    });

    res.status(201).json({
      ...session,
      timeLimitSeconds: timeLimit(session.difficulty),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create dynamic interview");
    const message = err instanceof Error ? err.message : "Failed to create interview";
    res.status(message.includes("document") || message.includes("MB") ? 400 : 502)
      .json({ error: message });
  }
});

router.get("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const session = await ownedSession(req.params.id, userId!);
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
          roundName: questionsTable.roundName,
          sequence: questionsTable.sequence,
        },
      })
      .from(answersTable)
      .leftJoin(questionsTable, eq(answersTable.questionId, questionsTable.id))
      .where(eq(answersTable.sessionId, session.id))
      .orderBy(asc(questionsTable.sequence));
    const [feedback] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, session.id));
    res.json({
      ...session,
      answers,
      feedback: feedback ? formatFeedback(feedback) : null,
      timeLimitSeconds: timeLimit(session.difficulty),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get interview");
    res.status(500).json({ error: "Failed to get interview" });
  }
});

router.patch("/:id", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const existing = await ownedSession(req.params.id, userId!);
    if (!existing) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (existing.status === "completed") {
      res.json(existing);
      return;
    }
    if (existing.status !== "active") {
      res.status(409).json({ error: "Session cannot be completed in its current state" });
      return;
    }
    const [session] = await db
      .update(interviewSessionsTable)
      .set({ status: "completed", endedAt: new Date() })
      .where(eq(interviewSessionsTable.id, existing.id))
      .returning();
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to end interview");
    res.status(500).json({ error: "Failed to end interview" });
  }
});

router.get("/:id/next-question", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const session = await ownedSession(req.params.id, userId!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (session.status !== "active") {
      res.status(204).send();
      return;
    }
    const answered = await db
      .select({ questionId: answersTable.questionId })
      .from(answersTable)
      .where(eq(answersTable.sessionId, session.id));
    if (answered.length >= session.questionCount) {
      res.status(204).send();
      return;
    }
    const ids = answered.map((item) => item.questionId);
    const conditions = [eq(questionsTable.sessionId, session.id)];
    if (ids.length) conditions.push(notInArray(questionsTable.id, ids));
    const [question] = await db
      .select({
        id: questionsTable.id,
        content: questionsTable.content,
        category: questionsTable.category,
        difficulty: questionsTable.difficulty,
        roundName: questionsTable.roundName,
        sequence: questionsTable.sequence,
      })
      .from(questionsTable)
      .where(and(...conditions))
      .orderBy(asc(questionsTable.sequence))
      .limit(1);
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

router.post("/:id/answers", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const parsed = SubmitAnswerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const session = await ownedSession(req.params.id, userId!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (session.status !== "active") {
      res.status(409).json({ error: "Answers can only be submitted to an active session" });
      return;
    }
    const [question] = await db
      .select()
      .from(questionsTable)
      .where(and(
        eq(questionsTable.id, parsed.data.questionId),
        eq(questionsTable.sessionId, session.id),
      ));
    if (!question) {
      res.status(404).json({ error: "Question does not belong to this session" });
      return;
    }
    const [answer] = await db
      .insert(answersTable)
      .values({
        sessionId: session.id,
        questionId: question.id,
        response: parsed.data.response.trim(),
      })
      .returning();
    res.status(201).json(answer);
  } catch (err: any) {
    req.log.error({ err }, "Failed to submit answer");
    res.status(err?.code === "23505" ? 409 : 500)
      .json({ error: err?.code === "23505" ? "Question already answered" : "Failed to submit answer" });
  }
});

router.post("/:id/feedback", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const session = await ownedSession(req.params.id, userId!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    if (session.status !== "completed") {
      res.status(409).json({ error: "Complete the interview before generating feedback" });
      return;
    }
    const [existing] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, session.id));
    if (existing) {
      res.json(formatFeedback(existing));
      return;
    }
    const rows = await db
      .select({
        questionId: questionsTable.id,
        question: questionsTable.content,
        category: questionsTable.category,
        roundName: questionsTable.roundName,
        rubric: questionsTable.rubric,
        expectedSignals: questionsTable.expectedSignals,
        response: answersTable.response,
      })
      .from(answersTable)
      .innerJoin(questionsTable, eq(answersTable.questionId, questionsTable.id))
      .where(eq(answersTable.sessionId, session.id))
      .orderBy(asc(questionsTable.sequence));
    if (!rows.length) {
      res.status(409).json({ error: "At least one answer is required for feedback" });
      return;
    }
    const scored = await scoreInterview({
      userId: userId!,
      jobRole: session.jobRole,
      companyName: session.companyName,
      experienceLevel: session.experienceLevel,
      answers: rows.map((row) => ({
        ...row,
        rubric: jsonArray(row.rubric),
        expectedSignals: jsonArray(row.expectedSignals),
      })),
    });
    const feedback = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(feedbackTable)
        .values({
          sessionId: session.id,
          score: scored.score,
          strengths: JSON.stringify(scored.strengths),
          weaknesses: JSON.stringify(scored.weaknesses),
          suggestions: JSON.stringify(scored.suggestions),
          categoryScores: JSON.stringify(scored.categoryScores),
          answerBreakdown: JSON.stringify(scored.answerBreakdown),
          methodology: scored.methodology,
          summary: scored.summary,
        })
        .returning();
      await tx
        .update(interviewSessionsTable)
        .set({ score: scored.score })
        .where(eq(interviewSessionsTable.id, session.id));
      return created;
    });
    res.status(201).json(formatFeedback(feedback));
  } catch (err) {
    req.log.error({ err }, "Failed to generate feedback");
    res.status(502).json({ error: "Failed to generate feedback" });
  }
});

router.get("/:id/feedback", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const session = await ownedSession(req.params.id, userId!);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const [feedback] = await db
      .select()
      .from(feedbackTable)
      .where(eq(feedbackTable.sessionId, session.id));
    if (!feedback) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }
    res.json(formatFeedback(feedback));
  } catch (err) {
    req.log.error({ err }, "Failed to get feedback");
    res.status(500).json({ error: "Failed to get feedback" });
  }
});

router.post("/:id/transcribe", requireAuth, async (req: any, res: any) => {
  try {
    const { userId } = getAuth(req);
    const parsed = TranscribeAnswerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const session = await ownedSession(req.params.id, userId!);
    if (!session || session.status !== "active") {
      res.status(session ? 409 : 404).json({ error: session ? "Session is not active" : "Session not found" });
      return;
    }
    const bytes = Buffer.from(parsed.data.audioBase64, "base64");
    if (bytes.byteLength > 10 * 1024 * 1024) {
      res.status(413).json({ error: "Audio must be 10 MB or smaller" });
      return;
    }
    const extension = parsed.data.mimeType.includes("mp4") ? "m4a"
      : parsed.data.mimeType.includes("mpeg") ? "mp3" : "webm";
    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(bytes, `answer.${extension}`, { type: parsed.data.mimeType }),
      model: "gpt-4o-mini-transcribe",
      language: "en",
    });
    res.json({ transcript: transcription.text });
  } catch (err) {
    req.log.error({ err }, "Failed to transcribe answer");
    res.status(502).json({ error: "Failed to transcribe answer" });
  }
});

export default router;
