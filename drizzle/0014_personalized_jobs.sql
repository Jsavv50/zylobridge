-- Phase 97: explicit job market currency and persistent professional job alerts.
-- Additive only. Existing jobs retain NULL currency so legacy amounts are not silently reinterpreted.
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "currency" varchar(3);

CREATE TABLE IF NOT EXISTS "job_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "professionalId" integer NOT NULL,
  "name" varchar(120) NOT NULL,
  "q" varchar(120),
  "vocation" varchar(64),
  "location" varchar(200),
  "currency" varchar(3),
  "isUrgentOnly" boolean DEFAULT false NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "lastNotifiedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "job_alerts_professional_active_idx" ON "job_alerts" ("professionalId", "isActive", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "job_alerts_professional_name_unique" ON "job_alerts" ("professionalId", "name");
