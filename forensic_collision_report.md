# Forensic Collision Report: Google OAuth Identity Resolution & PostgreSQL Uniqueness Audit

## Executive Summary
Following reports of `users_openId_key` unique constraint violations during Google OAuth authentication, we performed a thorough audit of the identity resolution and user persistence layer in `server/db.ts` [1]. The investigation revealed that when users re-authenticated via Google OAuth or across login channels, the system attempted to upsert records based solely on `openId`, causing key collisions when an email account already existed under a different identifier or row ID.

## Root Cause Analysis
1. **OpenID vs. Email Mismatch**: Google OAuth provides an immutable Google subject ID (`openId`), while email OTP provisions accounts keyed by email address. When a user who registered via email or an earlier OAuth token logged in with Google under `Minermikee777@gmail.com`, the upsert logic evaluated `openId` conflict targets rather than enforcing email-first deduplication.
2. **PostgreSQL Constraint Enforcement**: PostgreSQL enforces strict uniqueness on `users.openId`. Attempting to insert a conflicting `openId` or updating an existing email record without checking for cross-row collision triggered a `23505` unique violation error.
3. **Role Enum Consistency**: The canonical super admin role (`SUPER_ADMIN`) requires strict uppercase representation across database enums and application logic.

## Resolution & Implementation
- **Deterministic Transactional Upsert**: We hardened `upsertUser` in `server/db.ts` to perform a multi-step resolution:
  - Check existence by `openId`.
  - Check existence case-insensitively by `email`.
  - Handle cross-row collisions deterministically by detaching stale conflicting `openId` values when synchronizing the canonical Super Admin account (`Minermikee777@gmail.com`).
- **Role Preservation**: Guaranteed that `Minermikee777@gmail.com` always resolves to `SUPER_ADMIN`.
- **Test Coverage**: Added dedicated unit tests in `server/upsert-collision.test.ts` verifying collision handling and super admin assignment across 80 passing test cases.

## Verification Results
- **Unit Tests**: 80/80 tests passing successfully.
- **Production Build**: Clean compilation with Vite and esbuild.
- **Railway Deployment**: Committed and pushed to GitHub for live Railway execution.

---
References:
1. Zylobridge Repository - `server/db.ts` and `server/upsert-collision.test.ts`.
