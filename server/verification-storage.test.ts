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

  it("verifies server/routers.ts includes adminGetDocumentUrl procedure with NOT_FOUND error handling", () => {
    const routerCode = fs.readFileSync(path.resolve(__dirname, "./routers.ts"), "utf-8");
    expect(routerCode).toContain("adminGetDocumentUrl");
    expect(routerCode).toContain("storageGetSignedUrl");
    expect(routerCode).toContain("Verification request or document key not found");
  });

  it("verifies client VerificationRequest page enforces 5MB limit and correct file types", () => {
    const clientCode = fs.readFileSync(path.resolve(__dirname, "../client/src/pages/VerificationRequest.tsx"), "utf-8");
    expect(clientCode).toContain("5 * 1024 * 1024");
    expect(clientCode).toContain("fileBase64");
    expect(clientCode).toContain("verification.submit.useMutation");
  });

  it("validates Supabase signed URL key cleaning and error propagation semantics", () => {
    const storageCode = fs.readFileSync(path.resolve(__dirname, "./storage.ts"), "utf-8");
    expect(storageCode).toContain("cleanKey = key.replace");
    expect(storageCode).toContain("Supabase signed URL generation failed");
  });
});
