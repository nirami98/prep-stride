CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('generating', 'active', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."question_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TABLE "interview_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_role" text NOT NULL,
	"company_name" text,
	"experience_level" text DEFAULT 'mid' NOT NULL,
	"job_description" text,
	"resume_summary" text,
	"interview_rounds" integer DEFAULT 1 NOT NULL,
	"round_details" text,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"question_count" integer DEFAULT 5 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"score" real
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"round_name" text NOT NULL,
	"difficulty" "question_difficulty" DEFAULT 'medium' NOT NULL,
	"rubric" text NOT NULL,
	"expected_signals" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"question_id" text NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"score" real NOT NULL,
	"strengths" text NOT NULL,
	"weaknesses" text NOT NULL,
	"suggestions" text NOT NULL,
	"category_scores" text DEFAULT '[]' NOT NULL,
	"answer_breakdown" text DEFAULT '[]' NOT NULL,
	"methodology" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "interview_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company_name" text,
	"job_role" text NOT NULL,
	"experience_level" text DEFAULT 'mid' NOT NULL,
	"interview_rounds" integer DEFAULT 1 NOT NULL,
	"candidate_summary" text NOT NULL,
	"role_summary" text NOT NULL,
	"research_summary" text NOT NULL,
	"rounds" text NOT NULL,
	"schedule" text NOT NULL,
	"sources" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "questions_session_sequence_unique" ON "questions" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "answers_session_question_unique" ON "answers" USING btree ("session_id","question_id");