-- Zylobridge enterprise reconciliation migration.
-- This migration is additive and does not rewrite or remove existing records.

-- Preserve compatibility with the recovered production role labels.
ALTER TYPE role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'enterprise';

ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'closed';

ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'shortlisted';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'interview';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'hired';

ALTER TYPE organization_role ADD VALUE IF NOT EXISTS 'PROJECT_MANAGER';
ALTER TYPE organization_role ADD VALUE IF NOT EXISTS 'FINANCE_MANAGER';
ALTER TYPE organization_role ADD VALUE IF NOT EXISTS 'VIEWER';

ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'bricklayer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'mason';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'tiler';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'roofer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'welder';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'steel_fixer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'scaffolder';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'plasterer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'drywall_installer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'flooring_installer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'general_laborer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'construction_supervisor';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'site_manager';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'quantity_surveyor';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'civil_engineer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'structural_engineer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'architect';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'cleaner';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'gardener';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'landscaper';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'security_guard';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'cctv_technician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'maintenance_technician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'handyman';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'pool_technician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'facilities_manager';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'mechanic';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'auto_electrician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'diesel_mechanic';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'machine_operator';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'forklift_operator';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'generator_technician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'solar_technician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'refrigeration_technician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'domestic_worker';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'nanny';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'caregiver';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'cook';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'baker';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'hairdresser';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'barber';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'makeup_artist';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'tailor';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'fashion_designer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'driver';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'delivery_driver';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'truck_driver';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'courier';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'warehouse_worker';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'logistics_coordinator';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'dispatcher';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'graphic_designer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'web_developer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'software_developer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'it_support_specialist';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'network_technician';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'digital_marketer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'photographer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'videographer';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'bookkeeper';
ALTER TYPE vocation ADD VALUE IF NOT EXISTS 'administrative_assistant';

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "logoUrl" text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "logoKey" text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "coverImageUrl" text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "coverImageKey" text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry varchar(160);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "companySize" varchar(80);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "yearEstablished" integer;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website varchar(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "businessEmail" varchar(320);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "businessPhone" varchar(40);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS location varchar(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "operatingRegions" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "socialLinks" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "registrationNumber" varchar(160);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "verificationStatus" verification_status NOT NULL DEFAULT 'pending';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "verificationNote" text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "verificationReviewedAt" timestamp;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS "verificationReviewedBy" integer REFERENCES users(id);

ALTER TABLE organization_projects ADD COLUMN IF NOT EXISTS location varchar(255);
ALTER TABLE organization_projects ADD COLUMN IF NOT EXISTS budget numeric(12,2);
ALTER TABLE organization_projects ADD COLUMN IF NOT EXISTS "startDate" timestamp;
ALTER TABLE organization_projects ADD COLUMN IF NOT EXISTS "endDate" timestamp;

CREATE TABLE IF NOT EXISTS organization_verification_requests (
  id serial PRIMARY KEY,
  "organizationId" integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "submittedByUserId" integer NOT NULL REFERENCES users(id),
  "documentType" varchar(100) NOT NULL,
  "documentKey" text NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  "adminNote" text,
  "reviewedAt" timestamp,
  "reviewedBy" integer REFERENCES users(id),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workforce_assignment_status') THEN
    CREATE TYPE workforce_assignment_status AS ENUM ('assigned', 'active', 'completed', 'removed');
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS organization_workforce_assignments (
  id serial PRIMARY KEY,
  "organizationId" integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  "projectId" integer REFERENCES organization_projects(id) ON DELETE SET NULL,
  "jobId" integer REFERENCES jobs(id) ON DELETE SET NULL,
  "professionalId" integer NOT NULL REFERENCES users(id),
  "assignedByUserId" integer NOT NULL REFERENCES users(id),
  status workforce_assignment_status NOT NULL DEFAULT 'assigned',
  "startedAt" timestamp,
  "endedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Existing jobs already contain the recovered optional organization/project fields.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "organizationId" integer REFERENCES organizations(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "projectId" integer REFERENCES organization_projects(id);

CREATE UNIQUE INDEX IF NOT EXISTS applications_job_professional_unique ON applications("jobId", "professionalId");
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_unique ON organization_members("organizationId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique ON organizations(slug);
CREATE INDEX IF NOT EXISTS organization_members_user_status_idx ON organization_members("userId", status);
CREATE INDEX IF NOT EXISTS organization_projects_org_status_idx ON organization_projects("organizationId", status);
CREATE INDEX IF NOT EXISTS organization_verification_requests_org_status_idx ON organization_verification_requests("organizationId", status);
CREATE INDEX IF NOT EXISTS workforce_assignments_org_status_idx ON organization_workforce_assignments("organizationId", status);
CREATE INDEX IF NOT EXISTS workforce_assignments_professional_status_idx ON organization_workforce_assignments("professionalId", status);
CREATE INDEX IF NOT EXISTS notifications_user_created_at_idx ON notifications("userId", "createdAt");

-- The API uses server-side authorization. Remove public execution from the
-- legacy RLS helper that was exposed through PostgREST.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
