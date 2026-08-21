import { getDb } from "./db";
import { users, profiles, jobs, applications, engagements, escrowPayments, payouts, organizationMembers, organizationProjects, shortlists } from "../drizzle/schema";
import { eq, and, or, sql, gte, lte, desc } from "drizzle-orm";

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
