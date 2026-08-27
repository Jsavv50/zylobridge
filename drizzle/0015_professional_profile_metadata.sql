-- Phase 99: structured professional profile metadata
-- Additive and idempotent: preserves all existing profile rows and data.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS "profileMetadata" jsonb;

CREATE INDEX IF NOT EXISTS profiles_profile_metadata_gin_idx
  ON profiles USING gin ("profileMetadata");
