-- Phase 3 Core Hiring Marketplace & Professional Verification Additive Migration
-- Apply to PostgreSQL production database

DO $$ BEGIN
  CREATE TYPE "verification_category" AS ENUM ('email', 'phone', 'identity', 'qualification', 'certification', 'work_history', 'reference', 'portfolio');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "verification_item_status" AS ENUM ('pending', 'under_review', 'verified', 'rejected', 'expired', 'resubmission_required');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "interview_status" AS ENUM ('proposed', 'confirmed', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "offer_status" AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "engagement_status" AS ENUM ('active', 'completed', 'cancelled', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "job_status" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "job_status" ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE "job_status" ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE "job_status" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "job_status" ADD VALUE IF NOT EXISTS 'filled';

ALTER TYPE "application_status" ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE "application_status" ADD VALUE IF NOT EXISTS 'reviewing';
ALTER TYPE "application_status" ADD VALUE IF NOT EXISTS 'shortlisted';
ALTER TYPE "application_status" ADD VALUE IF NOT EXISTS 'interview';
ALTER TYPE "application_status" ADD VALUE IF NOT EXISTS 'offer';
ALTER TYPE "application_status" ADD VALUE IF NOT EXISTS 'hired';

CREATE TABLE IF NOT EXISTS "professional_portfolios" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "imageUrl" text,
  "imageKey" text,
  "projectUrl" text,
  "skills" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "professional_portfolios_user_idx" ON "professional_portfolios" ("userId");

CREATE TABLE IF NOT EXISTS "professional_qualifications" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "issuingOrg" varchar(255) NOT NULL,
  "issueDate" timestamp,
  "expiryDate" timestamp,
  "credentialId" varchar(128),
  "credentialUrl" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "professional_qualifications_user_idx" ON "professional_qualifications" ("userId");

CREATE TABLE IF NOT EXISTS "professional_experiences" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "companyName" varchar(255) NOT NULL,
  "title" varchar(255) NOT NULL,
  "location" varchar(255),
  "startDate" timestamp,
  "endDate" timestamp,
  "isCurrent" boolean NOT NULL DEFAULT false,
  "description" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "professional_experiences_user_idx" ON "professional_experiences" ("userId");

CREATE TABLE IF NOT EXISTS "professional_verifications" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "verificationType" "verification_category" NOT NULL,
  "status" "verification_item_status" NOT NULL DEFAULT 'pending',
  "documentUrl" text,
  "documentKey" text,
  "adminNote" text,
  "reviewedBy" integer,
  "reviewedAt" timestamp,
  "expiresAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "professional_verifications_user_type_unique" ON "professional_verifications" ("userId", "verificationType");
CREATE INDEX IF NOT EXISTS "professional_verifications_status_idx" ON "professional_verifications" ("status", "createdAt");

CREATE TABLE IF NOT EXISTS "shortlists" (
  "id" serial PRIMARY KEY,
  "jobId" integer NOT NULL,
  "employerId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "shortlists_job_professional_unique" ON "shortlists" ("jobId", "professionalId");
CREATE INDEX IF NOT EXISTS "shortlists_employer_idx" ON "shortlists" ("employerId", "createdAt");

CREATE TABLE IF NOT EXISTS "interviews" (
  "id" serial PRIMARY KEY,
  "jobId" integer NOT NULL,
  "applicationId" integer,
  "employerId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "scheduledAt" timestamp NOT NULL,
  "status" "interview_status" NOT NULL DEFAULT 'proposed',
  "locationOrLink" text,
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "interviews_professional_idx" ON "interviews" ("professionalId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "interviews_employer_idx" ON "interviews" ("employerId", "scheduledAt");

CREATE TABLE IF NOT EXISTS "offers" (
  "id" serial PRIMARY KEY,
  "jobId" integer NOT NULL,
  "applicationId" integer,
  "employerId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "compensation" numeric(12,2) NOT NULL,
  "roleDescription" text NOT NULL,
  "startDate" timestamp NOT NULL,
  "duration" varchar(128),
  "status" "offer_status" NOT NULL DEFAULT 'pending',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "offers_professional_idx" ON "offers" ("professionalId", "status");
CREATE INDEX IF NOT EXISTS "offers_employer_idx" ON "offers" ("employerId", "status");

CREATE TABLE IF NOT EXISTS "engagements" (
  "id" serial PRIMARY KEY,
  "jobId" integer NOT NULL,
  "offerId" integer,
  "employerId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "compensation" numeric(12,2) NOT NULL,
  "status" "engagement_status" NOT NULL DEFAULT 'active',
  "startDate" timestamp NOT NULL,
  "endDate" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "engagements_professional_idx" ON "engagements" ("professionalId", "status");
CREATE INDEX IF NOT EXISTS "engagements_employer_idx" ON "engagements" ("employerId", "status");
