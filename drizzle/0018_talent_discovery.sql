CREATE TABLE IF NOT EXISTS "saved_professionals" (
  "id" serial PRIMARY KEY NOT NULL,
  "employerId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_professionals_employer_professional_unique"
  ON "saved_professionals" ("employerId", "professionalId");
CREATE INDEX IF NOT EXISTS "saved_professionals_employer_created_at_idx"
  ON "saved_professionals" ("employerId", "createdAt");

CREATE TABLE IF NOT EXISTS "job_invitations" (
  "id" serial PRIMARY KEY NOT NULL,
  "jobId" integer NOT NULL,
  "employerId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "message" text,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "job_invitations_active_job_professional_unique"
  ON "job_invitations" ("jobId", "professionalId")
  WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "job_invitations_employer_created_at_idx"
  ON "job_invitations" ("employerId", "createdAt");
CREATE INDEX IF NOT EXISTS "job_invitations_professional_status_idx"
  ON "job_invitations" ("professionalId", "status", "createdAt");

