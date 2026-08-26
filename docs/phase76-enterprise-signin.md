# Phase 76 — Enterprise Sign-in Database Lookup Repair

The reported production failure occurred in `server/db.ts:getUserByEmail`, where every lookup used a case-folding SQL predicate: `LOWER("users"."email") = LOWER($1)`. The authoritative Supabase audit confirmed that the Enterprise identity exists with the expected full users projection and `userType = enterprise`.

The repair normalizes the incoming address with `trim().toLowerCase()`, performs an indexed exact lookup with `eq(users.email, normalizedEmail)` first, and retains a guarded legacy `LOWER(email)` fallback for older mixed-case records. The lookup does not modify role, userType, session, or organization authorization.

Validation passed: TypeScript, focused lookup/auth tests (5/5), full regression suite, client build, and server build. The Vite chunk-size warning remains the existing non-blocking warning. Safe live checks will verify Railway health and route reachability; no OTP, OAuth consent, payment, upload, or persistent test record was initiated.
