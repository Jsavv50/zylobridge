DO $$
BEGIN
  CREATE TYPE "onboarding_status" AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "onboardingStatus" "onboarding_status" DEFAULT 'not_started' NOT NULL,
  ADD COLUMN IF NOT EXISTS "onboardingStep" integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS "onboardingRevision" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "additionalUserTypes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "onboardingData" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" timestamp;

UPDATE "users"
SET
  "onboardingStatus" = 'completed',
  "onboardingStep" = 4,
  "onboardingCompletedAt" = COALESCE("onboardingCompletedAt", "updatedAt", "createdAt")
WHERE "userType" <> 'unset'::"user_type"
  AND "onboardingStatus" <> 'completed'::"onboarding_status";

UPDATE "users"
SET
  "onboardingStatus" = 'not_started',
  "onboardingStep" = 1,
  "onboardingCompletedAt" = NULL
WHERE "userType" = 'unset'::"user_type"
  AND "onboardingStatus" = 'completed'::"onboarding_status";

CREATE INDEX IF NOT EXISTS "users_onboarding_status_step_idx"
  ON "users" ("onboardingStatus", "onboardingStep");
