# Zylobridge Verification-Document Canonical Storage Path Report

## Executive summary

The verification-document path mismatch was caused by `verification.submit` constructing an original filename-based key, calling `storagePut`, and then persisting the original key instead of the collision-safe key returned by Storage. Supabase Storage therefore contained a suffixed object while `verification_requests.documentKey` retained the unsuffixed filename.

The permanent fix makes the Storage response authoritative. The submit procedure now persists the exact returned `key` and returned `url` from the same upload operation, verifies that the private object exists before inserting the request, and returns a safe application error if verification fails. The Super Admin viewer validates the stored key before generating a signed URL and never reconstructs a path from an original filename.

## Implementation inventory

| Area | Implementation | Result |
|---|---|---|
| Upload key generation | `server/storage.ts` generates a collision-safe suffix and returns `{ key, url }`. Filenames are normalized to NFC and path/control separators are sanitized. | Duplicate names, spaces, punctuation, Unicode, and suffixes are handled without trusting a later filename derivation. |
| Database persistence | `server/routers.ts` stores `documentKey: canonicalKey` and `documentUrl: url`, where both values come from the same `storagePut` response. | New rows reference the exact uploaded object. |
| Pre-insert validation | `storageObjectExists(canonicalKey)` performs a private Supabase signed-URL existence check before `verification_requests` insertion. | Broken requests are rejected instead of persisted. |
| Admin viewer | `verification.adminGetDocumentUrl` validates `req.documentKey` and then signs that exact stored key. | The viewer does not derive keys from filenames or expose the bucket publicly. |
| Legacy reconciliation | `scripts/reconcile-verification-document-paths.mjs` is dry-run by default, checks `documentUrl`-derived candidates against private Storage, and updates only verified `verification_requests` rows when explicitly run with `--apply`. | Existing mismatches can be audited and reconciled without modifying `storage.objects`. |

## Security and data-handling boundaries

The `verification-documents` bucket remains private. The implementation uses the server-side Supabase admin client only and returns time-limited signed URLs to authorized admin procedures. No service-role key, signed URL, cookie, access token, document content, or database connection string is emitted by the application logic or reconciliation output.

The reconciliation script never inserts fabricated paths and never changes Storage objects. It is intentionally dry-run by default. The operator must review its candidate list and explicitly invoke `--apply` only for verified objects.

## Validation evidence

The focused verification-storage regression suite passed **7/7 tests**. The full automated suite, TypeScript validation, and client/server production build completed successfully during this change. The production Super Admin dashboard loaded the verification queue, and the production admin document endpoint returned HTTP 200 with a signed URL for a valid request. A subsequent private-object retrieval returned HTTP 200 with an image content type, confirming that the signed URL resolved to an accessible private object without exposing its URL in this report.

The production browser session already had a pending request for professional user 2489, so the UI correctly suppressed creation of a second request. Consequently, this session verified the deployed admin viewing path against an existing valid request but did not create an additional production verification row. A fresh professional account or an account with no pending request is required for a non-destructive new-upload acceptance test.

## Operator procedure for legacy audit

Run the reconciliation script from the project root in dry-run mode first:

```bash
node scripts/reconcile-verification-document-paths.mjs
```

Review the reported mismatch, resolvable, and unresolved counts. Only after confirming the candidates correspond to the intended production database and private Storage objects should the operator run:

```bash
node scripts/reconcile-verification-document-paths.mjs --apply
```

The script requires the production PostgreSQL `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the execution environment. It does not print their values.

## Final status

**Code remediation:** COMPLETE.

**Automated validation:** PASS.

**Production private signed-document viewer:** VERIFIED for an existing valid request.

**New-upload production acceptance:** PENDING a fresh professional account or a professional account without an existing pending request. This is an operator test boundary, not a remaining code-path mismatch.
