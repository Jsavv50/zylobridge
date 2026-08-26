import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMessage, twilioFactory } = vi.hoisted(() => {
  const createMessage = vi.fn();
  const twilioFactory = vi.fn(() => ({ messages: { create: createMessage } }));
  return { createMessage, twilioFactory };
});

vi.mock("twilio", () => ({ default: twilioFactory }));

import {
  SmsDeliveryError,
  maskPhoneNumber,
  normalizePhoneNumber,
  sendPhoneOtpSms,
} from "./sms";

const originalEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
};

function setProductionTwilioEnvironment() {
  process.env.NODE_ENV = "production";
  process.env.TWILIO_ACCOUNT_SID = "ACtest";
  process.env.TWILIO_AUTH_TOKEN = "test-token";
  process.env.TWILIO_MESSAGING_SERVICE_SID = "MGtest";
}

describe("phone OTP SMS delivery", () => {
  beforeEach(() => {
    setProductionTwilioEnvironment();
    createMessage.mockReset();
    twilioFactory.mockClear();
    twilioFactory.mockReturnValue({ messages: { create: createMessage } });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment.nodeEnv;
    process.env.TWILIO_ACCOUNT_SID = originalEnvironment.accountSid;
    process.env.TWILIO_AUTH_TOKEN = originalEnvironment.authToken;
    process.env.TWILIO_MESSAGING_SERVICE_SID = originalEnvironment.messagingServiceSid;
  });

  it("normalizes South African local mobile numbers to E.164", () => {
    expect(normalizePhoneNumber("0762099665")).toBe("+27762099665");
    expect(normalizePhoneNumber("+27 76 209 9665")).toBe("+27762099665");
    expect(normalizePhoneNumber("0027762099665")).toBe("+27762099665");
    expect(maskPhoneNumber("+27762099665")).not.toContain("62099");
  });

  it("rejects invalid phone numbers before contacting Twilio", () => {
    expect(() => normalizePhoneNumber("not-a-phone")).toThrow(SmsDeliveryError);
  });

  it("uses Twilio Messaging Service delivery in production and returns its Message SID", async () => {
    createMessage.mockResolvedValue({ sid: "SM123", status: "queued" });

    const result = await sendPhoneOtpSms("0762099665", "123456");

    expect(twilioFactory).toHaveBeenCalledWith("ACtest", "test-token");
    expect(createMessage).toHaveBeenCalledWith({
      body: "Your Zylobridge verification code is 123456",
      messagingServiceSid: "MGtest",
      to: "+27762099665",
    });
    expect(result).toMatchObject({ provider: "twilio", messageSid: "SM123", status: "queued" });
  });

  it("fails closed when Twilio configuration is missing", async () => {
    delete process.env.TWILIO_AUTH_TOKEN;

    await expect(sendPhoneOtpSms("0762099665", "123456")).rejects.toThrow("SMS delivery is not configured.");
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("returns a safe error when Twilio rejects delivery", async () => {
    createMessage.mockRejectedValue({ code: 21614, message: "Invalid To phone number" });

    await expect(sendPhoneOtpSms("0762099665", "123456")).rejects.toThrow("SMS delivery could not be completed. Please try again.");
  });
});
