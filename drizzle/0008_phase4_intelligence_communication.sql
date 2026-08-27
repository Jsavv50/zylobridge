-- Phase 4 Marketplace Intelligence & Communication Additive Migration
-- Apply to PostgreSQL production database

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL UNIQUE,
  "emailEnabled" boolean NOT NULL DEFAULT true,
  "marketingEnabled" boolean NOT NULL DEFAULT false,
  "marketplaceEvents" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notification_preferences_user_idx" ON "notification_preferences" ("userId");

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "category" varchar(64) NOT NULL DEFAULT 'system',
  "referenceType" varchar(64),
  "referenceId" varchar(64),
  "isRead" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("userId", "isRead", "createdAt");

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "entityType" varchar(64) NOT NULL,
  "entityId" varchar(64) NOT NULL,
  "reminderType" varchar(64) NOT NULL,
  "scheduledFor" timestamp NOT NULL,
  "isSent" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "reminders_scheduled_idx" ON "reminders" ("isSent", "scheduledFor");
CREATE UNIQUE INDEX IF NOT EXISTS "reminders_unique_user_entity_type" ON "reminders" ("userId", "entityType", "entityId", "reminderType");

CREATE TABLE IF NOT EXISTS "matching_scores" (
  "id" serial PRIMARY KEY,
  "jobId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "structuredScore" numeric(5,2) NOT NULL,
  "semanticScore" numeric(5,2),
  "finalScore" numeric(5,2) NOT NULL,
  "explanation" text,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "matching_scores_job_prof_unique" ON "matching_scores" ("jobId", "professionalId");
CREATE INDEX IF NOT EXISTS "matching_scores_job_score_idx" ON "matching_scores" ("jobId", "finalScore");

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,8);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "longitude" numeric(11,8);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" integer DEFAULT 50;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,8);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "longitude" numeric(11,8);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" integer DEFAULT 50;
