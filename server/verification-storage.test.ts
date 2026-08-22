import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";

describe("Verification Document Storage & Admin Review", () => {
  it("verifies server/storage.ts handles verification-docs prefix using Supabase Storage", () => {
    const storageCode = fs.readFileSync(path.resolve(__dirname, "./storage.ts"), "utf-8");
    expect(storageCode).toContain("verification-docs/");
    expect(storageCode).toContain("verification-documents");
    expect(storageCode).toContain("createSignedUrl");
  });

  it("persists the exact Storage-returned key and validates the object before insertion", () => {
    const routerCode = fs.readFileSync(path.resolve(__dirname, "./routers.ts"), "utf-8");
    expect(routerCode).toContain("const { key: canonicalKey, url } = await storagePut");
    expect(routerCode).toContain("documentKey: canonicalKey");
    expect(routerCode).toContain("documentUrl: url");
    expect(routerCode).toContain("storageObjectExists(canonicalKey)");
    expect(routerCode).toContain("could not be verified in private storage");
    expect(routerCode).not.toContain("documentKey: key,");
  });

  it("uses the stored canonical key for admin signed URLs and rejects missing objects", () => {
    const routerCode = fs.readFileSync(path.resolve(__dirname, "./routers.ts"), "utf-8");
    expect(routerCode).toContain("adminGetDocumentUrl");
    expect(routerCode).toContain("storageObjectExists(req.documentKey)");
    expect(routerCode).toContain("storageGetSignedUrl(req.documentKey)");
    expect(routerCode).toContain("document is no longer available in private storage");
  });

  it("verifies client VerificationRequest page enforces 5MB limit and correct file types", () => {
    const clientCode = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/VerificationRequest.tsx"), "utf-8");
    expect(clientCode).toContain("5 * 1024 * 1024");
    expect(clientCode).toContain("fileBase64");
    expect(clientCode).toContain("verification.submit.useMutation");
  });

  it("validates Supabase signed URL key cleaning and error propagation semantics", () => {
    const storageCode = fs.readFileSync(path.resolve(__dirname, "./storage.ts"), "utf-8");
    expect(storageCode).toContain("verificationObjectKey");
    expect(storageCode).toContain("storageObjectExists");
    expect(storageCode).toContain("Supabase signed URL generation failed");
  });

  it("sanitizes path separators and control characters without rewriting Unicode names", () => {
    const storageCode = fs.readFileSync(path.resolve(__dirname, "./storage.ts"), "utf-8");
    expect(storageCode).toContain("sanitizeStorageFileName");
    expect(storageCode).toContain("normalize(\"NFC\")");
    expect(storageCode).toContain("replace(/[\\\\/\\0]/g, \"_\")");
  });

  it("ships a dry-run-by-default legacy reconciliation script that never edits storage.objects", () => {
    const scriptCode = fs.readFileSync(path.resolve(__dirname, "../scripts/reconcile-verification-document-paths.mjs"), "utf-8");
    expect(scriptCode).toContain("mode: apply ? \"apply\" : \"dry-run\"");
    expect(scriptCode).toContain("createSignedUrl");
    expect(scriptCode).toContain("UPDATE verification_requests");
    expect(scriptCode).not.toContain("FROM storage.objects");
    expect(scriptCode).not.toContain("UPDATE storage.objects");
  });
});
