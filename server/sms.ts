/**
 * SMS delivery via Termii API
 *
 * Termii is an African SMS gateway that supports international delivery.
 * Docs: https://developers.termii.com/messaging
 *
 * Required env var: TERMII_API_KEY
 * Optional env var: TERMII_SENDER_ID (defaults to "ZYLOBRIDGE"; must be pre-approved by Termii)
 *
 * Graceful degradation:
 *   - If TERMII_API_KEY is not set, the OTP is logged server-side only (dev mode).
 *   - If the Termii API returns a non-2xx response, the error is logged and the
 *     function returns { success: false } so the caller can decide whether to surface
 *     the failure to the user or silently continue.
 */

import { ENV } from "./_core/env";

const TERMII_BASE_URL = "https://v3.api.termii.com";

interface TermiiMessagePayload {
  to: string;
  from: string;
  sms: string;
  type: "plain";
  channel: "generic" | "dnd" | "WhatsApp";
  api_key: string;
}

interface TermiiResponse {
  message_id?: string;
  message?: string;
  balance?: number;
  user?: string;
  code?: string;
}

/**
 * Send an SMS message via Termii.
 *
 * @param to      Recipient phone number in E.164 format (e.g. +2348012345678)
 * @param message Plain-text message body (max 160 chars for a single SMS segment)
 * @returns       { success: boolean; messageId?: string; error?: string }
 */
export async function sendSms(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = ENV.termiiApiKey;

  // Dev fallback — no API key configured
  if (!apiKey) {
    console.warn(
      `[SMS][DEV] TERMII_API_KEY not set. SMS to ${to} not delivered. Message: "${message}"`
    );
    return { success: false, error: "SMS provider not configured." };
  }

  const senderId = process.env.TERMII_SENDER_ID ?? "ZYLOBRIDGE";

  const payload: TermiiMessagePayload = {
    to,
    from: senderId,
    sms: message,
    type: "plain",
    channel: "generic",
    api_key: apiKey,
  };

  try {
    const response = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as TermiiResponse;

    if (!response.ok) {
      const errMsg = data.message ?? `HTTP ${response.status}`;
      console.error(`[SMS][Termii] Delivery failed for ${to}: ${errMsg}`, data);
      return { success: false, error: errMsg };
    }

    console.log(`[SMS][Termii] Delivered to ${to}. message_id=${data.message_id}`);
    return { success: true, messageId: data.message_id };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[SMS][Termii] Network error for ${to}: ${errMsg}`);
    return { success: false, error: errMsg };
  }
}

/**
 * Convenience wrapper: send a 6-digit OTP via SMS.
 *
 * @param phone  E.164 phone number
 * @param otp    6-digit numeric OTP string
 */
export async function sendOtpSms(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const message = `Your ZYLOBRIDGE verification code is: ${otp}. It expires in 10 minutes. Do not share this code with anyone.`;
  const result = await sendSms(phone, message);
  return { success: result.success, error: result.error };
}
