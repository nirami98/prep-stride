import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { interviewSessionsTable } from "./interviewSessions";

export const feedbackTable = pgTable("feedback", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .unique()
    .references(() => interviewSessionsTable.id, { onDelete: "cascade" }),
  score: real("score").notNull(),
  strengths: text("strengths").notNull(),
  weaknesses: text("weaknesses").notNull(),
  suggestions: text("suggestions").notNull(),
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type FeedbackRow = typeof feedbackTable.$inferSelect;
