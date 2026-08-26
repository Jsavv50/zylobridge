/**
 * Paystack API helper — all calls are server-side only.
 * The PAYSTACK_SECRET_KEY is never exposed to the client.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

function getKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

async function paystackFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = (await res.json()) as { status: boolean; message: string; data: T };
  if (!data.status) throw new Error(data.message || "Paystack API error");
  return data.data;
}

// ─── Initialize Transaction ───────────────────────────────────────────────────
export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializePaystackTransaction(params: {
  email: string;
  amount: number; // in kobo (multiply NGN by 100)
  reference: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}): Promise<PaystackInitResult> {
  return paystackFetch<PaystackInitResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100), // convert to kobo
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callback_url,
    }),
  });
}

// ─── Verify Transaction ───────────────────────────────────────────────────────
export interface PaystackVerifyResult {
  status: string; // "success" | "failed" | "abandoned"
  reference: string;
  amount: number; // in kobo
  currency: string;
  paid_at: string;
  customer: { email: string };
}

export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResult> {
  return paystackFetch<PaystackVerifyResult>(`/transaction/verify/${reference}`);
}

// ─── List Banks ───────────────────────────────────────────────────────────────
export interface PaystackBank {
  id: number;
  name: string;
  code: string;
  country: string;
  currency: string;
}

export async function listPaystackBanks(country = "nigeria"): Promise<PaystackBank[]> {
  return paystackFetch<PaystackBank[]>(`/bank?country=${country}&perPage=100`);
}

// ─── Resolve Account Number ───────────────────────────────────────────────────
export interface PaystackAccountInfo {
  account_number: string;
  account_name: string;
  bank_id: number;
}

export async function resolveAccountNumber(params: {
  account_number: string;
  bank_code: string;
}): Promise<PaystackAccountInfo> {
  return paystackFetch<PaystackAccountInfo>(
    `/bank/resolve?account_number=${params.account_number}&bank_code=${params.bank_code}`
  );
}

// ─── Generate Unique Reference ────────────────────────────────────────────────
export function generatePaystackReference(prefix = "ZB"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
