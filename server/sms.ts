import twilio from "twilio";

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
};

export class SmsDeliveryError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "SmsDeliveryError";
  }
}

/** Normalize an international number to E.164. */
export function normalizePhoneNumber(rawPhone: string): string {
  let value = rawPhone.trim().replace(/[\s().-]/g, "");

  if (value.startsWith("00")) value = `+${value.slice(2)}`;

  // South African local mobile: 0762099665 -> +27762099665.
  if (/^0\d{9}$/.test(value)) {
    value = `+27${value.slice(1)}`;
  } else if (/^[1-9]\d{7,14}$/.test(value)) {
    value = `+${value}`;
  }

  if (!/^\+[1-9]\d{7,14}$/.test(value)) {
    throw new SmsDeliveryError("Enter a valid phone number in E.164 format, for example +27762099665.");
  }

  return value;
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return "***";
  return `${phone.slice(0, 4)}${"•".repeat(Math.max(3, phone.length - 6))}${phone.slice(-2)}`;
}

function getTwilioConfig(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!accountSid || !authToken || !messagingServiceSid) {
    throw new SmsDeliveryError("SMS delivery is not configured.");
  }

  return { accountSid, authToken, messagingServiceSid };
}

/**
 * Deliver a one-time code through Twilio Programmable Messaging.
 * The DEV fallback is deliberately restricted to NODE_ENV=development and
 * cannot run in Railway production.
 */
export async function sendPhoneOtpSms(rawPhone: string, otp: string) {
  const phone = normalizePhoneNumber(rawPhone);
  const maskedPhone = maskPhoneNumber(phone);

  if (process.env.NODE_ENV === "development") {
    console.log(`[PhoneAuth][DEV] OTP for ${phone}: ${otp}`);
    return { provider: "development" as const, phone, messageSid: null, status: "not-sent" };
  }

  const config = getTwilioConfig();
  const client = twilio(config.accountSid, config.authToken);
  console.log(`[PhoneAuth] Sending OTP through Twilio to ${maskedPhone}`);

  try {
    const message = await client.messages.create({
      body: `Your Zylobridge verification code is ${otp}`,
      messagingServiceSid: config.messagingServiceSid,
      to: phone,
    });

    console.log(
      `[PhoneAuth] Twilio accepted SMS for ${maskedPhone}. Message SID: ${message.sid}. Status: ${message.status ?? "queued"}`,
    );

    return {
      provider: "twilio" as const,
      phone,
      messageSid: message.sid,
      status: message.status ?? "queued",
    };
  } catch (error) {
    const twilioError = error as { code?: number; message?: string };
    console.error(
      `[PhoneAuth] Twilio SMS failed for ${maskedPhone}. Error code: ${twilioError.code ?? "unknown"}. Message: ${twilioError.message ?? "Unknown Twilio error"}`,
    );
    throw new SmsDeliveryError("SMS delivery could not be completed. Please try again.", twilioError.code);
  }
}
