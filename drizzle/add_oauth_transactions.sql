-- Additive migration for OAuth transactions table
CREATE TABLE IF NOT EXISTS "oauth_transactions" (
  "id" SERIAL PRIMARY KEY,
  "requestId" VARCHAR(32) NOT NULL,
  "stateHash" VARCHAR(64) NOT NULL UNIQUE,
  "authCodeHash" VARCHAR(64),
  "status" VARCHAR(32) DEFAULT 'initiated' NOT NULL,
  "userId" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "completedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "oauth_transactions_state_hash_idx" ON "oauth_transactions" ("stateHash");
CREATE INDEX IF NOT EXISTS "oauth_transactions_auth_code_hash_idx" ON "oauth_transactions" ("authCodeHash");
