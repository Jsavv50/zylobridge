-- Phase 61: reconcile the canonical jobs location columns with production.
-- Additive and idempotent: safe when columns were already created manually or by 0008.
-- Apply only to the PostgreSQL database used by the production backend.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,8);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "longitude" numeric(11,8);
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" integer DEFAULT 50;
