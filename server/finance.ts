import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { milestones, paymentTransactions, paymentEvents, ledgerAccounts, ledgerEntries, reconciliationRecords, engagements, jobs, organizationMembers } from "../drizzle/schema";
import { initializePaystackSouthAfricaEft, initializePaystackTransaction, verifyPaystackTransaction, generatePaystackReference } from "./paystack";
import { getFrontendUrl } from "./_core/env";
import { createInAppNotification } from "./phase4";
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
  isAdmin?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const engagementList = await db.select().from(engagements).where(eq(engagements.id, params.engagementId)).limit(1);
  if (engagementList.length === 0) throw new Error("Engagement not found");
  const engagement = engagementList[0];
  if (engagement.status !== "active") throw new Error("Only active engagements can be funded");
  const [job] = await db.select({ organizationId: jobs.organizationId }).from(jobs).where(eq(jobs.id, engagement.jobId)).limit(1);
  let organizationAuthorized = false;
  if (job?.organizationId) {
    const [membership] = await db.select({ role: organizationMembers.role }).from(organizationMembers).where(and(
      eq(organizationMembers.organizationId, job.organizationId),
      eq(organizationMembers.userId, params.payerId),
      eq(organizationMembers.status, "active"),
      inArray(organizationMembers.role, ["OWNER", "ADMIN"]),
    )).limit(1);
    organizationAuthorized = Boolean(membership);
  }
  if (!params.isAdmin && engagement.employerId !== params.payerId && !organizationAuthorized) {
    throw new Error("Unauthorized: employer finance permission required");
  }

  const milestoneList = await db.select().from(milestones).where(and(eq(milestones.id, params.milestoneId), eq(milestones.engagementId, engagement.id))).limit(1);
  if (milestoneList.length === 0) throw new Error("Milestone not found for this engagement");
  const milestone = milestoneList[0];
  if (["funded", "in_progress", "submitted", "approved", "release_pending", "released", "disputed", "cancelled"].includes(milestone.status)) {
    throw new Error("Milestone is not eligible for funding");
  }
  const existing = await db.select({ id: paymentTransactions.id, status: paymentTransactions.status }).from(paymentTransactions).where(and(
    eq(paymentTransactions.engagementId, engagement.id),
    eq(paymentTransactions.milestoneId, milestone.id),
    inArray(paymentTransactions.status, ["created", "payment_required", "payment_initiated", "payment_pending"]),
  )).limit(1);
  if (existing.length) throw new Error("A funding request is already active for this milestone");

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
  let authorizationUrl: string;
  let providerReference = reference;
  let accessCode: string | undefined;
  try {
    const metadata = { engagementId: params.engagementId, milestoneId: params.milestoneId, transactionId: txn.id };
    if (milestone.currency === "ZAR") {
      const eft = await initializePaystackSouthAfricaEft({ email: params.email, amount: amountMinor / 100, reference, metadata });
      authorizationUrl = eft.url;
    } else if (milestone.currency === "NGN") {
      const paystackInit = await initializePaystackTransaction({ email: params.email, amount: amountMinor / 100, reference, metadata, callback_url: `${getFrontendUrl()}/payment/callback`, currency: "NGN" });
      authorizationUrl = paystackInit.authorization_url;
      providerReference = paystackInit.reference;
      accessCode = paystackInit.access_code;
    } else {
      throw new Error(`No configured payment provider for ${milestone.currency}`);
    }
  } catch (error) {
    await db.update(paymentTransactions).set({ status: "failed", updatedAt: new Date() }).where(eq(paymentTransactions.id, txn.id));
    throw error;
  }

  await db.update(paymentTransactions)
    .set({ status: "payment_initiated", providerReference, updatedAt: new Date() })
    .where(eq(paymentTransactions.id, txn.id));

  return {
    transactionId: txn.id,
    reference,
    authorizationUrl,
    accessCode,
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
  if (verification.currency && verification.currency !== txn.currency) {
    throw new Error("Payment currency mismatch");
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

  const [context] = await db.select({ jobId: jobs.id, jobTitle: jobs.title })
    .from(engagements)
    .innerJoin(jobs, eq(jobs.id, engagements.jobId))
    .where(eq(engagements.id, txn.engagementId))
    .limit(1);
  await Promise.allSettled([
    createInAppNotification({ userId: txn.payerId, title: "Escrow funding confirmed", content: `${context?.jobTitle ?? "Engagement"} funding was verified and is now protected.`, category: "payment", referenceType: "payment", referenceId: txn.reference }),
    txn.payeeId ? createInAppNotification({ userId: txn.payeeId, title: "Engagement funding confirmed", content: `${context?.jobTitle ?? "Your engagement"} funding was verified and is now protected.`, category: "payment", referenceType: "payment", referenceId: txn.reference }) : Promise.resolve(null),
  ]);

  return { success: true, transactionId: txn.id, milestoneId: txn.milestoneId };
}

export async function processAuthorizedVerifiedPayment(reference: string, userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [transaction] = await db.select({ payerId: paymentTransactions.payerId, engagementId: paymentTransactions.engagementId }).from(paymentTransactions).where(eq(paymentTransactions.reference, reference)).limit(1);
  if (!transaction) throw new Error("Payment transaction not found");
  const [engagement] = await db.select({ employerId: engagements.employerId, jobId: engagements.jobId }).from(engagements).where(eq(engagements.id, transaction.engagementId)).limit(1);
  if (!engagement) throw new Error("Engagement not found");
  let organizationAuthorized = false;
  const [job] = await db.select({ organizationId: jobs.organizationId }).from(jobs).where(eq(jobs.id, engagement.jobId)).limit(1);
  if (job?.organizationId) {
    const [membership] = await db.select({ role: organizationMembers.role }).from(organizationMembers).where(and(
      eq(organizationMembers.organizationId, job.organizationId),
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.status, "active"),
      inArray(organizationMembers.role, ["OWNER", "ADMIN"]),
    )).limit(1);
    organizationAuthorized = Boolean(membership);
  }
  if (!isAdmin && transaction.payerId !== userId && engagement.employerId !== userId && !organizationAuthorized) throw new Error("Unauthorized payment verification");
  return processVerifiedPayment(reference);
}
