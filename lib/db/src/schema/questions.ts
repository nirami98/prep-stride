import {
  pgTable,
  text,
  pgEnum,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { interviewSessionsTable } from "./interviewSessions";

export const questionDifficultyEnum = pgEnum("question_difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const questionsTable = pgTable("questions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => interviewSessionsTable.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  roundName: text("round_name").notNull(),
  difficulty: questionDifficultyEnum("difficulty").notNull().default("medium"),
  rubric: text("rubric").notNull(),
  expectedSignals: text("expected_signals").notNull(),
}, (table) => [
  uniqueIndex("questions_session_sequence_unique").on(
    table.sessionId,
    table.sequence,
  ),
]);

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({
  id: true,
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
