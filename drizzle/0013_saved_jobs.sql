-- Phase 96: Add real professional saved-job persistence.
-- Additive only: existing jobs, applications, and users are untouched.
CREATE TABLE IF NOT EXISTS "saved_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "jobId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_jobs_job_professional_unique"
  ON "saved_jobs" ("jobId", "professionalId");
CREATE INDEX IF NOT EXISTS "saved_jobs_professional_created_at_idx"
  ON "saved_jobs" ("professionalId", "createdAt");
