-- Phase 5B-1 Additive Financial Core Migration
-- Implements milestones, payment transactions, payment events, ledger accounts, ledger entries, and reconciliation records.

CREATE TYPE IF NOT EXISTS "milestone_status" AS ENUM ('draft', 'funded', 'in_progress', 'submitted', 'approved', 'release_pending', 'released', 'disputed', 'cancelled');
CREATE TYPE IF NOT EXISTS "transaction_status" AS ENUM ('created', 'payment_required', 'payment_initiated', 'payment_pending', 'payment_confirmed', 'funded', 'failed', 'expired', 'refund_pending', 'refunded', 'disputed', 'cancelled');
CREATE TYPE IF NOT EXISTS "ledger_account_type" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

CREATE TABLE IF NOT EXISTS "milestones" (
  "id" serial PRIMARY KEY,
  "engagementId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "amountMinor" bigint NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" "milestone_status" NOT NULL DEFAULT 'draft',
  "dueDate" timestamp,
  "fundedAt" timestamp,
  "releasedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" serial PRIMARY KEY,
  "reference" varchar(120) NOT NULL UNIQUE,
  "engagementId" integer NOT NULL,
  "milestoneId" integer NOT NULL,
  "payerId" integer NOT NULL,
  "payeeId" integer,
  "amountMinor" bigint NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "status" "transaction_status" NOT NULL DEFAULT 'created',
  "provider" varchar(32) NOT NULL DEFAULT 'paystack',
  "providerReference" varchar(120),
  "platformFeeMinor" bigint NOT NULL DEFAULT 0,
  "metadata" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" serial PRIMARY KEY,
  "transactionId" integer,
  "provider" varchar(32) NOT NULL DEFAULT 'paystack',
  "eventType" varchar(120) NOT NULL,
  "providerEventId" varchar(120) UNIQUE,
  "rawPayload" text NOT NULL,
  "signatureValid" boolean NOT NULL DEFAULT false,
  "processed" boolean NOT NULL DEFAULT false,
  "error" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ledger_accounts" (
  "id" serial PRIMARY KEY,
  "name" varchar(128) NOT NULL UNIQUE,
  "type" "ledger_account_type" NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" serial PRIMARY KEY,
  "transactionId" integer NOT NULL,
  "accountId" integer NOT NULL,
  "debitMinor" bigint NOT NULL DEFAULT 0,
  "creditMinor" bigint NOT NULL DEFAULT 0,
  "currency" varchar(3) NOT NULL DEFAULT 'NGN',
  "description" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reconciliation_records" (
  "id" serial PRIMARY KEY,
  "transactionId" integer NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'matched',
  "discrepancyDetails" text,
  "reconciledAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "milestones_engagement_idx" ON "milestones" ("engagementId");
CREATE INDEX IF NOT EXISTS "payment_transactions_ref_idx" ON "payment_transactions" ("reference");
CREATE INDEX IF NOT EXISTS "payment_transactions_engagement_idx" ON "payment_transactions" ("engagementId");
CREATE INDEX IF NOT EXISTS "payment_events_provider_event_idx" ON "payment_events" ("providerEventId");
CREATE INDEX IF NOT EXISTS "ledger_entries_transaction_idx" ON "ledger_entries" ("transactionId");
CREATE INDEX IF NOT EXISTS "ledger_entries_account_idx" ON "ledger_entries" ("accountId");
