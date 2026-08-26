-- Phase 2C: Enterprise organization foundation
-- Additive and non-destructive. Apply only to the Railway/Supabase PostgreSQL database.

DO $$ BEGIN
  CREATE TYPE "organization_role" AS ENUM ('OWNER', 'ADMIN', 'HIRING_MANAGER', 'RECRUITER', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "organization_member_status" AS ENUM ('active', 'suspended', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "organization_invitation_status" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "organization_project_status" AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "organizationId" integer;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "projectId" integer;

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" serial PRIMARY KEY,
  "ownerId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(120) NOT NULL,
  "description" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_unique" ON "organizations" ("slug");
CREATE INDEX IF NOT EXISTS "organizations_owner_created_at_idx" ON "organizations" ("ownerId", "createdAt");

CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" serial PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "userId" integer NOT NULL,
  "role" "organization_role" NOT NULL DEFAULT 'MEMBER',
  "status" "organization_member_status" NOT NULL DEFAULT 'active',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_organization_user_unique" ON "organization_members" ("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "organization_members_organization_status_idx" ON "organization_members" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "organization_members_user_status_idx" ON "organization_members" ("userId", "status");

CREATE TABLE IF NOT EXISTS "organization_invitations" (
  "id" serial PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "inviterUserId" integer NOT NULL,
  "email" varchar(320) NOT NULL,
  "role" "organization_role" NOT NULL DEFAULT 'MEMBER',
  "tokenHash" varchar(64) NOT NULL,
  "status" "organization_invitation_status" NOT NULL DEFAULT 'pending',
  "expiresAt" timestamp NOT NULL,
  "acceptedByUserId" integer,
  "acceptedAt" timestamp,
  "rejectedAt" timestamp,
  "cancelledAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_invitations_token_hash_unique" ON "organization_invitations" ("tokenHash");
CREATE INDEX IF NOT EXISTS "organization_invitations_organization_status_idx" ON "organization_invitations" ("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "organization_invitations_email_status_idx" ON "organization_invitations" ("email", "status");

CREATE TABLE IF NOT EXISTS "organization_projects" (
  "id" serial PRIMARY KEY,
  "organizationId" integer NOT NULL,
  "createdById" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" "organization_project_status" NOT NULL DEFAULT 'active',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "organization_projects_organization_status_idx" ON "organization_projects" ("organizationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "jobs_organization_created_at_idx" ON "jobs" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "jobs_project_created_at_idx" ON "jobs" ("projectId", "createdAt");
