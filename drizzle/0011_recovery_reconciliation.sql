-- ZYLOBRIDGE production recovery reconciliation
-- Additive only. Do not drop, reset, or recreate existing production objects.
-- The production database already uses public.job_status for marketplace jobs;
-- background_jobs therefore intentionally keeps status as varchar.

-- Missing marketplace verification and hiring objects.
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
  "id" serial PRIMARY KEY, "userId" integer NOT NULL, "title" varchar(255) NOT NULL,
  "description" text, "imageUrl" text, "imageKey" text, "projectUrl" text, "skills" text,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "professional_portfolios_user_idx" ON "professional_portfolios" ("userId");
CREATE TABLE IF NOT EXISTS "professional_qualifications" (
  "id" serial PRIMARY KEY, "userId" integer NOT NULL, "title" varchar(255) NOT NULL,
  "issuingOrg" varchar(255) NOT NULL, "issueDate" timestamp, "expiryDate" timestamp,
  "credentialId" varchar(128), "credentialUrl" text,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "professional_qualifications_user_idx" ON "professional_qualifications" ("userId");
CREATE TABLE IF NOT EXISTS "professional_experiences" (
  "id" serial PRIMARY KEY, "userId" integer NOT NULL, "companyName" varchar(255) NOT NULL,
  "title" varchar(255) NOT NULL, "location" varchar(255), "startDate" timestamp,
  "endDate" timestamp, "isCurrent" boolean NOT NULL DEFAULT false, "description" text,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "professional_experiences_user_idx" ON "professional_experiences" ("userId");
CREATE TABLE IF NOT EXISTS "professional_verifications" (
  "id" serial PRIMARY KEY, "userId" integer NOT NULL, "verificationType" "verification_category" NOT NULL,
  "status" "verification_item_status" NOT NULL DEFAULT 'pending', "documentUrl" text,
  "documentKey" text, "adminNote" text, "reviewedBy" integer, "reviewedAt" timestamp,
  "expiresAt" timestamp, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "professional_verifications_user_type_unique" ON "professional_verifications" ("userId", "verificationType");
CREATE INDEX IF NOT EXISTS "professional_verifications_status_idx" ON "professional_verifications" ("status", "createdAt");
CREATE TABLE IF NOT EXISTS "shortlists" (
  "id" serial PRIMARY KEY, "jobId" integer NOT NULL, "employerId" integer NOT NULL,
  "professionalId" integer NOT NULL, "notes" text, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "shortlists_job_professional_unique" ON "shortlists" ("jobId", "professionalId");
CREATE INDEX IF NOT EXISTS "shortlists_employer_idx" ON "shortlists" ("employerId", "createdAt");
CREATE TABLE IF NOT EXISTS "interviews" (
  "id" serial PRIMARY KEY, "jobId" integer NOT NULL, "applicationId" integer,
  "employerId" integer NOT NULL, "professionalId" integer NOT NULL, "scheduledAt" timestamp NOT NULL,
  "status" "interview_status" NOT NULL DEFAULT 'proposed', "locationOrLink" text, "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "interviews_professional_idx" ON "interviews" ("professionalId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "interviews_employer_idx" ON "interviews" ("employerId", "scheduledAt");
CREATE TABLE IF NOT EXISTS "offers" (
  "id" serial PRIMARY KEY, "jobId" integer NOT NULL, "applicationId" integer,
  "employerId" integer NOT NULL, "professionalId" integer NOT NULL, "compensation" numeric(12,2) NOT NULL,
  "roleDescription" text NOT NULL, "startDate" timestamp NOT NULL, "duration" varchar(128),
  "status" "offer_status" NOT NULL DEFAULT 'pending', "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "offers_professional_idx" ON "offers" ("professionalId", "status");
CREATE INDEX IF NOT EXISTS "offers_employer_idx" ON "offers" ("employerId", "status");
CREATE TABLE IF NOT EXISTS "engagements" (
  "id" serial PRIMARY KEY, "jobId" integer NOT NULL, "offerId" integer,
  "employerId" integer NOT NULL, "professionalId" integer NOT NULL, "compensation" numeric(12,2) NOT NULL,
  "status" "engagement_status" NOT NULL DEFAULT 'active', "startDate" timestamp NOT NULL,
  "endDate" timestamp, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "engagements_professional_idx" ON "engagements" ("professionalId", "status");
CREATE INDEX IF NOT EXISTS "engagements_employer_idx" ON "engagements" ("employerId", "status");

-- Missing intelligence and notification preference objects.
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" serial PRIMARY KEY, "userId" integer NOT NULL UNIQUE, "emailEnabled" boolean NOT NULL DEFAULT true,
  "marketingEnabled" boolean NOT NULL DEFAULT false, "marketplaceEvents" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notification_preferences_user_idx" ON "notification_preferences" ("userId");
CREATE TABLE IF NOT EXISTS "reminders" (
  "id" serial PRIMARY KEY, "userId" integer NOT NULL, "entityType" varchar(64) NOT NULL,
  "entityId" varchar(64) NOT NULL, "reminderType" varchar(64) NOT NULL, "scheduledFor" timestamp NOT NULL,
  "isSent" boolean NOT NULL DEFAULT false, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "reminders_scheduled_idx" ON "reminders" ("isSent", "scheduledFor");
CREATE UNIQUE INDEX IF NOT EXISTS "reminders_unique_user_entity_type" ON "reminders" ("userId", "entityType", "entityId", "reminderType");
CREATE TABLE IF NOT EXISTS "matching_scores" (
  "id" serial PRIMARY KEY, "jobId" integer NOT NULL, "professionalId" integer NOT NULL,
  "structuredScore" numeric(5,2) NOT NULL, "semanticScore" numeric(5,2), "finalScore" numeric(5,2) NOT NULL,
  "explanation" text, "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "matching_scores_job_prof_unique" ON "matching_scores" ("jobId", "professionalId");
CREATE INDEX IF NOT EXISTS "matching_scores_job_score_idx" ON "matching_scores" ("jobId", "finalScore");
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,8);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "longitude" numeric(11,8);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" integer DEFAULT 50;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,8);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "longitude" numeric(11,8);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" integer DEFAULT 50;

-- Missing financial core.
DO $$ BEGIN
  CREATE TYPE "milestone_status" AS ENUM ('draft', 'funded', 'in_progress', 'submitted', 'approved', 'release_pending', 'released', 'disputed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "transaction_status" AS ENUM ('created', 'payment_required', 'payment_initiated', 'payment_pending', 'payment_confirmed', 'funded', 'failed', 'expired', 'refund_pending', 'refunded', 'disputed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "ledger_account_type" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "milestones" (
  "id" serial PRIMARY KEY, "engagementId" integer NOT NULL, "title" varchar(255) NOT NULL,
  "description" text, "amountMinor" bigint NOT NULL, "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" "milestone_status" NOT NULL DEFAULT 'draft', "dueDate" timestamp, "fundedAt" timestamp,
  "releasedAt" timestamp, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "milestones_engagement_idx" ON "milestones" ("engagementId");
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" serial PRIMARY KEY, "reference" varchar(120) NOT NULL UNIQUE, "engagementId" integer NOT NULL,
  "milestoneId" integer NOT NULL, "payerId" integer NOT NULL, "payeeId" integer, "amountMinor" bigint NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN', "status" "transaction_status" NOT NULL DEFAULT 'created',
  "provider" varchar(32) NOT NULL DEFAULT 'paystack', "providerReference" varchar(120),
  "platformFeeMinor" bigint NOT NULL DEFAULT 0, "metadata" text, "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payment_transactions_ref_idx" ON "payment_transactions" ("reference");
CREATE INDEX IF NOT EXISTS "payment_transactions_engagement_idx" ON "payment_transactions" ("engagementId");
CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" serial PRIMARY KEY, "transactionId" integer, "provider" varchar(32) NOT NULL DEFAULT 'paystack',
  "eventType" varchar(120) NOT NULL, "providerEventId" varchar(120) UNIQUE, "rawPayload" text NOT NULL,
  "signatureValid" boolean NOT NULL DEFAULT false, "processed" boolean NOT NULL DEFAULT false, "error" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payment_events_provider_event_idx" ON "payment_events" ("providerEventId");
CREATE TABLE IF NOT EXISTS "ledger_accounts" (
  "id" serial PRIMARY KEY, "name" varchar(128) NOT NULL UNIQUE, "type" "ledger_account_type" NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN', "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" serial PRIMARY KEY, "transactionId" integer NOT NULL, "accountId" integer NOT NULL,
  "debitMinor" bigint NOT NULL DEFAULT 0, "creditMinor" bigint NOT NULL DEFAULT 0,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN', "description" text, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ledger_entries_transaction_idx" ON "ledger_entries" ("transactionId");
CREATE INDEX IF NOT EXISTS "ledger_entries_account_idx" ON "ledger_entries" ("accountId");
CREATE TABLE IF NOT EXISTS "reconciliation_records" (
  "id" serial PRIMARY KEY, "transactionId" integer NOT NULL, "status" varchar(32) NOT NULL DEFAULT 'matched',
  "discrepancyDetails" text, "reconciledAt" timestamp NOT NULL DEFAULT now()
);

-- Missing payouts, refunds, and dispute objects.
DO $$ BEGIN
  CREATE TYPE "payout_status" AS ENUM ('payout_pending', 'payout_eligible', 'payout_initiated', 'payout_processing', 'payout_completed', 'payout_failed', 'payout_retry_pending', 'payout_reversed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "refund_status" AS ENUM ('refund_pending', 'refund_processing', 'refund_completed', 'refund_failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "dispute_status" AS ENUM ('opened', 'under_review', 'evidence_requested', 'mediation', 'resolution_pending', 'resolved', 'escalated', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "professional_bank_accounts" (
  "id" serial PRIMARY KEY, "userId" integer NOT NULL, "bankName" varchar(128) NOT NULL,
  "bankCode" varchar(32) NOT NULL, "accountNumber" varchar(32) NOT NULL, "accountName" varchar(255) NOT NULL,
  "recipientCode" varchar(128), "isVerified" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "professional_bank_accounts_user_idx" ON "professional_bank_accounts" ("userId");
CREATE TABLE IF NOT EXISTS "payouts" (
  "id" serial PRIMARY KEY, "reference" varchar(120) NOT NULL UNIQUE, "engagementId" integer NOT NULL,
  "milestoneId" integer NOT NULL, "professionalId" integer NOT NULL, "amountMinor" bigint NOT NULL,
  "platformFeeMinor" bigint NOT NULL DEFAULT 0, "netAmountMinor" bigint NOT NULL, "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" "payout_status" NOT NULL DEFAULT 'payout_pending', "transferCode" varchar(128),
  "transferReference" varchar(120), "failureReason" text, "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payouts_reference_idx" ON "payouts" ("reference");
CREATE INDEX IF NOT EXISTS "payouts_engagement_idx" ON "payouts" ("engagementId");
CREATE TABLE IF NOT EXISTS "refunds" (
  "id" serial PRIMARY KEY, "reference" varchar(120) NOT NULL UNIQUE, "transactionId" integer NOT NULL,
  "engagementId" integer NOT NULL, "amountMinor" bigint NOT NULL, "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" "refund_status" NOT NULL DEFAULT 'refund_pending', "providerRefundId" varchar(128), "reason" text,
  "authorizedBy" integer NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "refunds_reference_idx" ON "refunds" ("reference");
CREATE TABLE IF NOT EXISTS "disputes" (
  "id" serial PRIMARY KEY, "engagementId" integer NOT NULL, "milestoneId" integer, "transactionId" integer,
  "initiatorId" integer NOT NULL, "respondentId" integer NOT NULL, "reason" text NOT NULL,
  "status" "dispute_status" NOT NULL DEFAULT 'opened', "resolution" text, "resolvedBy" integer,
  "resolvedAt" timestamp, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "disputes_engagement_idx" ON "disputes" ("engagementId");
CREATE TABLE IF NOT EXISTS "dispute_evidence" (
  "id" serial PRIMARY KEY, "disputeId" integer NOT NULL, "uploaderId" integer NOT NULL,
  "fileUrl" text NOT NULL, "fileKey" text, "description" text, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "dispute_evidence_dispute_idx" ON "dispute_evidence" ("disputeId");
DO $$ BEGIN
  CREATE TYPE "engagement_dispute_status" AS ENUM ('opened', 'under_review', 'evidence_requested', 'mediation', 'resolution_pending', 'resolved', 'escalated', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "engagement_disputes" (
  "id" serial PRIMARY KEY, "engagementId" integer NOT NULL, "milestoneId" integer, "transactionId" integer,
  "initiatorId" integer NOT NULL, "respondentId" integer NOT NULL, "reason" text NOT NULL,
  "status" "engagement_dispute_status" NOT NULL DEFAULT 'opened', "resolution" text, "resolvedBy" integer,
  "resolvedAt" timestamp, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "engagement_disputes_engagement_idx" ON "engagement_disputes" ("engagementId");

-- Missing OAuth persistence, notification delivery, and queue objects.
CREATE TABLE IF NOT EXISTS "oauth_transactions" (
  "id" serial PRIMARY KEY, "requestId" varchar(32) NOT NULL, "stateHash" varchar(64) NOT NULL UNIQUE,
  "authCodeHash" varchar(64), "status" varchar(32) NOT NULL DEFAULT 'initiated', "userId" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(), "expiresAt" timestamp NOT NULL, "completedAt" timestamp
);
CREATE INDEX IF NOT EXISTS "oauth_transactions_state_hash_idx" ON "oauth_transactions" ("stateHash");
CREATE INDEX IF NOT EXISTS "oauth_transactions_auth_code_hash_idx" ON "oauth_transactions" ("authCodeHash");
CREATE TABLE IF NOT EXISTS "notification_delivery_logs" (
  "id" serial PRIMARY KEY, "notificationId" integer, "userId" integer NOT NULL,
  "channel" varchar(32) NOT NULL, "status" varchar(32) NOT NULL DEFAULT 'pending', "payload" text,
  "errorMessage" text, "retryCount" integer NOT NULL DEFAULT 0, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notification_delivery_logs_user_idx" ON "notification_delivery_logs" ("userId");
CREATE INDEX IF NOT EXISTS "notification_delivery_logs_status_idx" ON "notification_delivery_logs" ("status");
CREATE TABLE IF NOT EXISTS "background_jobs" (
  "id" serial PRIMARY KEY, "taskKey" varchar(128) NOT NULL UNIQUE, "taskType" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'pending', "payload" text, "result" text, "errorMessage" text,
  "retryCount" integer NOT NULL DEFAULT 0, "maxRetries" integer NOT NULL DEFAULT 3,
  "nextRunAt" timestamp NOT NULL DEFAULT now(), "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "background_jobs_task_key_idx" ON "background_jobs" ("taskKey");
CREATE INDEX IF NOT EXISTS "background_jobs_status_run_idx" ON "background_jobs" ("status", "nextRunAt");
