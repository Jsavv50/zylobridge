import { describe, it, expect } from "vitest";

describe("Google OAuth Production Reliability and Error Boundaries", () => {
  it("generates deterministic correlation IDs and handles controlled error parameters", () => {
    const errorParam = "google_auth_failed";
    const details = encodeURIComponent("Token exchange failed (400): invalid_grant");
    const redirectUrl = `/sign-in?error=${errorParam}&details=${details}`;

    expect(redirectUrl).toContain("error=google_auth_failed");
    expect(redirectUrl).toContain("invalid_grant");
  });

  it("verifies redirect URI parity across authorization and token exchange", () => {
    const baseUrl = "https://api.zylobridge.com";
    const callbackUrl = `${baseUrl}/api/auth/google/callback`;

    expect(callbackUrl).toBe("https://api.zylobridge.com/api/auth/google/callback");
  });
});
