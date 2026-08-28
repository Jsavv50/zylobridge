import { and, desc, eq, inArray, or } from "drizzle-orm";
import {
  applications,
  conversations,
  engagementDisputes,
  engagements,
  escrowPayments,
  jobs,
  milestones,
  organizationMembers,
  organizations,
  paymentTransactions,
  payouts,
  refunds,
  users,
} from "../drizzle/schema";
import { clampOffset, clampPageSize, getDb, MAX_PAGE_SIZE } from "./db";

const PENDING_TRANSACTION_STATUSES = new Set(["created", "payment_required", "payment_initiated", "payment_pending"]);
const FUNDED_TRANSACTION_STATUSES = new Set(["payment_confirmed", "funded"]);
const HELD_MILESTONE_STATUSES = new Set(["funded", "in_progress", "submitted", "approved", "release_pending", "disputed"]);
const FINANCIAL_ORGANIZATION_ROLES = new Set(["OWNER", "ADMIN"]);

export type EmployerFinancePeriod = "7d" | "30d" | "3m" | "12m" | "all";
export type EmployerFinanceFilters = {
  search?: string;
  status?: string;
  category?: "all" | "funding" | "escrow" | "released" | "refunds" | "fees";
  dateFrom?: string;
  dateTo?: string;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  provider?: string;
  sort?: "newest" | "oldest" | "amount_desc" | "amount_asc" | "updated";
  limit?: number;
  offset?: number;
};

function amountToMinor(value: string | number | null | undefined) {
  return Math.round(Number(value ?? 0) * 100);
}

function dateFloor(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateCeiling(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodStart(period: EmployerFinancePeriod) {
  if (period === "all") return null;
  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "3m" ? 90 : 365;
  return new Date(now.getTime() - days * 86_400_000);
}

function addCurrencyTotal(target: Map<string, number>, currency: string, amountMinor: number) {
  target.set(currency, (target.get(currency) ?? 0) + amountMinor);
}

function totalsToArray(target: Map<string, number>) {
  return Array.from(target.entries()).map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

async function getEmployerFinancialScope(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (isAdmin) {
    const allJobs = await db.select({ id: jobs.id, organizationId: jobs.organizationId }).from(jobs).limit(MAX_PAGE_SIZE);
    return { jobIds: allJobs.map((job) => job.id), organizationIds: Array.from(new Set(allJobs.map((job) => job.organizationId).filter((id): id is number => typeof id === "number"))), canFundOrganizationIds: [] as number[] };
  }
  const memberships = await db.select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")));
  const financialOrganizationIds = memberships.filter((membership) => FINANCIAL_ORGANIZATION_ROLES.has(membership.role)).map((membership) => membership.organizationId);
  const ownership = financialOrganizationIds.length
    ? or(eq(jobs.clientId, userId), inArray(jobs.organizationId, financialOrganizationIds))
    : eq(jobs.clientId, userId);
  const ownedJobs = await db.select({ id: jobs.id }).from(jobs).where(ownership).limit(MAX_PAGE_SIZE);
  return { jobIds: ownedJobs.map((job) => job.id), organizationIds: financialOrganizationIds, canFundOrganizationIds: financialOrganizationIds };
}

export async function getEmployerFinanceDashboard(userId: number, isAdmin: boolean, period: EmployerFinancePeriod = "12m") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const scope = await getEmployerFinancialScope(userId, isAdmin);
  const jobIds = scope.jobIds;
  const empty = {
    summary: [] as Array<{ currency: string; availableBalanceMinor: number; availableBalanceSupported: boolean; heldInEscrowMinor: number; pendingPaymentsMinor: number; totalSpentMinor: number; totalFundedMinor: number; totalReleasedMinor: number; refundedMinor: number; platformFeesMinor: number }>,
    counts: { actionRequired: 0, activeEscrow: 0, readyToFund: 0, transactions: 0, openDisputes: 0, pendingRefunds: 0, completedRefunds: 0 },
    actionRequired: [] as any[], activeEscrow: [] as any[], readyToFund: [] as any[], engagements: [] as any[], disputes: [] as any[], refunds: [] as any[], organizations: [] as any[], spending: [] as any[],
    capabilities: { accountBalance: false, addFunds: false, savedPaymentMethods: false, selfServeRefunds: false, clientRelease: false, provider: "paystack" as const, organizationFinanceRoles: ["OWNER", "ADMIN"] },
    generatedAt: new Date(),
  };
  if (!jobIds.length) return empty;

  const engagementRows = await db.select({
    id: engagements.id,
    jobId: engagements.jobId,
    employerId: engagements.employerId,
    professionalId: engagements.professionalId,
    compensation: engagements.compensation,
    status: engagements.status,
    startDate: engagements.startDate,
    endDate: engagements.endDate,
    createdAt: engagements.createdAt,
    updatedAt: engagements.updatedAt,
    jobTitle: jobs.title,
    jobLocation: jobs.location,
    jobDescription: jobs.description,
    jobCurrency: jobs.currency,
    organizationId: jobs.organizationId,
    professionalName: users.name,
    professionalAvatarUrl: users.avatarUrl,
    professionalVerified: users.isVerified,
  }).from(engagements)
    .innerJoin(jobs, eq(jobs.id, engagements.jobId))
    .leftJoin(users, eq(users.id, engagements.professionalId))
    .where(inArray(engagements.jobId, jobIds))
    .orderBy(desc(engagements.updatedAt));
  const engagementIds = engagementRows.map((engagement) => engagement.id);

  const [milestoneRows, transactionRows, escrowRows, acceptedApplicationRows, payoutRows, refundRows, disputeRows, conversationRows, organizationRows] = await Promise.all([
    engagementIds.length ? db.select().from(milestones).where(inArray(milestones.engagementId, engagementIds)).orderBy(desc(milestones.updatedAt)) : Promise.resolve([] as any[]),
    engagementIds.length ? db.select().from(paymentTransactions).where(inArray(paymentTransactions.engagementId, engagementIds)).orderBy(desc(paymentTransactions.createdAt)) : Promise.resolve([] as any[]),
    db.select().from(escrowPayments).where(inArray(escrowPayments.jobId, jobIds)).orderBy(desc(escrowPayments.updatedAt)),
    db.select({ id: applications.id, jobId: applications.jobId, professionalId: applications.professionalId, bidAmount: applications.bidAmount, status: applications.status, updatedAt: applications.updatedAt, jobTitle: jobs.title, jobLocation: jobs.location, jobDescription: jobs.description, jobCurrency: jobs.currency, professionalName: users.name, professionalAvatarUrl: users.avatarUrl, professionalVerified: users.isVerified })
      .from(applications).innerJoin(jobs, eq(jobs.id, applications.jobId)).leftJoin(users, eq(users.id, applications.professionalId))
      .where(and(inArray(applications.jobId, jobIds), eq(applications.status, "accepted"))).orderBy(desc(applications.updatedAt)),
    engagementIds.length ? db.select().from(payouts).where(inArray(payouts.engagementId, engagementIds)).orderBy(desc(payouts.updatedAt)) : Promise.resolve([] as any[]),
    engagementIds.length ? db.select().from(refunds).where(inArray(refunds.engagementId, engagementIds)).orderBy(desc(refunds.updatedAt)) : Promise.resolve([] as any[]),
    engagementIds.length ? db.select().from(engagementDisputes).where(inArray(engagementDisputes.engagementId, engagementIds)).orderBy(desc(engagementDisputes.updatedAt)) : Promise.resolve([] as any[]),
    db.select({ id: conversations.id, jobId: conversations.jobId, professionalId: conversations.professionalId, lastMessageAt: conversations.lastMessageAt }).from(conversations).where(and(eq(conversations.clientId, userId), inArray(conversations.jobId, jobIds))).orderBy(desc(conversations.lastMessageAt)),
    scope.organizationIds.length ? db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(inArray(organizations.id, scope.organizationIds)) : Promise.resolve([] as any[]),
  ]);

  const milestonesByEngagement = new Map<number, typeof milestoneRows>();
  for (const milestone of milestoneRows) milestonesByEngagement.set(milestone.engagementId, [...(milestonesByEngagement.get(milestone.engagementId) ?? []), milestone]);
  const transactionsByMilestone = new Map<number, typeof transactionRows>();
  for (const transaction of transactionRows) transactionsByMilestone.set(transaction.milestoneId, [...(transactionsByMilestone.get(transaction.milestoneId) ?? []), transaction]);
  const conversationsByJob = new Map(conversationRows.map((conversation) => [`${conversation.jobId}:${conversation.professionalId}`, conversation]));
  const legacyEscrowByJob = new Map(escrowRows.map((escrow) => [escrow.jobId, escrow]));
  const engagementByJobProfessional = new Set(engagementRows.map((engagement) => `${engagement.jobId}:${engagement.professionalId}`));

  const readyToFund: any[] = [];
  const activeEscrow: any[] = [];
  const engagementItems = engagementRows.map((engagement) => {
    const engagementMilestones = milestonesByEngagement.get(engagement.id) ?? [];
    const milestoneItems = engagementMilestones.map((milestone: any) => {
      const transactions = transactionsByMilestone.get(milestone.id) ?? [];
      const currentTransaction = transactions[0] ?? null;
      const isPending = currentTransaction ? PENDING_TRANSACTION_STATUSES.has(currentTransaction.status) : false;
      const canFund = engagement.status === "active" && milestone.status === "draft" && !isPending;
      const conversation = conversationsByJob.get(`${engagement.jobId}:${engagement.professionalId}`) ?? null;
      const item = {
        kind: "milestone" as const,
        engagementId: engagement.id,
        milestoneId: milestone.id,
        jobId: engagement.jobId,
        jobTitle: engagement.jobTitle,
        location: engagement.jobLocation,
        description: milestone.description ?? engagement.jobDescription,
        professionalId: engagement.professionalId,
        professionalName: engagement.professionalName ?? "Professional",
        professionalAvatarUrl: engagement.professionalAvatarUrl,
        professionalVerified: Boolean(engagement.professionalVerified),
        title: milestone.title,
        amountMinor: Number(milestone.amountMinor),
        currency: milestone.currency,
        milestoneStatus: milestone.status,
        engagementStatus: engagement.status,
        dueDate: milestone.dueDate,
        fundedAt: milestone.fundedAt,
        releasedAt: milestone.releasedAt,
        lastActivityAt: milestone.updatedAt,
        transactionStatus: currentTransaction?.status ?? null,
        transactionReference: currentTransaction?.reference ?? null,
        platformFeeMinor: Number(currentTransaction?.platformFeeMinor ?? Math.round(Number(milestone.amountMinor) * 0.05)),
        canFund,
        conversationId: conversation?.id ?? null,
      };
      if (canFund) readyToFund.push(item);
      if (HELD_MILESTONE_STATUSES.has(milestone.status)) activeEscrow.push({ ...item, fundedMinor: Number(milestone.amountMinor), remainingMinor: Number(milestone.amountMinor), canRelease: false });
      return item;
    });
    const totalMinor = milestoneItems.reduce((total, milestone) => total + milestone.amountMinor, 0);
    const fundedMinor = milestoneItems.filter((milestone) => HELD_MILESTONE_STATUSES.has(milestone.milestoneStatus) || milestone.milestoneStatus === "released").reduce((total, milestone) => total + milestone.amountMinor, 0);
    const releasedMinor = milestoneItems.filter((milestone) => milestone.milestoneStatus === "released").reduce((total, milestone) => total + milestone.amountMinor, 0);
    return { ...engagement, currency: milestoneItems[0]?.currency ?? engagement.jobCurrency ?? "NGN", totalMinor: totalMinor || amountToMinor(engagement.compensation), fundedMinor, releasedMinor, remainingMinor: Math.max(0, (totalMinor || amountToMinor(engagement.compensation)) - fundedMinor), milestones: milestoneItems };
  });

  for (const application of acceptedApplicationRows) {
    if (engagementByJobProfessional.has(`${application.jobId}:${application.professionalId}`)) continue;
    const escrow = legacyEscrowByJob.get(application.jobId);
    const currency = application.jobCurrency ?? escrow?.currency ?? "NGN";
    const amountMinor = amountToMinor(application.bidAmount);
    const conversation = conversationsByJob.get(`${application.jobId}:${application.professionalId}`) ?? null;
    const item = { kind: "legacy" as const, applicationId: application.id, jobId: application.jobId, jobTitle: application.jobTitle, location: application.jobLocation, description: application.jobDescription, professionalId: application.professionalId, professionalName: application.professionalName ?? "Professional", professionalAvatarUrl: application.professionalAvatarUrl, professionalVerified: Boolean(application.professionalVerified), amountMinor, currency, engagementStatus: "candidate_accepted", escrowStatus: escrow?.status ?? "not_funded", lastActivityAt: escrow?.updatedAt ?? application.updatedAt, canFund: !escrow || !["funded", "released"].includes(escrow.status), conversationId: conversation?.id ?? null };
    if (item.canFund) readyToFund.push(item);
    if (escrow?.status === "funded") activeEscrow.push({ ...item, fundedMinor: amountToMinor(escrow.amount), remainingMinor: amountToMinor(escrow.amount), fundedAt: escrow.paidAt, canRelease: false });
  }

  const heldTotals = new Map<string, number>();
  const pendingTotals = new Map<string, number>();
  const spentTotals = new Map<string, number>();
  const fundedTotals = new Map<string, number>();
  const releasedTotals = new Map<string, number>();
  const refundTotals = new Map<string, number>();
  const feeTotals = new Map<string, number>();
  const since = periodStart(period);
  const spendingByMonth = new Map<string, Map<string, { fundedMinor: number; releasedMinor: number; refundedMinor: number }>>();
  const recordPeriod = (date: Date, currency: string, field: "fundedMinor" | "releasedMinor" | "refundedMinor", amountMinor: number) => {
    if (since && date < since) return;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const currencyMap = spendingByMonth.get(key) ?? new Map();
    const current = currencyMap.get(currency) ?? { fundedMinor: 0, releasedMinor: 0, refundedMinor: 0 };
    current[field] += amountMinor;
    currencyMap.set(currency, current);
    spendingByMonth.set(key, currencyMap);
  };
  const milestoneById = new Map(milestoneRows.map((milestone: any) => [milestone.id, milestone]));
  for (const transaction of transactionRows) {
    const amountMinor = Number(transaction.amountMinor);
    const currency = transaction.currency;
    const milestone = milestoneById.get(transaction.milestoneId);
    if (PENDING_TRANSACTION_STATUSES.has(transaction.status)) addCurrencyTotal(pendingTotals, currency, amountMinor);
    if (FUNDED_TRANSACTION_STATUSES.has(transaction.status)) {
      addCurrencyTotal(fundedTotals, currency, amountMinor);
      addCurrencyTotal(feeTotals, currency, Number(transaction.platformFeeMinor ?? 0));
      recordPeriod(transaction.createdAt, currency, "fundedMinor", amountMinor);
      if (milestone?.status === "released") {
        addCurrencyTotal(spentTotals, currency, amountMinor);
        addCurrencyTotal(releasedTotals, currency, amountMinor);
        recordPeriod(milestone.releasedAt ?? transaction.updatedAt, currency, "releasedMinor", amountMinor);
      } else if (milestone && HELD_MILESTONE_STATUSES.has(milestone.status)) addCurrencyTotal(heldTotals, currency, amountMinor);
    }
  }
  for (const escrow of escrowRows) {
    const amountMinor = amountToMinor(escrow.amount);
    if (escrow.status === "pending") addCurrencyTotal(pendingTotals, escrow.currency, amountMinor);
    if (escrow.status === "funded") { addCurrencyTotal(heldTotals, escrow.currency, amountMinor); addCurrencyTotal(fundedTotals, escrow.currency, amountMinor); recordPeriod(escrow.paidAt ?? escrow.updatedAt, escrow.currency, "fundedMinor", amountMinor); }
    if (escrow.status === "released") { addCurrencyTotal(spentTotals, escrow.currency, amountMinor); addCurrencyTotal(releasedTotals, escrow.currency, amountMinor); recordPeriod(escrow.releasedAt ?? escrow.updatedAt, escrow.currency, "releasedMinor", amountMinor); }
    if (escrow.status === "refunded") { addCurrencyTotal(refundTotals, escrow.currency, amountMinor); recordPeriod(escrow.refundedAt ?? escrow.updatedAt, escrow.currency, "refundedMinor", amountMinor); }
  }
  for (const refund of refundRows) if (refund.status === "refund_completed") { addCurrencyTotal(refundTotals, refund.currency, Number(refund.amountMinor)); recordPeriod(refund.updatedAt, refund.currency, "refundedMinor", Number(refund.amountMinor)); }
  // Milestone release state is canonical for employer totals. Payout rows are
  // intentionally not added again because they represent the same released funds.

  const currencies = Array.from(new Set([
    ...Array.from(heldTotals.keys()),
    ...Array.from(pendingTotals.keys()),
    ...Array.from(spentTotals.keys()),
    ...Array.from(fundedTotals.keys()),
    ...Array.from(releasedTotals.keys()),
    ...Array.from(refundTotals.keys()),
    ...Array.from(feeTotals.keys()),
    ...readyToFund.map((item) => item.currency),
  ]));
  const summary = currencies.map((currency) => ({ currency, availableBalanceMinor: 0, availableBalanceSupported: false, heldInEscrowMinor: heldTotals.get(currency) ?? 0, pendingPaymentsMinor: pendingTotals.get(currency) ?? 0, totalSpentMinor: spentTotals.get(currency) ?? 0, totalFundedMinor: fundedTotals.get(currency) ?? 0, totalReleasedMinor: releasedTotals.get(currency) ?? 0, refundedMinor: refundTotals.get(currency) ?? 0, platformFeesMinor: feeTotals.get(currency) ?? 0 }));
  const failedTransactions = transactionRows.filter((transaction) => transaction.status === "failed").map((transaction) => ({ kind: "failed_payment" as const, reference: transaction.reference, amountMinor: Number(transaction.amountMinor), currency: transaction.currency, status: transaction.status, lastActivityAt: transaction.updatedAt }));
  const actionRequired = [...readyToFund.map((item) => ({ ...item, reason: item.kind === "milestone" ? "This approved engagement milestone is ready for secure funding." : "The candidate has been accepted. Fund the engagement to begin the protected workflow." })), ...failedTransactions].slice(0, 12);
  const disputes = disputeRows.map((dispute: any) => ({ id: dispute.id, engagementId: dispute.engagementId, reason: dispute.reason, status: dispute.status, createdAt: dispute.createdAt, updatedAt: dispute.updatedAt }));
  const refundItems = refundRows.map((refund: any) => ({ id: refund.id, reference: refund.reference, engagementId: refund.engagementId, amountMinor: Number(refund.amountMinor), currency: refund.currency, status: refund.status, reason: refund.reason, createdAt: refund.createdAt, updatedAt: refund.updatedAt }));
  const spending = Array.from(spendingByMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).flatMap(([month, currencyMap]) => Array.from(currencyMap.entries()).map(([currency, values]) => ({ month, currency, ...values })));
  return {
    summary,
    counts: { actionRequired: actionRequired.length, activeEscrow: activeEscrow.length, readyToFund: readyToFund.length, transactions: transactionRows.length + escrowRows.length, openDisputes: disputes.filter((dispute) => !["resolved", "closed"].includes(dispute.status)).length, pendingRefunds: refundItems.filter((refund) => ["refund_pending", "refund_processing"].includes(refund.status)).length, completedRefunds: refundItems.filter((refund) => refund.status === "refund_completed").length },
    actionRequired,
    activeEscrow,
    readyToFund,
    engagements: engagementItems,
    disputes,
    refunds: refundItems,
    organizations: organizationRows,
    spending,
    capabilities: { accountBalance: false, addFunds: false, savedPaymentMethods: false, selfServeRefunds: false, clientRelease: false, provider: "paystack" as const, organizationFinanceRoles: ["OWNER", "ADMIN"] },
    generatedAt: new Date(),
  };
}

export async function getEmployerFinanceTransactions(userId: number, isAdmin: boolean, filters: EmployerFinanceFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const scope = await getEmployerFinancialScope(userId, isAdmin);
  if (!scope.jobIds.length) return { items: [], total: 0, limit: clampPageSize(filters.limit), offset: clampOffset(filters.offset), hasMore: false, nextOffset: null };
  const engagementRows = await db.select({ id: engagements.id, jobId: engagements.jobId, jobTitle: jobs.title, jobLocation: jobs.location, professionalName: users.name })
    .from(engagements).innerJoin(jobs, eq(jobs.id, engagements.jobId)).leftJoin(users, eq(users.id, engagements.professionalId)).where(inArray(engagements.jobId, scope.jobIds));
  const engagementIds = engagementRows.map((engagement) => engagement.id);
  const [transactionRows, legacyRows] = await Promise.all([
    engagementIds.length ? db.select().from(paymentTransactions).where(inArray(paymentTransactions.engagementId, engagementIds)).orderBy(desc(paymentTransactions.createdAt)) : Promise.resolve([] as any[]),
    db.select().from(escrowPayments).where(inArray(escrowPayments.jobId, scope.jobIds)).orderBy(desc(escrowPayments.createdAt)),
  ]);
  const engagementById = new Map(engagementRows.map((engagement) => [engagement.id, engagement]));
  const jobRows = await db.select({ id: jobs.id, title: jobs.title, location: jobs.location, professionalId: jobs.assignedProfessionalId }).from(jobs).where(inArray(jobs.id, scope.jobIds));
  const jobById = new Map(jobRows.map((job) => [job.id, job]));
  const professionalIds = Array.from(new Set(legacyRows.map((escrow) => escrow.professionalId)));
  const professionalRows = professionalIds.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, professionalIds)) : [];
  const professionalById = new Map(professionalRows.map((professional) => [professional.id, professional.name]));
  const items = [
    ...transactionRows.map((transaction: any) => { const engagement = engagementById.get(transaction.engagementId); return { source: "milestone" as const, reference: transaction.reference, jobId: engagement?.jobId ?? null, jobTitle: engagement?.jobTitle ?? "Engagement payment", location: engagement?.jobLocation ?? null, professionalName: engagement?.professionalName ?? "Professional", engagementId: transaction.engagementId, milestoneId: transaction.milestoneId, amountMinor: Number(transaction.amountMinor), platformFeeMinor: Number(transaction.platformFeeMinor ?? 0), currency: transaction.currency, status: transaction.status, provider: transaction.provider, paymentMethod: transaction.provider, createdAt: transaction.createdAt, updatedAt: transaction.updatedAt }; }),
    ...legacyRows.map((escrow) => { const job = jobById.get(escrow.jobId); return { source: "job_escrow" as const, reference: escrow.paystackReference ?? `ESC-${escrow.id}`, jobId: escrow.jobId, jobTitle: job?.title ?? "Job escrow", location: job?.location ?? null, professionalName: professionalById.get(escrow.professionalId) ?? "Professional", engagementId: null, milestoneId: null, amountMinor: amountToMinor(escrow.amount), platformFeeMinor: 0, currency: escrow.currency, status: escrow.status, provider: escrow.paymentMethod, paymentMethod: escrow.paymentMethod, createdAt: escrow.createdAt, updatedAt: escrow.updatedAt } }),
  ];
  const q = filters.search?.trim().toLowerCase();
  const from = dateFloor(filters.dateFrom);
  const to = dateCeiling(filters.dateTo);
  const categoryStatuses: Record<NonNullable<EmployerFinanceFilters["category"]>, Set<string> | null> = {
    all: null,
    funding: new Set(["created", "payment_required", "payment_initiated", "payment_pending"]),
    escrow: new Set(["payment_confirmed", "funded"]),
    released: new Set(["released", "payout_completed"]),
    refunds: new Set(["refund_pending", "refunded", "refund_completed"]),
    fees: null,
  };
  let filtered = items.filter((item) => {
    if (q && ![item.reference, item.jobTitle, item.professionalName, item.location ?? ""].some((value) => value.toLowerCase().includes(q))) return false;
    if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
    const category = filters.category ?? "all";
    const categorySet = categoryStatuses[category];
    if (categorySet && !categorySet.has(item.status)) return false;
    if (category === "fees" && item.platformFeeMinor <= 0) return false;
    if (from && item.createdAt < from) return false;
    if (to && item.createdAt > to) return false;
    if (filters.minAmountMinor !== undefined && item.amountMinor < filters.minAmountMinor) return false;
    if (filters.maxAmountMinor !== undefined && item.amountMinor > filters.maxAmountMinor) return false;
    if (filters.provider && filters.provider !== "all" && item.provider !== filters.provider) return false;
    return true;
  });
  filtered = filtered.sort((a, b) => filters.sort === "oldest" ? a.createdAt.getTime() - b.createdAt.getTime() : filters.sort === "amount_desc" ? b.amountMinor - a.amountMinor : filters.sort === "amount_asc" ? a.amountMinor - b.amountMinor : filters.sort === "updated" ? b.updatedAt.getTime() - a.updatedAt.getTime() : b.createdAt.getTime() - a.createdAt.getTime());
  const limit = clampPageSize(filters.limit);
  const offset = clampOffset(filters.offset);
  return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset, hasMore: offset + limit < filtered.length, nextOffset: offset + limit < filtered.length ? offset + limit : null };
}

export async function getEmployerFinanceTransactionDetail(userId: number, isAdmin: boolean, reference: string) {
  const result = await getEmployerFinanceTransactions(userId, isAdmin, { search: reference, limit: MAX_PAGE_SIZE, offset: 0 });
  return result.items.find((item) => item.reference === reference) ?? null;
}
