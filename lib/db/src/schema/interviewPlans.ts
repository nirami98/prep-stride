import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const interviewPlansTable = pgTable("interview_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  companyName: text("company_name"),
  jobRole: text("job_role").notNull(),
  experienceLevel: text("experience_level").notNull().default("mid"),
  interviewRounds: integer("interview_rounds").notNull().default(1),
  candidateSummary: text("candidate_summary").notNull(),
  roleSummary: text("role_summary").notNull(),
  researchSummary: text("research_summary").notNull(),
  rounds: text("rounds").notNull(),
  schedule: text("schedule").notNull(),
  sources: text("sources").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InterviewPlan = typeof interviewPlansTable.$inferSelect;
