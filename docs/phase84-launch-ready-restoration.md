# Phase 84 — Launch-Ready Restoration and Super Admin Sign-in Repair

## Restoration target

The repository was restored to checkpoint `7955248`, the earlier release whose checkpoint record documented final production verification with 140 automated tests and clean client/server production builds. This release was selected over the older `4361bc6` rollback baseline because it contains the broader launch-ready marketplace, administrative, enterprise, messaging, notification, and payment-readiness work.

The restoration does not alter the Supabase/Railway database, credentials, or stored user records. It restores application source and deployment configuration only.

## Sign-in repair

The restored release used a case-insensitive `LOWER(email)` predicate for every user lookup. On a populated PostgreSQL users table, this can force a scan and make Google OAuth or email sign-in appear to hang during the database stage. `server/db.ts` now trims and lowercases the input, attempts indexed equality against the canonical normalized email first, and retains a guarded `LOWER(email)` fallback for legacy mixed-case rows. Super Admin role preservation remains based on the normalized `minermikee777@gmail.com` identity and continues to use the canonical `SUPER_ADMIN` enum value.

The Google OAuth route still constructs the callback at `https://api.zylobridge.com/api/auth/google/callback` in production, sets an HttpOnly session cookie, and returns the browser to the configured frontend. No password, OTP, payment, or production record was created by this repair.

## Validation

TypeScript validation passed. The full Vitest suite and the added Super Admin lookup regression coverage passed. The Vite client build and Node/Express server build passed. A temporary production server returned `{"status":"ok"}` from `/api/health`; the live Railway health endpoint returned status ok; and the live Vercel frontend returned HTTP 200. Vite emitted only the existing chunk-size warning.
