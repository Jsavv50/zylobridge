-- Phase 5B-2 Additive Financial Protection Migration
-- Implements payouts, refunds, disputes, dispute evidence, and recipient bank accounts.

CREATE TYPE IF NOT EXISTS "payout_status" AS ENUM ('payout_pending', 'payout_eligible', 'payout_initiated', 'payout_processing', 'payout_completed', 'payout_failed', 'payout_retry_pending', 'payout_reversed');
CREATE TYPE IF NOT EXISTS "refund_status" AS ENUM ('refund_pending', 'refund_processing', 'refund_completed', 'refund_failed');
CREATE TYPE IF NOT EXISTS "dispute_status" AS ENUM ('opened', 'under_review', 'evidence_requested', 'mediation', 'resolution_pending', 'resolved', 'escalated', 'closed');

CREATE TABLE IF NOT EXISTS "professional_bank_accounts" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "bankName" varchar(128) NOT NULL,
  "bankCode" varchar(32) NOT NULL,
  "accountNumber" varchar(32) NOT NULL,
  "accountName" varchar(255) NOT NULL,
  "recipientCode" varchar(128),
  "isVerified" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payouts" (
  "id" serial PRIMARY KEY,
  "reference" varchar(120) NOT NULL UNIQUE,
  "engagementId" integer NOT NULL,
  "milestoneId" integer NOT NULL,
  "professionalId" integer NOT NULL,
  "amountMinor" bigint NOT NULL,
  "platformFeeMinor" bigint NOT NULL DEFAULT 0,
  "netAmountMinor" bigint NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" "payout_status" NOT NULL DEFAULT 'payout_pending',
  "transferCode" varchar(128),
  "transferReference" varchar(120),
  "failureReason" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" serial PRIMARY KEY,
  "reference" varchar(120) NOT NULL UNIQUE,
  "transactionId" integer NOT NULL,
  "engagementId" integer NOT NULL,
  "amountMinor" bigint NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" "refund_status" NOT NULL DEFAULT 'refund_pending',
  "providerRefundId" varchar(128),
  "reason" text,
  "authorizedBy" integer NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "disputes" (
  "id" serial PRIMARY KEY,
  "engagementId" integer NOT NULL,
  "milestoneId" integer,
  "transactionId" integer,
  "initiatorId" integer NOT NULL,
  "respondentId" integer NOT NULL,
  "reason" text NOT NULL,
  "status" "dispute_status" NOT NULL DEFAULT 'opened',
  "resolution" text,
  "resolvedBy" integer,
  "resolvedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dispute_evidence" (
  "id" serial PRIMARY KEY,
  "disputeId" integer NOT NULL,
  "uploaderId" integer NOT NULL,
  "fileUrl" text NOT NULL,
  "fileKey" text,
  "description" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "professional_bank_accounts_user_idx" ON "professional_bank_accounts" ("userId");
CREATE INDEX IF NOT EXISTS "payouts_reference_idx" ON "payouts" ("reference");
CREATE INDEX IF NOT EXISTS "payouts_engagement_idx" ON "payouts" ("engagementId");
CREATE INDEX IF NOT EXISTS "refunds_reference_idx" ON "refunds" ("reference");
CREATE INDEX IF NOT EXISTS "disputes_engagement_idx" ON "disputes" ("engagementId");
CREATE INDEX IF NOT EXISTS "dispute_evidence_dispute_idx" ON "dispute_evidence" ("disputeId");
