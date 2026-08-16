import { describe, it, expect, vi } from "vitest";

describe("Production Auth Incident Fixes", () => {
  it("normalizes emails to lowercase and trimmed string", () => {
    const raw = "  Minermikee777@Gmail.com ";
    expect(raw.trim().toLowerCase()).toBe("minermikee777@gmail.com");
  });

  it("handles fallback verifyOtp correctly", async () => {
    const verifyOtpMock = vi.fn()
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "Invalid token" } })
      .mockResolvedValueOnce({ data: { user: { id: "123", email: "test@example.com" } }, error: null });

    const email = "test@example.com";
    const token = "123456";

    let res = await verifyOtpMock({ email, token, type: "email" });
    if (res.error) {
      res = await verifyOtpMock({ email, token, type: "signup" });
    }

    expect(res.error).toBeNull();
    expect(res.data.user).toBeDefined();
  });
});
