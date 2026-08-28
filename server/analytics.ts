import { getDb } from "./db";
import { users, profiles, jobs, applications, engagements, escrowPayments, payouts, organizationMembers, organizationProjects, shortlists, interviews, offers, conversations, messages, notifications } from "../drizzle/schema";
import { eq, and, or, sql, gte, lte, desc, inArray } from "drizzle-orm";

export type TimeRange = "today" | "7d" | "30d" | "90d" | "ytd" | "custom";

export function parseDateRange(range: TimeRange, customStart?: string, customEnd?: string) {
  const now = new Date();
  const endDate = customEnd ? new Date(customEnd) : now;
  const safeEnd = Number.isNaN(endDate.getTime()) ? now : endDate;
  let startDate: Date;
  switch (range) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "ytd":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case "custom": {
      const candidate = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = Number.isNaN(candidate.getTime()) ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : candidate;
      break;
    }
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { startDate, endDate: safeEnd };
}

const amount = (value: string | number | null | undefined) => Number(value ?? 0);

export async function getProfessionalAnalytics(userId: number, range: TimeRange = "30d") {
  const db = await getDb();
  if (!db) return null;
  const { startDate, endDate } = parseDateRange(range);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const apps = await db.select().from(applications).where(and(eq(applications.professionalId, userId), gte(applications.createdAt, startDate), lte(applications.createdAt, endDate)));
  const userEngagements = await db.select().from(engagements).where(and(eq(engagements.professionalId, userId), gte(engagements.createdAt, startDate), lte(engagements.createdAt, endDate)));
  const userPayouts = await db.select().from(payouts).where(and(eq(payouts.professionalId, userId), gte(payouts.createdAt, startDate), lte(payouts.createdAt, endDate)));
  const [completedRow] = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.assignedProfessionalId, userId), eq(jobs.status, "completed"), gte(jobs.updatedAt, startDate), lte(jobs.updatedAt, endDate)));
  return {
    profileCompleteness: profile ? 85 : 40,
    verificationStatus: profile ? "profile_present" : "pending",
    applications: {
      total: apps.length,
      inReview: apps.filter(a => a.status === "pending").length,
      shortlisted: 0,
      accepted: apps.filter(a => a.status === "accepted").length,
      rejected: apps.filter(a => a.status === "rejected").length,
    },
    engagements: {
      active: userEngagements.filter(e => e.status === "active").length,
      completed: userEngagements.filter(e => e.status === "completed").length,
    },
    completedJobs: Number(completedRow?.count ?? 0),
    earnings: {
      totalMinor: userPayouts.filter(p => p.status === "payout_completed").reduce((total, payout) => total + Number(payout.netAmountMinor), 0),
      currency: "NGN",
    },
  };
}

export async function getEmployerAnalytics(clientId: number, range: TimeRange = "30d") {
  const db = await getDb();
  if (!db) return null;
  const { startDate, endDate } = parseDateRange(range);
  const clientJobs = await db.select().from(jobs).where(and(eq(jobs.clientId, clientId), gte(jobs.createdAt, startDate), lte(jobs.createdAt, endDate)));
  const jobIds = clientJobs.map(job => job.id);
  const jobApplications = jobIds.length ? await db.select().from(applications).where(sql`${applications.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`) : [];
  const clientEscrows = await db.select().from(escrowPayments).where(and(eq(escrowPayments.clientId, clientId), gte(escrowPayments.createdAt, startDate), lte(escrowPayments.createdAt, endDate)));
  const shortlistedIds = jobIds.length ? await db.select({ jobId: shortlists.jobId, professionalId: shortlists.professionalId }).from(shortlists).where(sql`${shortlists.jobId} IN (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})`) : [];
  return {
    jobs: { total: clientJobs.length, active: clientJobs.filter(job => job.status === "open" || job.status === "in_progress").length, completed: clientJobs.filter(job => job.status === "completed").length },
    funnel: {
      applicationsReceived: jobApplications.length,
      shortlisted: shortlistedIds.length,
      hired: jobApplications.filter(application => application.status === "accepted").length,
    },
    financial: {
      totalFundedMinor: clientEscrows.filter(escrow => escrow.status === "funded" || escrow.status === "released").reduce((total, escrow) => total + amount(escrow.amount), 0),
      currency: "NGN",
    },
  };
}

export async function getEnterpriseAnalytics(userId: number, organizationId: number, range: TimeRange = "30d") {
  const db = await getDb();
  if (!db) return null;
  const { startDate, endDate } = parseDateRange(range);
  const [member] = await db.select().from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active"))).limit(1);
  if (!member) throw new Error("Forbidden: Not an active member of this organization");
  const orgProjects = await db.select().from(organizationProjects).where(and(eq(organizationProjects.organizationId, organizationId), gte(organizationProjects.createdAt, startDate), lte(organizationProjects.createdAt, endDate)));
  const orgJobs = await db.select().from(jobs).where(and(eq(jobs.organizationId, organizationId), gte(jobs.createdAt, startDate), lte(jobs.createdAt, endDate)));
  const orgEscrows = await db.select().from(escrowPayments).where(and(eq(escrowPayments.clientId, userId), gte(escrowPayments.createdAt, startDate), lte(escrowPayments.createdAt, endDate)));
  const [recruiterRow] = await db.select({ count: sql<number>`count(*)` }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active"), sql`${organizationMembers.role} IN ('OWNER', 'ADMIN', 'HIRING_MANAGER', 'RECRUITER')`));
  return {
    organizationId,
    projectsCount: orgProjects.length,
    jobsCount: orgJobs.length,
    activeJobs: orgJobs.filter(job => job.status === "open" || job.status === "in_progress").length,
    totalSpendMinor: orgEscrows.reduce((total, escrow) => total + amount(escrow.amount), 0),
    currency: "NGN",
    activeRecruiters: Number(recruiterRow?.count ?? 0),
  };
}

export async function getSuperAdminAnalytics(range: TimeRange = "30d") {
  const db = await getDb();
  if (!db) return null;
  const { startDate, endDate } = parseDateRange(range);
  const [userCounts] = await db.select({
    total: sql<number>`count(*)`,
    professionals: sql<number>`count(*) filter (where ${users.userType} = 'professional')`,
    employers: sql<number>`count(*) filter (where ${users.userType} in ('client', 'enterprise'))`,
  }).from(users).where(and(gte(users.createdAt, startDate), lte(users.createdAt, endDate)));
  const [jobCounts] = await db.select({
    total: sql<number>`count(*)`,
    open: sql<number>`count(*) filter (where ${jobs.status} = 'open')`,
    completed: sql<number>`count(*) filter (where ${jobs.status} = 'completed')`,
  }).from(jobs).where(and(gte(jobs.createdAt, startDate), lte(jobs.createdAt, endDate)));
  const [applicationCounts] = await db.select({ total: sql<number>`count(*)` }).from(applications).where(and(gte(applications.createdAt, startDate), lte(applications.createdAt, endDate)));
  const completedPayouts = await db.select().from(payouts).where(and(eq(payouts.status, "payout_completed"), gte(payouts.createdAt, startDate), lte(payouts.createdAt, endDate)));
  const [engagementCounts] = await db.select({ total: sql<number>`count(*)` }).from(engagements).where(and(gte(engagements.createdAt, startDate), lte(engagements.createdAt, endDate)));
  return {
    users: { total: Number(userCounts?.total ?? 0), professionals: Number(userCounts?.professionals ?? 0), employers: Number(userCounts?.employers ?? 0) },
    marketplace: { jobs: Number(jobCounts?.total ?? 0), openJobs: Number(jobCounts?.open ?? 0), completedJobs: Number(jobCounts?.completed ?? 0), applications: Number(applicationCounts?.total ?? 0), engagements: Number(engagementCounts?.total ?? 0) },
    financial: { totalVolumeMinor: completedPayouts.reduce((total, payout) => total + Number(payout.amountMinor), 0), currency: "NGN" },
    operations: { backgroundJobsStatus: "reported by Phase 6A worker", reconciliationStatus: "reported by Phase 6A reconciliation service" },
  };
}


/**
 * Returns the employer dashboard data in one ownership-scoped contract.
 * Every collection is constrained by the authenticated employer's owned jobs
 * or participant relationship; optional metrics remain null/empty when the
 * underlying marketplace has no records yet.
 */
export async function getEmployerCommandCenter(clientId: number) {
  const db = await getDb();
  if (!db) return null;

  const [account] = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    userType: users.userType,
    avatarUrl: users.avatarUrl,
    isVerified: users.isVerified,
  }).from(users).where(eq(users.id, clientId)).limit(1);
  if (!account) return null;

  const ownedJobs = await db.select().from(jobs).where(eq(jobs.clientId, clientId)).orderBy(desc(jobs.createdAt)).limit(50);
  const jobIds = ownedJobs.map((job) => job.id);

  const [jobApplications, employerShortlists, employerInterviews, employerOffers, employerEngagements, employerEscrows, employerConversations, recentNotifications] = await Promise.all([
    jobIds.length ? db.select().from(applications).where(inArray(applications.jobId, jobIds)).orderBy(desc(applications.createdAt)).limit(200) : Promise.resolve([]),
    jobIds.length ? db.select().from(shortlists).where(inArray(shortlists.jobId, jobIds)).orderBy(desc(shortlists.createdAt)).limit(100) : Promise.resolve([]),
    db.select().from(interviews).where(eq(interviews.employerId, clientId)).orderBy(desc(interviews.createdAt)).limit(50),
    db.select().from(offers).where(eq(offers.employerId, clientId)).orderBy(desc(offers.createdAt)).limit(50),
    db.select().from(engagements).where(eq(engagements.employerId, clientId)).orderBy(desc(engagements.createdAt)).limit(50),
    db.select().from(escrowPayments).where(eq(escrowPayments.clientId, clientId)).orderBy(desc(escrowPayments.createdAt)).limit(100),
    db.select().from(conversations).where(eq(conversations.clientId, clientId)).orderBy(desc(conversations.lastMessageAt)).limit(8),
    db.select().from(notifications).where(eq(notifications.userId, clientId)).orderBy(desc(notifications.createdAt)).limit(8),
  ]);

  const candidateIds = Array.from(new Set(jobApplications.map((application) => application.professionalId)));
  const candidates = candidateIds.length
    ? await db.select({
        userId: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
        vocation: profiles.vocation,
        location: profiles.location,
        averageRating: profiles.averageRating,
        totalReviews: profiles.totalReviews,
        yearsExperience: profiles.yearsExperience,
        isAvailable: profiles.isAvailable,
      }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(inArray(users.id, candidateIds)).limit(100)
    : [];

  const conversationIds = employerConversations.map((conversation) => conversation.id);
  const recentMessages = conversationIds.length
    ? await db.select().from(messages).where(inArray(messages.conversationId, conversationIds)).orderBy(desc(messages.createdAt)).limit(100)
    : [];
  const messageSenderIds = Array.from(new Set(recentMessages.map((message) => message.senderId).filter((id) => id !== clientId)));
  const messageSenders = messageSenderIds.length
    ? await db.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl }).from(users).where(inArray(users.id, messageSenderIds)).limit(50)
    : [];
  const senderById = new Map(messageSenders.map((sender) => [sender.id, sender]));

  const vocations = Array.from(new Set(ownedJobs.map((job) => job.vocation))).filter(Boolean);
  const recommendedProfessionals = vocations.length
    ? await db.select({
        userId: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        isVerified: users.isVerified,
        vocation: profiles.vocation,
        location: profiles.location,
        averageRating: profiles.averageRating,
        totalReviews: profiles.totalReviews,
        yearsExperience: profiles.yearsExperience,
        isAvailable: profiles.isAvailable,
      }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(and(eq(users.userType, "professional"), eq(profiles.isAvailable, true), inArray(profiles.vocation, vocations))).orderBy(desc(users.isVerified), desc(profiles.averageRating)).limit(6)
    : [];

  const applicationsByJob = new Map<number, typeof jobApplications>();
  for (const application of jobApplications) {
    const current = applicationsByJob.get(application.jobId) ?? [];
    current.push(application);
    applicationsByJob.set(application.jobId, current);
  }
  const shortlistJobIds = new Set(employerShortlists.map((item) => item.jobId));
  const pendingApplications = jobApplications.filter((application) => application.status === "pending").length;
  const activeEscrow = employerEscrows.filter((escrow) => ["pending", "funded", "disputed"].includes(escrow.status)).reduce((sum, escrow) => sum + amount(escrow.amount), 0);
  const releasedEscrow = employerEscrows.filter((escrow) => escrow.status === "released").reduce((sum, escrow) => sum + amount(escrow.amount), 0);
  const hiredCount = employerEngagements.length + employerOffers.filter((offer) => offer.status === "accepted").length;

  return {
    account,
    jobs: ownedJobs.map((job) => ({ ...job, applicationCount: applicationsByJob.get(job.id)?.length ?? 0, pendingApplicationCount: applicationsByJob.get(job.id)?.filter((application) => application.status === "pending").length ?? 0, hasShortlist: shortlistJobIds.has(job.id) })),
    candidates,
    recommendedProfessionals,
    pipeline: {
      applied: jobApplications.length,
      shortlisted: employerShortlists.length,
      interviews: employerInterviews.filter((interview) => interview.status !== "cancelled").length,
      offers: employerOffers.filter((offer) => offer.status === "pending" || offer.status === "accepted").length,
      hired: hiredCount,
    },
    financial: {
      activeEscrow,
      releasedEscrow,
      pendingEscrow: employerEscrows.filter((escrow) => escrow.status === "pending").reduce((sum, escrow) => sum + amount(escrow.amount), 0),
      currencies: Array.from(new Set(employerEscrows.map((escrow) => escrow.currency))),
    },
    projects: employerEngagements.filter((engagement) => engagement.status === "active").map((engagement) => ({
      id: engagement.id,
      jobId: engagement.jobId,
      professionalId: engagement.professionalId,
      compensation: engagement.compensation,
      startDate: engagement.startDate,
      endDate: engagement.endDate,
      status: engagement.status,
    })),
    messages: employerConversations.map((conversation) => {
      const latest = recentMessages.find((message) => message.conversationId === conversation.id);
      return { ...conversation, latestMessage: latest ? { content: latest.content, createdAt: latest.createdAt, isRead: latest.isRead, sender: senderById.get(latest.senderId) ?? null } : null };
    }),
    notifications: recentNotifications,
    summary: {
      activeJobs: ownedJobs.filter((job) => job.status === "open" || job.status === "in_progress").length,
      openJobs: ownedJobs.filter((job) => job.status === "open").length,
      inProgressJobs: ownedJobs.filter((job) => job.status === "in_progress").length,
      completedJobs: ownedJobs.filter((job) => job.status === "completed").length,
      pendingApplications,
      hiredCount,
      unreadNotifications: recentNotifications.filter((notification) => !notification.isRead).length,
      unreadMessages: recentMessages.filter((message) => message.senderId !== clientId && !message.isRead).length,
    },
    generatedAt: new Date(),
  };
}

export type EmployerJobsPortfolioFilters = {
  q?: string;
  status?: "all" | "open" | "hiring" | "attention" | "in_progress" | "completed" | "cancelled";
  vocation?: string;
  location?: string;
  priority?: "all" | "urgent" | "standard";
  candidateActivity?: "all" | "awaiting_review" | "has_applicants" | "no_applicants" | "shortlisted" | "hired";
  sort?: "recent" | "newest" | "oldest" | "applicants" | "budget_desc" | "budget_asc";
  limit?: number;
  offset?: number;
};

/**
 * Returns the employer job portfolio as one authorization-scoped contract.
 * Jobs are visible only when owned by the user or attached to an organization
 * where the user has an active membership. Applicant data is aggregated into
 * counts; the only person record returned is the already-hired professional.
 */
export async function getEmployerJobsPortfolio(userId: number, filters: EmployerJobsPortfolioFilters = {}) {
  const db = await getDb();
  if (!db) return null;

  const memberships = await db.select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")));
  const organizationIds = memberships.map((membership) => membership.organizationId);
  const ownershipScope = organizationIds.length
    ? or(eq(jobs.clientId, userId), inArray(jobs.organizationId, organizationIds))
    : eq(jobs.clientId, userId);

  const managedJobs = await db.select({
    id: jobs.id,
    clientId: jobs.clientId,
    title: jobs.title,
    vocation: jobs.vocation,
    budget: jobs.budget,
    currency: jobs.currency,
    location: jobs.location,
    deadline: jobs.deadline,
    status: jobs.status,
    assignedProfessionalId: jobs.assignedProfessionalId,
    organizationId: jobs.organizationId,
    isUrgent: jobs.isUrgent,
    createdAt: jobs.createdAt,
    updatedAt: jobs.updatedAt,
  }).from(jobs).where(ownershipScope).orderBy(desc(jobs.updatedAt));

  const jobIds = managedJobs.map((job) => job.id);
  const [applicationRows, shortlistRows, interviewRows, offerRows, engagementRows, escrowRows, conversationRows] = await Promise.all([
    jobIds.length ? db.select({ id: applications.id, jobId: applications.jobId, status: applications.status, createdAt: applications.createdAt, updatedAt: applications.updatedAt }).from(applications).where(inArray(applications.jobId, jobIds)) : Promise.resolve([]),
    jobIds.length ? db.select({ jobId: shortlists.jobId }).from(shortlists).where(inArray(shortlists.jobId, jobIds)) : Promise.resolve([]),
    jobIds.length ? db.select({ jobId: interviews.jobId, status: interviews.status }).from(interviews).where(inArray(interviews.jobId, jobIds)) : Promise.resolve([]),
    jobIds.length ? db.select({ jobId: offers.jobId, status: offers.status }).from(offers).where(inArray(offers.jobId, jobIds)) : Promise.resolve([]),
    jobIds.length ? db.select({ id: engagements.id, jobId: engagements.jobId, professionalId: engagements.professionalId, status: engagements.status, startDate: engagements.startDate, endDate: engagements.endDate, updatedAt: engagements.updatedAt }).from(engagements).where(inArray(engagements.jobId, jobIds)) : Promise.resolve([]),
    jobIds.length ? db.select({ id: escrowPayments.id, jobId: escrowPayments.jobId, amount: escrowPayments.amount, currency: escrowPayments.currency, status: escrowPayments.status, updatedAt: escrowPayments.updatedAt }).from(escrowPayments).where(inArray(escrowPayments.jobId, jobIds)) : Promise.resolve([]),
    jobIds.length ? db.select({ id: conversations.id, jobId: conversations.jobId, clientId: conversations.clientId, professionalId: conversations.professionalId, lastMessageAt: conversations.lastMessageAt }).from(conversations).where(and(eq(conversations.clientId, userId), inArray(conversations.jobId, jobIds))).orderBy(desc(conversations.lastMessageAt)) : Promise.resolve([]),
  ]);

  const hiredProfessionalIds = Array.from(new Set([
    ...managedJobs.map((job) => job.assignedProfessionalId),
    ...engagementRows.filter((engagement) => engagement.status !== "cancelled").map((engagement) => engagement.professionalId),
  ].filter((id): id is number => typeof id === "number")));
  const hiredProfessionals = hiredProfessionalIds.length
    ? await db.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, isVerified: users.isVerified }).from(users).where(inArray(users.id, hiredProfessionalIds))
    : [];
  const hiredProfessionalById = new Map(hiredProfessionals.map((professional) => [professional.id, professional]));

  const groupByJob = <T extends { jobId: number }>(rows: T[]) => {
    const grouped = new Map<number, T[]>();
    for (const row of rows) grouped.set(row.jobId, [...(grouped.get(row.jobId) ?? []), row]);
    return grouped;
  };
  const applicationsByJob = groupByJob(applicationRows);
  const shortlistsByJob = groupByJob(shortlistRows);
  const interviewsByJob = groupByJob(interviewRows);
  const offersByJob = groupByJob(offerRows);
  const engagementsByJob = groupByJob(engagementRows);
  const escrowsByJob = groupByJob(escrowRows);
  const conversationsByJob = groupByJob(conversationRows);
  const now = Date.now();

  const portfolio = managedJobs.map((job) => {
    const jobApplications = applicationsByJob.get(job.id) ?? [];
    const jobShortlists = shortlistsByJob.get(job.id) ?? [];
    const jobInterviews = interviewsByJob.get(job.id) ?? [];
    const jobOffers = offersByJob.get(job.id) ?? [];
    const jobEngagements = engagementsByJob.get(job.id) ?? [];
    const jobEscrows = escrowsByJob.get(job.id) ?? [];
    const activeEngagement = jobEngagements.find((engagement) => engagement.status === "active") ?? jobEngagements.find((engagement) => engagement.status === "completed") ?? null;
    const currentEscrow = [...jobEscrows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;
    const hiredProfessionalId = activeEngagement?.professionalId ?? job.assignedProfessionalId;
    const hiredProfessional = hiredProfessionalId ? hiredProfessionalById.get(hiredProfessionalId) ?? null : null;
    const applicationCount = jobApplications.length;
    const awaitingReviewCount = jobApplications.filter((application) => application.status === "pending").length;
    const acceptedCount = jobApplications.filter((application) => application.status === "accepted").length;
    const shortlistCount = jobShortlists.length;
    const interviewCount = jobInterviews.filter((interview) => interview.status !== "cancelled").length;
    const offerCount = jobOffers.filter((offer) => offer.status === "pending" || offer.status === "accepted").length;
    const hiredCount = hiredProfessionalId || acceptedCount > 0 || jobEngagements.some((engagement) => engagement.status !== "cancelled") ? 1 : 0;
    const hasHiringActivity = shortlistCount > 0 || interviewCount > 0 || offerCount > 0 || acceptedCount > 0;
    const isInProgress = job.status === "in_progress" || Boolean(activeEngagement?.status === "active");
    const isCompleted = job.status === "completed" || Boolean(activeEngagement?.status === "completed");
    const fundingRequired = Boolean(activeEngagement?.status === "active") && (!currentEscrow || currentEscrow.status === "pending");
    const ageDays = Math.max(0, Math.floor((now - job.createdAt.getTime()) / 86_400_000));
    const staleWithoutApplicants = job.status === "open" && applicationCount === 0 && ageDays >= 7;
    const attention = fundingRequired
      ? { priority: 1, reason: "Escrow funding is required before protected work can proceed.", action: "Fund Escrow", href: `/payments?jobId=${job.id}` }
      : awaitingReviewCount > 0
        ? { priority: 2, reason: `${awaitingReviewCount} application${awaitingReviewCount === 1 ? "" : "s"} awaiting review.`, action: "Review Candidates", href: `/employer/jobs/${job.id}/candidates` }
        : staleWithoutApplicants
          ? { priority: 5, reason: `Open for ${ageDays} days without applications.`, action: "Find Talent", href: `/talent?jobId=${job.id}` }
          : null;
    const primaryAction = fundingRequired
      ? { label: "Fund Escrow", href: `/payments?jobId=${job.id}`, kind: "funding" as const }
      : job.status === "open" && applicationCount > 0
        ? { label: "Review Candidates", href: `/employer/jobs/${job.id}/candidates`, kind: "candidates" as const }
        : job.status === "open"
          ? { label: "Find Talent", href: `/talent?jobId=${job.id}`, kind: "talent" as const }
          : { label: isInProgress ? "View Active Job" : isCompleted ? "View Summary" : "View Job", href: `/jobs/${job.id}`, kind: "job" as const };
    const currentConversation = (conversationsByJob.get(job.id) ?? [])[0] ?? null;
    return {
      ...job,
      applicationCount,
      awaitingReviewCount,
      shortlistCount,
      interviewCount,
      offerCount,
      hiredCount,
      hasHiringActivity,
      isInProgress,
      isCompleted,
      ageDays,
      engagement: activeEngagement,
      hiredProfessional,
      escrow: currentEscrow,
      fundingRequired,
      attention,
      primaryAction,
      conversationId: currentConversation?.id ?? null,
    };
  });

  const summary = {
    total: portfolio.length,
    open: portfolio.filter((job) => job.status === "open").length,
    hiring: portfolio.filter((job) => job.status === "open" && job.hasHiringActivity).length,
    needsAttention: portfolio.filter((job) => Boolean(job.attention)).length,
    inProgress: portfolio.filter((job) => job.isInProgress).length,
    completed: portfolio.filter((job) => job.isCompleted).length,
    closed: portfolio.filter((job) => job.status === "cancelled").length,
    awaitingReview: portfolio.reduce((total, job) => total + job.awaitingReviewCount, 0),
    fundingRequired: portfolio.filter((job) => job.fundingRequired).length,
  };

  const normalizedQ = filters.q?.trim().toLowerCase();
  const normalizedLocation = filters.location?.trim().toLowerCase();
  let filtered = portfolio.filter((job) => {
    if (normalizedQ && ![job.title, job.vocation, job.location, String(job.id)].some((value) => value.toLowerCase().includes(normalizedQ))) return false;
    if (filters.status && filters.status !== "all") {
      if (filters.status === "hiring" ? !(job.status === "open" && job.hasHiringActivity) : filters.status === "attention" ? !job.attention : filters.status === "in_progress" ? !job.isInProgress : filters.status === "completed" ? !job.isCompleted : job.status !== filters.status) return false;
    }
    if (filters.vocation && job.vocation !== filters.vocation) return false;
    if (normalizedLocation && !job.location.toLowerCase().includes(normalizedLocation)) return false;
    if (filters.priority === "urgent" && !job.isUrgent) return false;
    if (filters.priority === "standard" && job.isUrgent) return false;
    if (filters.candidateActivity === "awaiting_review" && job.awaitingReviewCount === 0) return false;
    if (filters.candidateActivity === "has_applicants" && job.applicationCount === 0) return false;
    if (filters.candidateActivity === "no_applicants" && job.applicationCount !== 0) return false;
    if (filters.candidateActivity === "shortlisted" && job.shortlistCount === 0) return false;
    if (filters.candidateActivity === "hired" && job.hiredCount === 0) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (filters.sort === "newest") return b.createdAt.getTime() - a.createdAt.getTime();
    if (filters.sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    if (filters.sort === "applicants") return b.applicationCount - a.applicationCount || b.updatedAt.getTime() - a.updatedAt.getTime();
    if (filters.sort === "budget_desc") return Number(b.budget) - Number(a.budget);
    if (filters.sort === "budget_asc") return Number(a.budget) - Number(b.budget);
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
  const offset = Math.max(0, filters.offset ?? 0);
  const items = filtered.slice(offset, offset + limit);
  return {
    items,
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
    nextOffset: offset + limit < filtered.length ? offset + limit : null,
    summary,
    attention: portfolio.filter((job) => Boolean(job.attention)).sort((a, b) => (a.attention?.priority ?? 99) - (b.attention?.priority ?? 99)).slice(0, 8),
    locations: Array.from(new Set(portfolio.map((job) => job.location).filter(Boolean))).sort(),
    vocations: Array.from(new Set(portfolio.map((job) => job.vocation).filter(Boolean))).sort(),
    generatedAt: new Date(),
  };
}
