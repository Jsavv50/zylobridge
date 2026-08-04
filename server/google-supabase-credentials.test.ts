/**
 * Credential validation tests for Google OAuth and Supabase.
 *
 * These tests verify that the credentials are syntactically valid and that
 * the external services are reachable. They do not perform a full OAuth flow.
 */
import { describe, it, expect } from "vitest";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

describe("Google OAuth credentials", () => {
  it("GOOGLE_CLIENT_ID is set and has the correct format", () => {
    expect(GOOGLE_CLIENT_ID).toBeTruthy();
    expect(GOOGLE_CLIENT_ID).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("GOOGLE_CLIENT_SECRET is set and non-empty", () => {
    expect(GOOGLE_CLIENT_SECRET).toBeTruthy();
    expect(GOOGLE_CLIENT_SECRET.length).toBeGreaterThan(10);
  });

  it("Google OAuth discovery endpoint is reachable", async () => {
    const res = await fetch(
      "https://accounts.google.com/.well-known/openid-configuration"
    );
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.authorization_endpoint).toContain("accounts.google.com");
  });
});

describe("Supabase credentials", () => {
  it("SUPABASE_URL is set and is a valid HTTPS URL", () => {
    expect(SUPABASE_URL).toBeTruthy();
    expect(SUPABASE_URL).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it("SUPABASE_ANON_KEY is set and non-empty", () => {
    expect(SUPABASE_ANON_KEY).toBeTruthy();
    expect(SUPABASE_ANON_KEY.length).toBeGreaterThan(10);
  });

  it("SUPABASE_SERVICE_ROLE_KEY is set and non-empty", () => {
    expect(SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    expect(SUPABASE_SERVICE_ROLE_KEY.length).toBeGreaterThan(10);
  });

  it("Supabase project health endpoint is reachable", async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    // 200, 400, 401, 404 all indicate the project is live and responding
    expect([200, 400, 401, 404]).toContain(res.status);
  });
});
