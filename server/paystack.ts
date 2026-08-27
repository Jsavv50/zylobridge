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
  amount: number; // major currency units
  reference: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
  currency?: string;
  channels?: string[];
}): Promise<PaystackInitResult> {
  return paystackFetch<PaystackInitResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100),
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callback_url,
      currency: params.currency,
      channels: params.channels,
    }),
  });
}

export interface PaystackEftChargeResult {
  reference: string;
  status: string;
  url: string;
  display_text?: string;
}

/**
 * Paystack EFT is documented for South African customers only. Ozow is the
 * currently documented provider and the amount is expressed in ZAR cents.
 */
export async function initializePaystackSouthAfricaEft(params: {
  email: string;
  amount: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackEftChargeResult> {
  return paystackFetch<PaystackEftChargeResult>("/charge", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100),
      currency: "ZAR",
      reference: params.reference,
      metadata: params.metadata,
      eft: { provider: "ozow" },
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


// ─── Transfer Recipient ───────────────────────────────────────────────────────
export interface PaystackTransferRecipientResult {
  recipient_code: string;
  type: string;
  name: string;
  details: {
    account_number: string;
    bank_code: string;
    bank_name: string;
  };
}

export async function createTransferRecipient(params: {
  type?: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}): Promise<PaystackTransferRecipientResult> {
  return paystackFetch<PaystackTransferRecipientResult>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: params.type || "nuban",
      name: params.name,
      account_number: params.account_number,
      bank_code: params.bank_code,
      currency: params.currency || "NGN",
    }),
  });
}

// ─── Initiate Transfer (Payout) ───────────────────────────────────────────────
export interface PaystackTransferResult {
  transfer_code: string;
  reference: string;
  amount: number; // in kobo
  currency: string;
  status: string; // "pending" | "success" | "otp"
  domain: string;
}

export async function initiatePaystackTransfer(params: {
  source?: string;
  amount: number; // in kobo
  recipient: string; // recipient_code
  reason?: string;
  reference: string;
}): Promise<PaystackTransferResult> {
  return paystackFetch<PaystackTransferResult>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: params.source || "balance",
      amount: Math.round(params.amount * 100), // convert to kobo
      recipient: params.recipient,
      reason: params.reason || "Zylobridge Professional Milestone Payout",
      reference: params.reference,
    }),
  });
}

// ─── Verify Transfer ──────────────────────────────────────────────────────────
export async function verifyPaystackTransfer(reference: string): Promise<any> {
  return paystackFetch<any>(`/transfer/verify/${reference}`);
}

// ─── Refund Transaction ───────────────────────────────────────────────────────
export interface PaystackRefundResult {
  id: number;
  transaction: number;
  reference: string;
  amount: number; // in kobo
  currency: string;
  status: string;
}

export async function initiatePaystackRefund(params: {
  transaction: string; // transaction reference or id
  amount?: number; // optional partial amount in kobo
  merchant_note?: string;
}): Promise<PaystackRefundResult> {
  return paystackFetch<PaystackRefundResult>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: params.transaction,
      amount: params.amount ? Math.round(params.amount * 100) : undefined,
      merchant_note: params.merchant_note || "Zylobridge Admin Authorized Refund",
    }),
  });
}
