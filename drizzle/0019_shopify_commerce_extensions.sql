DO $$ BEGIN
  CREATE TYPE commerce_request_type AS ENUM ('rental', 'service', 'training', 'digital');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE commerce_request_status AS ENUM ('submitted', 'reviewing', 'approved', 'declined', 'cancelled', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE commerce_seller_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE commerce_procurement_status AS ENUM ('draft', 'open', 'reviewing', 'awarded', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE commerce_quote_status AS ENUM ('submitted', 'accepted', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS commerce_saved_products (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "shopifyProductId" varchar(255) NOT NULL,
  "productHandle" varchar(255) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_saved_products_owner_product_uq ON commerce_saved_products ("userId", "shopifyProductId");
CREATE INDEX IF NOT EXISTS commerce_saved_products_owner_idx ON commerce_saved_products ("userId");

CREATE TABLE IF NOT EXISTS commerce_requests (
  id serial PRIMARY KEY,
  "requesterId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "shopifyProductId" varchar(255) NOT NULL,
  "productHandle" varchar(255) NOT NULL,
  "requestType" commerce_request_type NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  "startAt" timestamp,
  "endAt" timestamp,
  "serviceLocation" varchar(255),
  message text,
  status commerce_request_status NOT NULL DEFAULT 'submitted',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CHECK ("endAt" IS NULL OR "startAt" IS NULL OR "endAt" > "startAt")
);
CREATE INDEX IF NOT EXISTS commerce_requests_requester_idx ON commerce_requests ("requesterId");
CREATE INDEX IF NOT EXISTS commerce_requests_product_idx ON commerce_requests ("shopifyProductId");
CREATE INDEX IF NOT EXISTS commerce_requests_status_idx ON commerce_requests (status);

CREATE TABLE IF NOT EXISTS commerce_seller_applications (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organizationId" integer REFERENCES organizations(id) ON DELETE SET NULL,
  "businessName" varchar(255) NOT NULL,
  "sellerType" varchar(64) NOT NULL,
  country varchar(2) NOT NULL,
  description text NOT NULL,
  status commerce_seller_status NOT NULL DEFAULT 'pending',
  "reviewedBy" integer REFERENCES users(id) ON DELETE SET NULL,
  "reviewedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_seller_applications_user_uq ON commerce_seller_applications ("userId");
CREATE INDEX IF NOT EXISTS commerce_seller_applications_status_idx ON commerce_seller_applications (status);

CREATE TABLE IF NOT EXISTS commerce_procurement_requests (
  id serial PRIMARY KEY,
  "buyerId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "organizationId" integer REFERENCES organizations(id) ON DELETE SET NULL,
  title varchar(255) NOT NULL,
  description text NOT NULL,
  "deliveryLocation" varchar(255) NOT NULL,
  "neededBy" timestamp,
  currency varchar(3) NOT NULL DEFAULT 'ZAR',
  status commerce_procurement_status NOT NULL DEFAULT 'open',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_procurement_requests_buyer_idx ON commerce_procurement_requests ("buyerId");
CREATE INDEX IF NOT EXISTS commerce_procurement_requests_org_idx ON commerce_procurement_requests ("organizationId");
CREATE INDEX IF NOT EXISTS commerce_procurement_requests_status_idx ON commerce_procurement_requests (status);

CREATE TABLE IF NOT EXISTS commerce_procurement_items (
  id serial PRIMARY KEY,
  "requestId" integer NOT NULL REFERENCES commerce_procurement_requests(id) ON DELETE CASCADE,
  "shopifyProductId" varchar(255),
  "productHandle" varchar(255),
  title varchar(255) NOT NULL,
  specifications text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_procurement_items_request_idx ON commerce_procurement_items ("requestId");

CREATE TABLE IF NOT EXISTS commerce_procurement_quotes (
  id serial PRIMARY KEY,
  "requestId" integer NOT NULL REFERENCES commerce_procurement_requests(id) ON DELETE CASCADE,
  "sellerUserId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "amountMinor" bigint NOT NULL CHECK ("amountMinor" > 0),
  currency varchar(3) NOT NULL DEFAULT 'ZAR',
  "fulfillmentDays" integer NOT NULL CHECK ("fulfillmentDays" > 0),
  message text,
  status commerce_quote_status NOT NULL DEFAULT 'submitted',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_procurement_quotes_request_seller_uq ON commerce_procurement_quotes ("requestId", "sellerUserId");
CREATE INDEX IF NOT EXISTS commerce_procurement_quotes_seller_idx ON commerce_procurement_quotes ("sellerUserId");

CREATE TABLE IF NOT EXISTS commerce_access_grants (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "shopifyProductId" varchar(255) NOT NULL,
  "productHandle" varchar(255) NOT NULL,
  "grantType" varchar(32) NOT NULL,
  "resourceUrl" text,
  "expiresAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_access_grants_owner_product_uq ON commerce_access_grants ("userId", "shopifyProductId");
CREATE INDEX IF NOT EXISTS commerce_access_grants_owner_idx ON commerce_access_grants ("userId");
