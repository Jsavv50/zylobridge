// Uploads via Forge Server presigned URL to S3 (PUT direct) or Supabase Storage.
// Downloads return /manus-storage/{key} paths served via 307 redirect or Supabase signed URLs.

import { ENV } from "./_core/env";
import { getSupabaseAdmin } from "./_core/supabase";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  // If this is a verification document and Supabase Storage is available, store in Supabase private bucket `verification-documents`
  if (relKey.startsWith("verification-docs/")) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const key = appendHashSuffix(normalizeKey(relKey));
      const buffer = typeof data === "string" ? Buffer.from(data) : data;
      const { error } = await supabase.storage
        .from("verification-documents")
        .upload(key, buffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase verification storage upload failed: ${error.message}`);
      }

      return { key, url: `supabase://verification-documents/${key}` };
    }
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  // If this is a Supabase Storage object in verification-documents
  if (key.startsWith("verification-docs/") || key.includes("verification-")) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      // Extract key relative to verification-documents bucket if stored as supabase://
      const cleanKey = key.replace(/^verification-documents\//, "");
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(cleanKey, 3600); // 1 hour expiration

      if (error || !data?.signedUrl) {
        throw new Error(`Supabase signed URL generation failed: ${error?.message || "Unknown error"}`);
      }
      return data.signedUrl;
    }
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
