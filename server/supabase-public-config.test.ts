import { describe, expect, it } from "vitest";

describe("public Supabase frontend configuration", () => {
  it("authenticates the public Supabase settings request without exposing the key", async () => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    expect(url).toMatch(/^https:\/\//);
    expect(anonKey).toBeTruthy();

    const response = await fetch(`${url!.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: anonKey! },
    });
    expect(response.status).toBe(200);
    await response.body?.cancel();
  }, 15_000);
});
