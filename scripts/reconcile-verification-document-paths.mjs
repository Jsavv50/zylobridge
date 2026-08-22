#!/usr/bin/env node

/**
 * Reconcile legacy verification_requests rows after Storage added collision-safe
 * filename suffixes. This script never touches storage.objects and is dry-run by
 * default. Use --apply only after reviewing the printed plan.
 */
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");

if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
  throw new Error("DATABASE_URL, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizeKey(value) {
  return decodeURIComponent(value)
    .replace(/^\/+/, "")
    .replace(/^supabase:\/\/verification-documents\//, "")
    .replace(/^verification-documents\//, "");
}

function keyFromDocumentUrl(documentUrl) {
  if (!documentUrl) return null;
  const marker = "verification-docs/";
  const markerIndex = documentUrl.indexOf(marker);
  if (markerIndex >= 0) return normalizeKey(documentUrl.slice(markerIndex));
  const bucketMarker = "/verification-documents/";
  const bucketIndex = documentUrl.indexOf(bucketMarker);
  if (bucketIndex >= 0) return normalizeKey(documentUrl.slice(bucketIndex + bucketMarker.length));
  return null;
}

function canonicalDocumentUrl(key) {
  return `supabase://verification-documents/${key}`;
}

async function objectExists(key) {
  const { data, error } = await supabase.storage
    .from("verification-documents")
    .createSignedUrl(key, 60);
  return !error && Boolean(data?.signedUrl);
}

const rows = await sql`
  SELECT id, "userId", "documentKey", "documentUrl"
  FROM verification_requests
  ORDER BY id
`;

const candidates = [];
for (const row of rows) {
  const urlKey = keyFromDocumentUrl(row.documentUrl);
  const storedKey = normalizeKey(row.documentKey || "");
  if (!urlKey || urlKey === storedKey) continue;
  candidates.push({
    id: row.id,
    userId: row.userId,
    oldKey: storedKey,
    canonicalKey: urlKey,
    canonicalUrl: canonicalDocumentUrl(urlKey),
    exists: await objectExists(urlKey),
  });
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  scanned: rows.length,
  mismatches: candidates.length,
  resolvable: candidates.filter(item => item.exists).length,
  unresolved: candidates.filter(item => !item.exists).length,
  records: candidates.map(({ id, userId, oldKey, canonicalKey, exists }) => ({ id, userId, oldKey, canonicalKey, exists })),
}, null, 2));

if (apply) {
  for (const item of candidates) {
    if (!item.exists) continue;
    await sql`
      UPDATE verification_requests
      SET "documentKey" = ${item.canonicalKey},
          "documentUrl" = ${item.canonicalUrl},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${item.id}
        AND "documentKey" = ${item.oldKey}
    `;
  }
  console.log(`Applied ${candidates.filter(item => item.exists).length} verified reconciliation updates.`);
} else {
  console.log("Dry run only. Re-run with --apply after reviewing the candidate list.");
}

await sql.end({ timeout: 5 });
