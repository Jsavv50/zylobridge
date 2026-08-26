import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { milestones, paymentTransactions, paymentEvents, ledgerAccounts, ledgerEntries, reconciliationRecords, engagements } from "../drizzle/schema";
import { initializePaystackTransaction, verifyPaystackTransaction, generatePaystackReference } from "./paystack";
import * as crypto from "crypto";

export async function verifyPaystackWebhookSignature(rawBody: string, signature: string | undefined): Promise<boolean> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

export async function ensureLedgerAccountsExist() {
  const db = await getDb();
  if (!db) return;
  const defaultAccounts = [
    { name: "Cash Clearing (Paystack)", type: "asset", currency: "NGN" },
    { name: "Platform Escrow Holding", type: "liability", currency: "NGN" },
    { name: "Platform Fee Revenue", type: "revenue", currency: "NGN" },
  ];
  for (const acc of defaultAccounts) {
    const existing = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.name, acc.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(ledgerAccounts).values(acc as any);
    }
  }
}

export async function recordBalancedLedgerEntries(params: {
  transactionId: number;
  currency?: string;
  debitAccountId: number;
  creditAccountId: number;
  amountMinor: number;
  description: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection unavailable");
  const currency = params.currency || "NGN";

  // Double-entry check: SUM(debits) must equal SUM(credits)
  if (params.amountMinor <= 0) {
    throw new Error("Invalid financial amount for ledger entry");
  }

  await db.transaction(async (tx) => {
    // Debit entry
    await tx.insert(ledgerEntries).values({
      transactionId: params.transactionId,
      accountId: params.debitAccountId,
      debitMinor: params.amountMinor,
      creditMinor: 0,
      currency,
      description: `Debit: ${params.description}`,
    });

    // Credit entry
    await tx.insert(ledgerEntries).values({
      transactionId: params.transactionId,
      accountId: params.creditAccountId,
      debitMinor: 0,
      creditMinor: params.amountMinor,
      currency,
      description: `Credit: ${params.description}`,
    });
  });
}

export async function initializeMilestonePayment(params: {
  engagementId: number;
  milestoneId: number;
  payerId: number;
  email: string;
  callbackUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const milestoneList = await db.select().from(milestones).where(eq(milestones.id, params.milestoneId)).limit(1);
  if (milestoneList.length === 0) throw new Error("Milestone not found");
  const milestone = milestoneList[0];

  if (milestone.status === "funded" || milestone.status === "released") {
    throw new Error("Milestone is already funded or released");
  }

  const engagementList = await db.select().from(engagements).where(eq(engagements.id, params.engagementId)).limit(1);
  if (engagementList.length === 0) throw new Error("Engagement not found");
  const engagement = engagementList[0];

  if (engagement.employerId !== params.payerId) {
    throw new Error("Unauthorized: only the engagement employer can fund milestones");
  }

  const reference = generatePaystackReference("ZB-MS");
  const amountMinor = Number(milestone.amountMinor);
  const platformFeeMinor = Math.round(amountMinor * 0.05); // 5% platform fee

  // Create payment transaction
  const [txn] = await db.insert(paymentTransactions).values({
    reference,
    engagementId: params.engagementId,
    milestoneId: params.milestoneId,
    payerId: params.payerId,
    payeeId: engagement.professionalId,
    amountMinor,
    currency: milestone.currency,
    status: "payment_required",
    provider: "paystack",
    platformFeeMinor,
  }).returning();

  // Initialize with Paystack
  const paystackInit = await initializePaystackTransaction({
    email: params.email,
    amount: amountMinor / 100,
    reference,
    metadata: {
      engagementId: params.engagementId,
      milestoneId: params.milestoneId,
      transactionId: txn.id,
    },
    callback_url: params.callbackUrl,
  });

  await db.update(paymentTransactions)
    .set({ status: "payment_initiated", providerReference: paystackInit.reference, updatedAt: new Date() })
    .where(eq(paymentTransactions.id, txn.id));

  return {
    transactionId: txn.id,
    reference,
    authorizationUrl: paystackInit.authorization_url,
    accessCode: paystackInit.access_code,
    amountMinor,
    currency: milestone.currency,
  };
}

export async function processVerifiedPayment(reference: string, providerRef?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const txns = await db.select().from(paymentTransactions).where(eq(paymentTransactions.reference, reference)).limit(1);
  if (txns.length === 0) throw new Error(`Payment transaction ${reference} not found`);
  const txn = txns[0];

  if (txn.status === "funded" || txn.status === "payment_confirmed") {
    return { success: true, message: "Transaction already processed" };
  }

  // Verify server-side with Paystack API
  const verification = await verifyPaystackTransaction(reference);
  if (verification.status !== "success") {
    await db.update(paymentTransactions).set({ status: "failed", updatedAt: new Date() }).where(eq(paymentTransactions.id, txn.id));
    throw new Error(`Paystack verification failed with status: ${verification.status}`);
  }

  if (verification.amount !== txn.amountMinor) {
    throw new Error(`Amount mismatch: expected ${txn.amountMinor}, got ${verification.amount}`);
  }

  await ensureLedgerAccountsExist();

  const assetAcc = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.name, "Cash Clearing (Paystack)")).limit(1);
  const liabilityAcc = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.name, "Platform Escrow Holding")).limit(1);

  await db.transaction(async (tx) => {
    // Update txn status
    await tx.update(paymentTransactions)
      .set({ status: "funded", providerReference: providerRef || verification.reference, updatedAt: new Date() })
      .where(eq(paymentTransactions.id, txn.id));

    // Update milestone status
    await tx.update(milestones)
      .set({ status: "funded", fundedAt: new Date(), updatedAt: new Date() })
      .where(eq(milestones.id, txn.milestoneId));

    // Record ledger entries
    if (assetAcc.length > 0 && liabilityAcc.length > 0) {
      await tx.insert(ledgerEntries).values({
        transactionId: txn.id,
        accountId: assetAcc[0].id,
        debitMinor: txn.amountMinor,
        creditMinor: 0,
        currency: txn.currency,
        description: `Milestone funding received (Ref: ${reference})`,
      });
      await tx.insert(ledgerEntries).values({
        transactionId: txn.id,
        accountId: liabilityAcc[0].id,
        debitMinor: 0,
        creditMinor: txn.amountMinor,
        currency: txn.currency,
        description: `Milestone escrow holding liability (Ref: ${reference})`,
      });
    }

    // Reconciliation record
    await tx.insert(reconciliationRecords).values({
      transactionId: txn.id,
      status: "matched",
      discrepancyDetails: null,
    });
  });

  return { success: true, transactionId: txn.id, milestoneId: txn.milestoneId };
}
