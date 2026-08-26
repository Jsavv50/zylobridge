import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { milestones, paymentTransactions, ledgerAccounts, ledgerEntries, reconciliationRecords, engagements, professionalBankAccounts, payouts, refunds, engagementDisputes, disputeEvidence } from "../drizzle/schema";
import { createTransferRecipient, initiatePaystackTransfer, verifyPaystackTransfer, initiatePaystackRefund, generatePaystackReference } from "./paystack";
import { recordBalancedLedgerEntries } from "./finance";

export async function addOrVerifyProfessionalBank(params: {
  userId: number;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Create recipient on Paystack
  const recipient = await createTransferRecipient({
    type: "nuban",
    name: params.accountName,
    account_number: params.accountNumber,
    bank_code: params.bankCode,
    currency: "NGN",
  });

  const existing = await db.select().from(professionalBankAccounts).where(eq(professionalBankAccounts.userId, params.userId)).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(professionalBankAccounts)
      .set({
        bankName: params.bankName,
        bankCode: params.bankCode,
        accountNumber: params.accountNumber,
        accountName: params.accountName,
        recipientCode: recipient.recipient_code,
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(professionalBankAccounts.id, existing[0].id))
      .returning();
    return updated;
  } else {
    const [inserted] = await db.insert(professionalBankAccounts).values({
      userId: params.userId,
      bankName: params.bankName,
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
      accountName: params.accountName,
      recipientCode: recipient.recipient_code,
      isVerified: true,
    }).returning();
    return inserted;
  }
}

export async function initiateMilestonePayout(params: {
  engagementId: number;
  milestoneId: number;
  adminUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const milestoneList = await db.select().from(milestones).where(eq(milestones.id, params.milestoneId)).limit(1);
  if (milestoneList.length === 0) throw new Error("Milestone not found");
  const milestone = milestoneList[0];

  if (milestone.status !== "approved" && milestone.status !== "release_pending") {
    throw new Error(`Milestone is not approved for payout (current status: ${milestone.status})`);
  }

  // Check active dispute
  const activeDisputes = await db.select().from(engagementDisputes).where(and(eq(engagementDisputes.engagementId, params.engagementId), eq(engagementDisputes.status, "opened"))).limit(1);
  if (activeDisputes.length > 0) {
    throw new Error("Payout blocked: Active dispute on this engagement");
  }

  const engagementList = await db.select().from(engagements).where(eq(engagements.id, params.engagementId)).limit(1);
  if (engagementList.length === 0) throw new Error("Engagement not found");
  const engagement = engagementList[0];

  const bankAccs = await db.select().from(professionalBankAccounts).where(eq(professionalBankAccounts.userId, engagement.professionalId)).limit(1);
  if (bankAccs.length === 0 || !bankAccs[0].recipientCode) {
    throw new Error("Professional has not configured or verified a bank account for payouts");
  }
  const bankAcc = bankAccs[0];

  const amountMinor = Number(milestone.amountMinor);
  const platformFeeMinor = Math.round(amountMinor * 0.05);
  const netAmountMinor = amountMinor - platformFeeMinor;
  const reference = generatePaystackReference("ZB-PO");

  const [payout] = await db.insert(payouts).values({
    reference,
    engagementId: params.engagementId,
    milestoneId: params.milestoneId,
    professionalId: engagement.professionalId,
    amountMinor,
    platformFeeMinor,
    netAmountMinor,
    currency: milestone.currency,
    status: "payout_initiated",
  }).returning();

  // Initiate transfer with Paystack
  const transfer = await initiatePaystackTransfer({
    amount: netAmountMinor / 100,
    recipient: bankAcc.recipientCode!,
    reason: `Milestone Payout #${milestone.id} - ${milestone.title}`,
    reference,
  });

  await db.update(payouts)
    .set({
      status: "payout_processing",
      transferCode: transfer.transfer_code,
      transferReference: transfer.reference,
      updatedAt: new Date(),
    })
    .where(eq(payouts.id, payout.id));

  // Update milestone status
  await db.update(milestones)
    .set({ status: "release_pending", updatedAt: new Date() })
    .where(eq(milestones.id, milestone.id));

  return { payoutId: payout.id, reference, status: "payout_processing", transferCode: transfer.transfer_code };
}

export async function processPayoutWebhook(reference: string, transferStatus: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const payoutList = await db.select().from(payouts).where(eq(payouts.reference, reference)).limit(1);
  if (payoutList.length === 0) throw new Error(`Payout reference ${reference} not found`);
  const payout = payoutList[0];

  if (payout.status === "payout_completed" || payout.status === "payout_reversed") {
    return { success: true, message: "Payout already finalized" };
  }

  if (transferStatus === "success") {
    await db.transaction(async (tx) => {
      await tx.update(payouts)
        .set({ status: "payout_completed", updatedAt: new Date() })
        .where(eq(payouts.id, payout.id));

      await tx.update(milestones)
        .set({ status: "released", releasedAt: new Date(), updatedAt: new Date() })
        .where(eq(milestones.id, payout.milestoneId));

      // Record ledger entries: Debit Escrow Liability, Credit Professional Bank Cash & Platform Fee Revenue
      const liabilityAcc = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.name, "Platform Escrow Holding")).limit(1);
      const feeAcc = await db.select().from(ledgerAccounts).where(eq(ledgerAccounts.name, "Platform Fee Revenue")).limit(1);

      if (liabilityAcc.length > 0) {
        // Record payout distribution
        await tx.insert(ledgerEntries).values({
          transactionId: payout.id, // linked via payout reference
          accountId: liabilityAcc[0].id,
          debitMinor: payout.amountMinor,
          creditMinor: 0,
          currency: payout.currency,
          description: `Payout released for Milestone #${payout.milestoneId} (Ref: ${reference})`,
        });
      }
    });
  } else if (transferStatus === "failed" || transferStatus === "reversed") {
    await db.update(payouts)
      .set({ status: "payout_failed", failureReason: `Transfer status reported as ${transferStatus}`, updatedAt: new Date() })
      .where(eq(payouts.id, payout.id));
  }

  return { success: true, payoutId: payout.id, status: transferStatus };
}

export async function authorizeRefund(params: {
  transactionId: number;
  amountMinor?: number;
  reason: string;
  adminUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const txnList = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, params.transactionId)).limit(1);
  if (txnList.length === 0) throw new Error("Transaction not found");
  const txn = txnList[0];

  const refundAmount = params.amountMinor || txn.amountMinor;
  const reference = generatePaystackReference("ZB-REF");

  const [refund] = await db.insert(refunds).values({
    reference,
    transactionId: txn.id,
    engagementId: txn.engagementId,
    amountMinor: refundAmount,
    currency: txn.currency,
    status: "refund_pending",
    reason: params.reason,
    authorizedBy: params.adminUserId,
  }).returning();

  // Call Paystack refund API
  const paystackRefund = await initiatePaystackRefund({
    transaction: txn.reference,
    amount: refundAmount / 100,
    merchant_note: params.reason,
  });

  await db.update(refunds)
    .set({
      status: "refund_completed",
      providerRefundId: paystackRefund.id.toString(),
      updatedAt: new Date(),
    })
    .where(eq(refunds.id, refund.id));

  // Mark transaction refunded
  await db.update(paymentTransactions)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(paymentTransactions.id, txn.id));

  return { refundId: refund.id, reference, status: "refund_completed" };
}

export async function createDispute(params: {
  engagementId: number;
  milestoneId?: number;
  transactionId?: number;
  initiatorId: number;
  respondentId: number;
  reason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [dispute] = await db.insert(engagementDisputes).values({
    engagementId: params.engagementId,
    milestoneId: params.milestoneId,
    transactionId: params.transactionId,
    initiatorId: params.initiatorId,
    respondentId: params.respondentId,
    reason: params.reason,
    status: "opened",
  }).returning();

  // If milestone exists, freeze status to disputed
  if (params.milestoneId) {
    await db.update(milestones)
      .set({ status: "disputed", updatedAt: new Date() })
      .where(eq(milestones.id, params.milestoneId));
  }

  return dispute;
}

export async function resolveDispute(params: {
  disputeId: number;
  resolution: string;
  adminUserId: number;
  action: "release_to_professional" | "refund_to_employer" | "split";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const dispList = await db.select().from(engagementDisputes).where(eq(engagementDisputes.id, params.disputeId)).limit(1);
  if (dispList.length === 0) throw new Error("Dispute not found");
  const dispute = dispList[0];

  await db.update(engagementDisputes)
    .set({
      status: "resolved",
      resolution: `[Action: ${params.action}] ${params.resolution}`,
      resolvedBy: params.adminUserId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(engagementDisputes.id, dispute.id));

  if (dispute.milestoneId) {
    const targetStatus = params.action === "release_to_professional" ? "approved" : "cancelled";
    await db.update(milestones)
      .set({ status: targetStatus, updatedAt: new Date() })
      .where(eq(milestones.id, dispute.milestoneId));
  }

  return { success: true, disputeId: dispute.id, action: params.action };
}
