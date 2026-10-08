import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { interviewSessionsTable } from "./interviewSessions";
import { questionsTable } from "./questions";

export const answersTable = pgTable("answers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => interviewSessionsTable.id, { onDelete: "cascade" }),
  questionId: text("question_id")
    .notNull()
    .references(() => questionsTable.id),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("answers_session_question_unique").on(
    table.sessionId,
    table.questionId,
  ),
]);

export const insertAnswerSchema = createInsertSchema(answersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answersTable.$inferSelect;
