import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(apiKey);
  }
  return _resend;
}

/**
 * Sends a branded ZYLOBRIDGE OTP email to the given address.
 * Returns true on success, throws on failure.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  const resend = getResend();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your ZYLOBRIDGE Sign-In Code</title>
</head>
<body style="margin:0;padding:0;background:#0a0d14;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d14;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0d1117;border-radius:16px;border:1px solid rgba(124,58,237,0.25);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0a3c 0%,#0d1117 100%);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(124,58,237,0.2);">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <div style="width:40px;height:40px;background:#7c3aed;border-radius:10px;display:inline-block;text-align:center;line-height:40px;font-size:22px;font-weight:900;color:#fff;">Z</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">ZYLOBRIDGE</span>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;">Powering the Future of Connection</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Your Sign-In Code</h1>
              <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.6;">
                Use the one-time code below to sign in to your ZYLOBRIDGE account. This code expires in <strong style="color:#a78bfa;">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background:rgba(124,58,237,0.12);border:2px solid rgba(124,58,237,0.4);border-radius:12px;padding:24px 0;">
                    <span style="font-size:44px;font-weight:900;letter-spacing:14px;color:#a78bfa;font-family:'Courier New',monospace;">${otp}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.35);line-height:1.6;">
                For security, never share this code with anyone — ZYLOBRIDGE will never ask for it.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.25);">
                © ${new Date().getFullYear()} ZYLOBRIDGE · All rights reserved
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.18);">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from: "ZYLOBRIDGE <onboarding@resend.dev>",
    to,
    subject: `${otp} is your ZYLOBRIDGE sign-in code`,
    html,
  });

  if (error) {
    console.error("[Resend] Failed to send OTP email:", error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  console.log(`[Resend] OTP email sent to ${to}`);
  return true;
}

/**
 * Validate that the Resend API key is working.
 * A "restricted_api_key" error means the key is valid but send-only (correct for OTP use).
 * A 401 with any other message or a network error means the key is invalid.
 */
export async function validateResendKey(): Promise<boolean> {
  try {
    const resend = getResend();
    const { error } = await resend.domains.list();
    // No error = full-access key (valid)
    if (!error) return true;
    // restricted_api_key = send-only key, which is exactly what we need
    if (error && (error as any).name === "restricted_api_key") return true;
    return false;
  } catch {
    return false;
  }
}
