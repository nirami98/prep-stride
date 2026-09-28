import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const difficultyEnum = pgEnum("difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "completed",
]);

export const interviewSessionsTable = pgTable("interview_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  jobRole: text("job_role").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  status: sessionStatusEnum("status").notNull().default("active"),
  questionCount: integer("question_count").notNull().default(5),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  score: real("score"),
});

export const insertInterviewSessionSchema = createInsertSchema(
  interviewSessionsTable,
).omit({ id: true, startedAt: true });

export type InsertInterviewSession = z.infer<
  typeof insertInterviewSessionSchema
>;
export type InterviewSession = typeof interviewSessionsTable.$inferSelect;
