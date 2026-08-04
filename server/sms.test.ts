/**
 * SMS delivery helper — unit tests
 *
 * Tests verify:
 *  1. Graceful fallback when TERMII_API_KEY is not configured
 *  2. Successful delivery path (mocked Termii API)
 *  3. Failure path when Termii returns a non-2xx response
 *  4. sendOtpSms formats the message correctly
 */

import { describe, it, expect, vi, afterEach } from "vitest";

// ── Mock ENV so we can control termiiApiKey ──────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    termiiApiKey: "",
  },
}));

describe("SMS delivery helper", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("returns success:false and logs a warning when TERMII_API_KEY is not set", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).termiiApiKey = "";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendSms } = await import("./sms");

    const result = await sendSms("+2348012345678", "Test message");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("TERMII_API_KEY not set")
    );
  });

  it("returns success:true with messageId when Termii responds 200", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).termiiApiKey = "test-api-key-123";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message_id: "msg_abc123", message: "Successfully Sent" }),
    } as unknown as Response);

    const { sendSms } = await import("./sms");
    const result = await sendSms("+2348012345678", "Hello");

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_abc123");
  });

  it("returns success:false when Termii responds with a non-2xx status", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).termiiApiKey = "test-api-key-123";

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    } as unknown as Response);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendSms } = await import("./sms");
    const result = await sendSms("+2348012345678", "Hello");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("sendOtpSms includes the OTP in the message body", async () => {
    const { ENV } = await import("./_core/env");
    (ENV as any).termiiApiKey = "test-api-key-123";

    let capturedBody: any;
    global.fetch = vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string);
      return {
        ok: true,
        json: async () => ({ message_id: "msg_xyz" }),
      } as unknown as Response;
    });

    const { sendOtpSms } = await import("./sms");
    const result = await sendOtpSms("+2348012345678", "987654");

    expect(result.success).toBe(true);
    expect(capturedBody.sms).toContain("987654");
    expect(capturedBody.to).toBe("+2348012345678");
  });
});
