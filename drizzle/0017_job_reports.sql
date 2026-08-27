-- Phase 29: validated, ownership-scoped Job Details reports.
-- Additive and idempotent; preserves all existing marketplace data.
CREATE TABLE IF NOT EXISTS "job_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "jobId" integer NOT NULL,
  "reporterId" integer NOT NULL,
  "reason" varchar(64) NOT NULL,
  "details" text,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_reports_job_reporter_unique" ON "job_reports" ("jobId", "reporterId");
CREATE INDEX IF NOT EXISTS "job_reports_job_status_idx" ON "job_reports" ("jobId", "status");
