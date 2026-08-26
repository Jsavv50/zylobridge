-- Phase 62: reconcile production profile location columns.
-- This migration is additive and safe when the columns already exist.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "latitude" numeric;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "longitude" numeric;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" numeric DEFAULT 50;

-- A read-only production audit confirmed no duplicate userId groups before this
-- unique index was added to the version-controlled migration.
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_user_id_unique" ON "profiles" ("userId");

-- Verification query:
-- SELECT "userId", COUNT(*) AS profile_count
-- FROM "profiles"
-- GROUP BY "userId"
-- HAVING COUNT(*) > 1;
