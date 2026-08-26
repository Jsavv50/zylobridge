# Phase 81 — Rollback of Attached Instruction Set

## Scope

The attached instruction set requested a broad post-backup audit and feature expansion. Because the user requested that all changes attributable to that instruction set be reversed after continued login failure, the repository was restored to the nearest known buildable checkpoint before the enterprise reconciliation stream: `4361bc6`.

The first historical candidate, `ea10e1ed`, was not deployable in the current repository because its role declarations and authorization code produced 11 TypeScript errors. It was therefore not published. The buildable checkpoint `4361bc6` preserves the earlier stable authentication and deployment behavior while avoiding publication of a broken state.

## Restored behavior

The production frontend again uses the configured `VITE_API_URL` value for tRPC and Google authentication requests, with same-origin behavior only when that value is empty. The Vercel configuration is restored to the prior static frontend configuration with `dist/public` output and filesystem-first SPA fallback. The later same-origin proxy rewrite and Phase 80 authentication changes are no longer present.

The untracked enterprise, organization, notification, reconciliation, OAuth-transaction, and super-admin migration artifacts left outside the selected checkpoint were removed. The tracked schema was restored exactly to the selected checkpoint.

## Validation

`pnpm check` passed. The full Vitest suite passed with 12 files and 78 tests. `pnpm run build:client` passed and produced `dist/public/index.html`; Vite emitted the pre-existing non-blocking warning about a chunk larger than 500 kB. `pnpm run build:server` passed and produced `dist/index.js` at approximately 125.7 kB. A temporary `NODE_ENV=production pnpm start` process responded successfully at `/api/health` with `{"status":"ok"}` and was stopped after verification.

The production startup log still reports that `SUPABASE_JWT_SECRET` is not configured for the optional Realtime authorization bridge. This warning is inherited from the restored checkpoint and is not an authentication code change made during this rollback.
