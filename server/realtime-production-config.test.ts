import { describe, expect, it } from "vitest";

describe("production Realtime configuration", () => {
  it("does not report the server JWT secret as missing", async () => {
    const response = await fetch("https://api.zylobridge.com/api/realtime/token", {
      headers: { Accept: "application/json" },
    });
    // Without a session this endpoint should reject authentication, but a 503
    // would prove that the server-side signing secret is absent.
    expect(response.status).not.toBe(503);
    await response.body?.cancel();
  }, 15_000);
});
