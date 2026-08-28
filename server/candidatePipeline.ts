import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import {
  applications,
  conversations,
  engagements,
  interviews,
  jobs,
  offers,
  organizationMembers,
  professionalExperiences,
  professionalPortfolios,
  professionalQualifications,
  professionalVerifications,
  profiles,
  reviews,
  shortlists,
  users,
} from "../drizzle/schema";
import { calculateExplainableJobMatch } from "../shared/jobMatching";
import { publicProfileMetadata } from "../shared/profile";
import { clampOffset, clampPageSize, getDb } from "./db";

export const CANDIDATE_PIPELINE_STAGES = ["all", "new", "shortlisted", "interview", "offer", "hired", "rejected"] as const;
export type CandidatePipelineStageFilter = (typeof CANDIDATE_PIPELINE_STAGES)[number];
export type CandidatePipelineStage = Exclude<CandidatePipelineStageFilter, "all"> | "withdrawn";

export type CandidatePipelineFilters = {
  q?: string;
  stage?: CandidatePipelineStageFilter;
  skill?: string;
  location?: string;
  minExperience?: number;
  availableOnly?: boolean;
  verifiedOnly?: boolean;
  minRating?: number;
  minBid?: number;
  maxBid?: number;
  fromDate?: Date;
  toDate?: Date;
  sort?: "best_match" | "newest" | "rating" | "experience" | "bid_low" | "match_high" | "updated";
  limit?: number;
  offset?: number;
};

export type CandidatePipelineViewer = {
  id: number;
  role: string;
  userType: string;
};

type DbClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const hiringAccountTypes = new Set(["client", "enterprise"]);
const administratorRoles = new Set(["admin", "SUPER_ADMIN"]);
const organizationCandidateRoles = new Set(["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER"]);
const organizationHireRoles = new Set(["OWNER", "ADMIN", "HIRING_MANAGER"]);

function ensureHiringAccount(viewer: CandidatePipelineViewer) {
  if (!hiringAccountTypes.has(viewer.userType) && !administratorRoles.has(viewer.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Candidate management is available to authorized hiring accounts." });
  }
}

export async function requireCandidatePipelineJob(viewer: CandidatePipelineViewer, jobId: number) {
  ensureHiringAccount(viewer);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Candidate data is temporarily unavailable." });
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });

  const isAdministrator = administratorRoles.has(viewer.role);
  let organizationRole: string | null = null;
  if (!isAdministrator && job.clientId !== viewer.id && job.organizationId) {
    const [membership] = await db.select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(and(
        eq(organizationMembers.organizationId, job.organizationId),
        eq(organizationMembers.userId, viewer.id),
        eq(organizationMembers.status, "active"),
      ))
      .limit(1);
    organizationRole = membership?.role ?? null;
  }

  const canManage = isAdministrator || job.clientId === viewer.id || Boolean(organizationRole && organizationCandidateRoles.has(organizationRole));
  if (!canManage) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to manage candidates for this job." });

  return {
    db,
    job,
    permissions: {
      canManage: true,
      canHire: isAdministrator || job.clientId === viewer.id || Boolean(organizationRole && organizationHireRoles.has(organizationRole)),
      canMessage: isAdministrator || job.clientId === viewer.id,
      organizationRole,
    },
  };
}

function stagePredicate(stage: CandidatePipelineStageFilter) {
  const shortlisted = sql`EXISTS (SELECT 1 FROM shortlists s WHERE s."jobId" = ${applications.jobId} AND s."professionalId" = ${applications.professionalId})`;
  const interviewed = sql`EXISTS (SELECT 1 FROM interviews i WHERE i."jobId" = ${applications.jobId} AND i."professionalId" = ${applications.professionalId} AND i.status <> 'cancelled')`;
  const offered = sql`EXISTS (SELECT 1 FROM offers o WHERE o."jobId" = ${applications.jobId} AND o."professionalId" = ${applications.professionalId} AND o.status IN ('pending', 'accepted'))`;
  const hired = sql`EXISTS (SELECT 1 FROM engagements e WHERE e."jobId" = ${applications.jobId} AND e."professionalId" = ${applications.professionalId} AND e.status <> 'cancelled')`;
  if (stage === "new") return and(eq(applications.status, "pending"), sql`NOT ${shortlisted}`, sql`NOT ${interviewed}`, sql`NOT ${offered}`, sql`NOT ${hired}`);
  if (stage === "shortlisted") return and(eq(applications.status, "pending"), shortlisted, sql`NOT ${interviewed}`, sql`NOT ${offered}`, sql`NOT ${hired}`);
  if (stage === "interview") return and(eq(applications.status, "pending"), interviewed, sql`NOT ${offered}`, sql`NOT ${hired}`);
  if (stage === "offer") return and(eq(applications.status, "pending"), offered, sql`NOT ${hired}`);
  if (stage === "hired") return or(eq(applications.status, "accepted"), hired);
  if (stage === "rejected") return eq(applications.status, "rejected");
  return sql`${applications.status} <> 'withdrawn'`;
}

export function deriveCandidatePipelineStage(input: {
  applicationStatus: string;
  shortlisted: boolean;
  interviewStatus?: string | null;
  offerStatus?: string | null;
  engagementStatus?: string | null;
}): CandidatePipelineStage {
  if (input.applicationStatus === "withdrawn") return "withdrawn";
  if (input.applicationStatus === "rejected") return "rejected";
  if (input.applicationStatus === "accepted" || (input.engagementStatus && input.engagementStatus !== "cancelled")) return "hired";
  if (input.offerStatus === "pending" || input.offerStatus === "accepted") return "offer";
  if (input.interviewStatus && input.interviewStatus !== "cancelled") return "interview";
  if (input.shortlisted) return "shortlisted";
  return "new";
}

function parseSkills(value: string | null | undefined) {
  return Array.from(new Set((value ?? "").split(/[,;|\n]+/).map((item) => item.trim()).filter(Boolean))).slice(0, 20);
}

function latestByProfessional<T extends { professionalId: number; createdAt: Date }>(rows: T[]) {
  const map = new Map<number, T>();
  for (const row of rows) if (!map.has(row.professionalId)) map.set(row.professionalId, row);
  return map;
}

export async function getCandidatePipeline(viewer: CandidatePipelineViewer, jobId: number, filters: CandidatePipelineFilters = {}) {
  const { db, job, permissions } = await requireCandidatePipelineJob(viewer, jobId);
  const stage = filters.stage ?? "all";
  const conditions: any[] = [eq(applications.jobId, jobId), stagePredicate(stage)];
  const queryText = filters.q?.trim();
  if (queryText) {
    const pattern = `%${queryText}%`;
    conditions.push(sql`(${users.name} ILIKE ${pattern} OR ${profiles.vocation}::text ILIKE ${pattern} OR COALESCE(${profiles.skills}, '') ILIKE ${pattern} OR COALESCE(${profiles.bio}, '') ILIKE ${pattern})`);
  }
  if (filters.skill?.trim()) conditions.push(sql`COALESCE(${profiles.skills}, '') ILIKE ${`%${filters.skill.trim()}%`}`);
  if (filters.location?.trim()) conditions.push(sql`COALESCE(${profiles.location}, '') ILIKE ${`%${filters.location.trim()}%`}`);
  if (filters.minExperience !== undefined) conditions.push(gte(profiles.yearsExperience, filters.minExperience));
  if (filters.availableOnly) conditions.push(eq(profiles.isAvailable, true));
  if (filters.verifiedOnly) conditions.push(eq(users.isVerified, true));
  if (filters.minRating !== undefined) conditions.push(and(gte(profiles.averageRating, String(filters.minRating)), gte(profiles.totalReviews, 1)) as any);
  if (filters.minBid !== undefined) conditions.push(gte(applications.bidAmount, String(filters.minBid)));
  if (filters.maxBid !== undefined) conditions.push(lte(applications.bidAmount, String(filters.maxBid)));
  if (filters.fromDate) conditions.push(gte(applications.createdAt, filters.fromDate));
  if (filters.toDate) conditions.push(lte(applications.createdAt, filters.toDate));

  const scoreExpression = sql<number>`(
    CASE WHEN ${profiles.vocation} = ${job.vocation} THEN 45 ELSE 0 END +
    CASE WHEN LOWER(COALESCE(${profiles.location}, '')) LIKE ${`%${job.location.toLowerCase()}%`} THEN 15 ELSE 0 END +
    CASE WHEN ${profiles.isAvailable} = true THEN 5 ELSE 0 END +
    CASE WHEN ${users.isVerified} = true THEN 10 ELSE 0 END +
    LEAST(10, COALESCE(${profiles.yearsExperience}, 0)) +
    LEAST(15, ROUND(COALESCE(${profiles.averageRating}, 0) / 5 * 15))
  )`;
  const orderBy = filters.sort === "newest"
    ? [desc(applications.createdAt), desc(applications.id)]
    : filters.sort === "rating"
      ? [desc(profiles.averageRating), desc(profiles.totalReviews), desc(applications.createdAt)]
      : filters.sort === "experience"
        ? [desc(profiles.yearsExperience), desc(applications.createdAt)]
        : filters.sort === "bid_low"
          ? [asc(applications.bidAmount), desc(applications.createdAt)]
          : filters.sort === "updated"
            ? [desc(applications.updatedAt), desc(applications.id)]
            : [desc(scoreExpression), desc(applications.createdAt), desc(applications.id)];

  const limit = clampPageSize(filters.limit, 25);
  const offset = clampOffset(filters.offset);
  const [rows, totalRows, summaryRows] = await Promise.all([
    db.select({ application: applications, professional: { id: users.id, name: users.name, avatarUrl: users.avatarUrl, isVerified: users.isVerified }, profile: profiles })
      .from(applications)
      .innerJoin(users, eq(users.id, applications.professionalId))
      .leftJoin(profiles, eq(profiles.userId, applications.professionalId))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(applications)
      .innerJoin(users, eq(users.id, applications.professionalId))
      .leftJoin(profiles, eq(profiles.userId, applications.professionalId))
      .where(and(...conditions)),
    db.select({
      applicants: sql<number>`count(*) filter (where ${applications.status} <> 'withdrawn')`,
      fresh: sql<number>`count(*) filter (where ${applications.status} = 'pending' and not exists (select 1 from shortlists s where s."jobId" = ${applications.jobId} and s."professionalId" = ${applications.professionalId}) and not exists (select 1 from interviews i where i."jobId" = ${applications.jobId} and i."professionalId" = ${applications.professionalId} and i.status <> 'cancelled') and not exists (select 1 from offers o where o."jobId" = ${applications.jobId} and o."professionalId" = ${applications.professionalId} and o.status in ('pending', 'accepted')))`,
      shortlisted: sql<number>`count(*) filter (where exists (select 1 from shortlists s where s."jobId" = ${applications.jobId} and s."professionalId" = ${applications.professionalId}))`,
      interviews: sql<number>`count(*) filter (where exists (select 1 from interviews i where i."jobId" = ${applications.jobId} and i."professionalId" = ${applications.professionalId} and i.status <> 'cancelled'))`,
      offers: sql<number>`count(*) filter (where exists (select 1 from offers o where o."jobId" = ${applications.jobId} and o."professionalId" = ${applications.professionalId} and o.status in ('pending', 'accepted')))`,
      hired: sql<number>`count(*) filter (where ${applications.status} = 'accepted' or exists (select 1 from engagements e where e."jobId" = ${applications.jobId} and e."professionalId" = ${applications.professionalId} and e.status <> 'cancelled'))`,
      rejected: sql<number>`count(*) filter (where ${applications.status} = 'rejected')`,
    }).from(applications).where(eq(applications.jobId, jobId)),
  ]);

  const professionalIds = rows.map((row) => row.application.professionalId);
  const applicationIds = rows.map((row) => row.application.id);
  const [shortlistRows, interviewRows, offerRows, engagementRows, conversationRows, portfolioRows, qualificationRows, experienceRows, verificationRows, reviewRows, completedRows] = await Promise.all([
    professionalIds.length ? db.select().from(shortlists).where(and(eq(shortlists.jobId, jobId), inArray(shortlists.professionalId, professionalIds))).orderBy(desc(shortlists.createdAt)) : Promise.resolve([]),
    professionalIds.length ? db.select().from(interviews).where(and(eq(interviews.jobId, jobId), inArray(interviews.professionalId, professionalIds))).orderBy(desc(interviews.createdAt)) : Promise.resolve([]),
    professionalIds.length ? db.select().from(offers).where(and(eq(offers.jobId, jobId), inArray(offers.professionalId, professionalIds))).orderBy(desc(offers.createdAt)) : Promise.resolve([]),
    professionalIds.length ? db.select().from(engagements).where(and(eq(engagements.jobId, jobId), inArray(engagements.professionalId, professionalIds))).orderBy(desc(engagements.createdAt)) : Promise.resolve([]),
    professionalIds.length ? db.select().from(conversations).where(and(eq(conversations.jobId, jobId), inArray(conversations.professionalId, professionalIds))).orderBy(desc(conversations.lastMessageAt)) : Promise.resolve([]),
    professionalIds.length ? db.select({ id: professionalPortfolios.id, userId: professionalPortfolios.userId, title: professionalPortfolios.title, description: professionalPortfolios.description, imageUrl: professionalPortfolios.imageUrl, projectUrl: professionalPortfolios.projectUrl, skills: professionalPortfolios.skills, createdAt: professionalPortfolios.createdAt }).from(professionalPortfolios).where(inArray(professionalPortfolios.userId, professionalIds)).orderBy(desc(professionalPortfolios.createdAt)).limit(limit * 4) : Promise.resolve([]),
    professionalIds.length ? db.select().from(professionalQualifications).where(inArray(professionalQualifications.userId, professionalIds)).orderBy(desc(professionalQualifications.createdAt)).limit(limit * 10) : Promise.resolve([]),
    professionalIds.length ? db.select().from(professionalExperiences).where(inArray(professionalExperiences.userId, professionalIds)).orderBy(desc(professionalExperiences.startDate)).limit(limit * 10) : Promise.resolve([]),
    professionalIds.length ? db.select({ userId: professionalVerifications.userId, verificationType: professionalVerifications.verificationType, status: professionalVerifications.status, expiresAt: professionalVerifications.expiresAt }).from(professionalVerifications).where(inArray(professionalVerifications.userId, professionalIds)).limit(limit * 10) : Promise.resolve([]),
    professionalIds.length ? db.select({ id: reviews.id, revieweeId: reviews.revieweeId, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }).from(reviews).where(inArray(reviews.revieweeId, professionalIds)).orderBy(desc(reviews.createdAt)).limit(limit * 10) : Promise.resolve([]),
    professionalIds.length ? db.select({ professionalId: jobs.assignedProfessionalId, count: sql<number>`count(*)` }).from(jobs).where(and(inArray(jobs.assignedProfessionalId, professionalIds), eq(jobs.status, "completed"))).groupBy(jobs.assignedProfessionalId) : Promise.resolve([]),
  ]);

  const shortlistByProfessional = new Map(shortlistRows.map((row) => [row.professionalId, row]));
  const interviewByProfessional = latestByProfessional(interviewRows);
  const offerByProfessional = latestByProfessional(offerRows);
  const engagementByProfessional = latestByProfessional(engagementRows);
  const conversationByProfessional = new Map(conversationRows.map((row) => [row.professionalId, row]));
  const completedByProfessional = new Map(completedRows.filter((row) => row.professionalId !== null).map((row) => [row.professionalId as number, Number(row.count)]));
  const groupByUser = <T extends { userId: number }>(items: T[]) => {
    const grouped = new Map<number, T[]>();
    for (const item of items) grouped.set(item.userId, [...(grouped.get(item.userId) ?? []), item]);
    return grouped;
  };
  const portfolioByUser = groupByUser(portfolioRows);
  const qualificationsByUser = groupByUser(qualificationRows);
  const experienceByUser = groupByUser(experienceRows);
  const verificationsByUser = groupByUser(verificationRows);
  const reviewsByUser = new Map<number, typeof reviewRows>();
  for (const review of reviewRows) reviewsByUser.set(review.revieweeId, [...(reviewsByUser.get(review.revieweeId) ?? []), review]);

  const items = rows.map(({ application, professional, profile }) => {
    const shortlist = shortlistByProfessional.get(application.professionalId) ?? null;
    const interview = interviewByProfessional.get(application.professionalId) ?? null;
    const offer = offerByProfessional.get(application.professionalId) ?? null;
    const engagement = engagementByProfessional.get(application.professionalId) ?? null;
    const stageValue = deriveCandidatePipelineStage({ applicationStatus: application.status, shortlisted: Boolean(shortlist), interviewStatus: interview?.status, offerStatus: offer?.status, engagementStatus: engagement?.status });
    const match = profile ? calculateExplainableJobMatch(profile, job) : { score: 0, reasons: [] };
    const candidateReviews = reviewsByUser.get(application.professionalId) ?? [];
    const verifiedItems = (verificationsByUser.get(application.professionalId) ?? []).filter((item) => item.status === "verified");
    const activity = [
      { type: "application", label: "Application submitted", occurredAt: application.createdAt },
      shortlist ? { type: "shortlist", label: "Candidate shortlisted", occurredAt: shortlist.createdAt } : null,
      interview ? { type: "interview", label: `Interview ${interview.status}`, occurredAt: interview.updatedAt } : null,
      offer ? { type: "offer", label: `Offer ${offer.status}`, occurredAt: offer.updatedAt } : null,
      engagement ? { type: "engagement", label: `Engagement ${engagement.status}`, occurredAt: engagement.updatedAt } : null,
      application.status === "rejected" ? { type: "status", label: "Application rejected", occurredAt: application.updatedAt } : null,
    ].filter((item): item is { type: string; label: string; occurredAt: Date } => Boolean(item)).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return {
      application,
      professional,
      profile: profile ? { ...profile, profileMetadata: publicProfileMetadata(profile.profileMetadata), skillsList: parseSkills(profile.skills) } : null,
      stage: stageValue,
      match,
      shortlist,
      interview,
      offer,
      engagement,
      conversationId: conversationByProfessional.get(application.professionalId)?.id ?? null,
      portfolio: (portfolioByUser.get(application.professionalId) ?? []).slice(0, 3),
      qualifications: qualificationsByUser.get(application.professionalId) ?? [],
      experience: experienceByUser.get(application.professionalId) ?? [],
      verifications: verificationsByUser.get(application.professionalId) ?? [],
      verifiedCount: verifiedItems.length,
      reviews: candidateReviews,
      completedJobs: completedByProfessional.get(application.professionalId) ?? 0,
      activity,
      actions: {
        canMessage: permissions.canMessage,
        canShortlist: application.status === "pending" && !shortlist && !engagement,
        canRemoveShortlist: Boolean(shortlist) && application.status === "pending" && !interview && !offer && !engagement,
        canInterview: application.status === "pending" && Boolean(shortlist) && !offer && !engagement,
        canOffer: application.status === "pending" && interview?.status === "completed" && !offer && !engagement,
        canHire: permissions.canHire && application.status === "pending" && Boolean(offer && ["pending", "accepted"].includes(offer.status)) && !engagement && !job.assignedProfessionalId,
        canReject: application.status === "pending" && !engagement,
      },
    };
  });

  const summary = {
    applicants: Number(summaryRows[0]?.applicants ?? 0),
    new: Number(summaryRows[0]?.fresh ?? 0),
    shortlisted: Number(summaryRows[0]?.shortlisted ?? 0),
    interviews: Number(summaryRows[0]?.interviews ?? 0),
    offers: Number(summaryRows[0]?.offers ?? 0),
    hired: Number(summaryRows[0]?.hired ?? 0),
    rejected: Number(summaryRows[0]?.rejected ?? 0),
  };
  const attention = [
    summary.new > 0 ? { id: "new", priority: 1, title: "New applicants", detail: `${summary.new} candidate${summary.new === 1 ? " has" : "s have"} not been reviewed yet.`, action: "Review new candidates", stage: "new" as const } : null,
    items.some((item) => item.interview?.status === "completed" && !item.offer) ? { id: "offer", priority: 2, title: "Candidates ready for an offer", detail: "A completed interview is ready for your next decision.", action: "Review candidates", stage: "interview" as const } : null,
    items.some((item) => !item.professional.isVerified) ? { id: "verification", priority: 3, title: "Verification visibility", detail: "One or more candidates do not currently show verified account status.", action: "Review candidate trust signals", stage: "all" as const } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    job,
    permissions,
    items,
    summary,
    attention,
    total: Number(totalRows[0]?.count ?? 0),
    limit,
    offset,
    hasMore: offset + limit < Number(totalRows[0]?.count ?? 0),
    nextOffset: offset + limit < Number(totalRows[0]?.count ?? 0) ? offset + limit : null,
    filters: {
      locations: Array.from(new Set(rows.map((row) => row.profile?.location).filter((value): value is string => Boolean(value)))).sort(),
      skills: Array.from(new Set(rows.flatMap((row) => parseSkills(row.profile?.skills)))).sort(),
    },
    generatedAt: new Date(),
    applicationIds,
  };
}

async function requirePipelineApplication(db: DbClient, jobId: number, applicationId: number) {
  const [application] = await db.select().from(applications).where(and(eq(applications.id, applicationId), eq(applications.jobId, jobId))).limit(1);
  if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Candidate application not found for this job." });
  return application;
}

export async function shortlistPipelineCandidate(viewer: CandidatePipelineViewer, jobId: number, applicationId: number) {
  const { db, job } = await requireCandidatePipelineJob(viewer, jobId);
  const application = await requirePipelineApplication(db, jobId, applicationId);
  if (application.status !== "pending") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only active applications can be shortlisted." });
  const [inserted] = await db.insert(shortlists).values({ jobId, employerId: job.clientId, professionalId: application.professionalId }).onConflictDoNothing().returning();
  const [existing] = inserted ? [inserted] : await db.select().from(shortlists).where(and(eq(shortlists.jobId, jobId), eq(shortlists.professionalId, application.professionalId))).limit(1);
  return { application, shortlist: existing, changed: Boolean(inserted) };
}

export async function removePipelineShortlist(viewer: CandidatePipelineViewer, jobId: number, applicationId: number) {
  const { db } = await requireCandidatePipelineJob(viewer, jobId);
  const application = await requirePipelineApplication(db, jobId, applicationId);
  const related = await Promise.all([
    db.select({ id: interviews.id }).from(interviews).where(and(eq(interviews.jobId, jobId), eq(interviews.professionalId, application.professionalId), sql`${interviews.status} <> 'cancelled'`)).limit(1),
    db.select({ id: offers.id }).from(offers).where(and(eq(offers.jobId, jobId), eq(offers.professionalId, application.professionalId), sql`${offers.status} <> 'declined'`)).limit(1),
  ]);
  if (related[0][0] || related[1][0]) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Candidates with an active interview or offer cannot be removed from the shortlist." });
  await db.delete(shortlists).where(and(eq(shortlists.jobId, jobId), eq(shortlists.professionalId, application.professionalId)));
  return { application, changed: true };
}

export async function updatePipelineShortlistNote(viewer: CandidatePipelineViewer, jobId: number, applicationId: number, notes: string) {
  const { db } = await requireCandidatePipelineJob(viewer, jobId);
  const application = await requirePipelineApplication(db, jobId, applicationId);
  const [updated] = await db.update(shortlists).set({ notes: notes.trim() || null }).where(and(eq(shortlists.jobId, jobId), eq(shortlists.professionalId, application.professionalId))).returning();
  if (!updated) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Shortlist this candidate before adding a private shortlist note." });
  return { application, shortlist: updated };
}

export async function schedulePipelineInterview(viewer: CandidatePipelineViewer, jobId: number, applicationId: number, input: { scheduledAt: Date; locationOrLink?: string; notes?: string }) {
  const { db, job } = await requireCandidatePipelineJob(viewer, jobId);
  const application = await requirePipelineApplication(db, jobId, applicationId);
  if (application.status !== "pending") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only active candidates can be interviewed." });
  const [shortlist] = await db.select({ id: shortlists.id }).from(shortlists).where(and(eq(shortlists.jobId, jobId), eq(shortlists.professionalId, application.professionalId))).limit(1);
  if (!shortlist) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Shortlist the candidate before scheduling an interview." });
  const [existing] = await db.select().from(interviews).where(and(eq(interviews.jobId, jobId), eq(interviews.professionalId, application.professionalId), sql`${interviews.status} IN ('proposed', 'confirmed')`)).orderBy(desc(interviews.createdAt)).limit(1);
  if (existing) return { application, interview: existing, created: false };
  const [interview] = await db.insert(interviews).values({ jobId, applicationId, employerId: job.clientId, professionalId: application.professionalId, scheduledAt: input.scheduledAt, locationOrLink: input.locationOrLink?.trim() || null, notes: input.notes?.trim() || null }).returning();
  return { application, interview, created: true };
}

export async function updatePipelineInterview(viewer: CandidatePipelineViewer, jobId: number, applicationId: number, interviewId: number, status: "proposed" | "confirmed" | "cancelled" | "completed") {
  const { db } = await requireCandidatePipelineJob(viewer, jobId);
  const application = await requirePipelineApplication(db, jobId, applicationId);
  const [interview] = await db.select().from(interviews).where(and(eq(interviews.id, interviewId), eq(interviews.jobId, jobId), eq(interviews.professionalId, application.professionalId))).limit(1);
  if (!interview) throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found for this candidate." });
  const allowed: Record<string, string[]> = { proposed: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"], cancelled: [], completed: [] };
  if (interview.status !== status && !allowed[interview.status]?.includes(status)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "That interview transition is not allowed." });
  if (interview.status === status) return { application, interview, changed: false };
  const [updated] = await db.update(interviews).set({ status, updatedAt: new Date() }).where(eq(interviews.id, interview.id)).returning();
  return { application, interview: updated, changed: true };
}

export async function createPipelineOffer(viewer: CandidatePipelineViewer, jobId: number, applicationId: number, input: { compensation: string; roleDescription: string; startDate: Date; duration?: string }) {
  const { db, job, permissions } = await requireCandidatePipelineJob(viewer, jobId);
  if (!permissions.canHire) throw new TRPCError({ code: "FORBIDDEN", message: "Hiring manager permission is required to make an offer." });
  const application = await requirePipelineApplication(db, jobId, applicationId);
  if (application.status !== "pending") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only active candidates can receive an offer." });
  const [completedInterview] = await db.select({ id: interviews.id }).from(interviews).where(and(eq(interviews.jobId, jobId), eq(interviews.professionalId, application.professionalId), eq(interviews.status, "completed"))).limit(1);
  if (!completedInterview) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete the candidate interview before making an offer." });
  const [existing] = await db.select().from(offers).where(and(eq(offers.jobId, jobId), eq(offers.professionalId, application.professionalId), sql`${offers.status} IN ('pending', 'accepted')`)).orderBy(desc(offers.createdAt)).limit(1);
  if (existing) return { application, offer: existing, created: false };
  const [offer] = await db.insert(offers).values({ jobId, applicationId, employerId: job.clientId, professionalId: application.professionalId, compensation: input.compensation, roleDescription: input.roleDescription.trim(), startDate: input.startDate, duration: input.duration?.trim() || null }).returning();
  return { application, offer, created: true };
}

export async function rejectPipelineCandidate(viewer: CandidatePipelineViewer, jobId: number, applicationId: number, reason?: string) {
  const { db } = await requireCandidatePipelineJob(viewer, jobId);
  const application = await requirePipelineApplication(db, jobId, applicationId);
  const [engagement] = await db.select({ id: engagements.id }).from(engagements).where(and(eq(engagements.jobId, jobId), eq(engagements.professionalId, application.professionalId), sql`${engagements.status} <> 'cancelled'`)).limit(1);
  if (engagement || application.status === "accepted") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A hired candidate cannot be rejected." });
  if (application.status === "rejected") return { application, changed: false, reason: reason?.trim() || null };
  if (application.status !== "pending") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This application cannot be rejected in its current state." });
  const [updated] = await db.update(applications).set({ status: "rejected", updatedAt: new Date() }).where(eq(applications.id, application.id)).returning();
  await Promise.all([
    db.update(interviews).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(interviews.jobId, jobId), eq(interviews.professionalId, application.professionalId), sql`${interviews.status} IN ('proposed', 'confirmed')`)),
    db.update(offers).set({ status: "declined", updatedAt: new Date() }).where(and(eq(offers.jobId, jobId), eq(offers.professionalId, application.professionalId), eq(offers.status, "pending"))),
  ]);
  return { application: updated, changed: true, reason: reason?.trim() || null };
}

export async function hirePipelineCandidate(viewer: CandidatePipelineViewer, jobId: number, applicationId: number) {
  const { db, job, permissions } = await requireCandidatePipelineJob(viewer, jobId);
  if (!permissions.canHire) throw new TRPCError({ code: "FORBIDDEN", message: "Hiring manager permission is required to hire a candidate." });
  const application = await requirePipelineApplication(db, jobId, applicationId);
  const [latestOffer] = await db.select().from(offers).where(and(eq(offers.jobId, jobId), eq(offers.professionalId, application.professionalId), sql`${offers.status} IN ('pending', 'accepted')`)).orderBy(desc(offers.createdAt)).limit(1);
  if (!latestOffer) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create an offer before hiring this candidate." });

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${jobId})`);
    const [lockedJob] = await tx.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    const [lockedApplication] = await tx.select().from(applications).where(and(eq(applications.id, applicationId), eq(applications.jobId, jobId))).limit(1);
    if (!lockedJob || !lockedApplication) throw new TRPCError({ code: "NOT_FOUND", message: "The job or candidate application no longer exists." });
    const [existingEngagement] = await tx.select().from(engagements).where(and(eq(engagements.jobId, jobId), eq(engagements.professionalId, lockedApplication.professionalId), sql`${engagements.status} <> 'cancelled'`)).limit(1);
    if (existingEngagement && lockedJob.assignedProfessionalId === lockedApplication.professionalId && lockedApplication.status === "accepted") {
      return { application: lockedApplication, engagement: existingEngagement, offer: latestOffer, changed: false };
    }
    if (lockedJob.assignedProfessionalId && lockedJob.assignedProfessionalId !== lockedApplication.professionalId) {
      throw new TRPCError({ code: "CONFLICT", message: "This position has already been filled." });
    }
    if (lockedApplication.status !== "pending" && lockedApplication.status !== "accepted") {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This candidate cannot be hired in the current state." });
    }
    const [engagement] = existingEngagement ? [existingEngagement] : await tx.insert(engagements).values({ jobId, offerId: latestOffer.id, employerId: job.clientId, professionalId: lockedApplication.professionalId, compensation: latestOffer.compensation, startDate: latestOffer.startDate }).returning();
    await tx.update(offers).set({ status: "accepted", updatedAt: new Date() }).where(eq(offers.id, latestOffer.id));
    const [acceptedApplication] = await tx.update(applications).set({ status: "accepted", updatedAt: new Date() }).where(eq(applications.id, lockedApplication.id)).returning();
    await tx.update(jobs).set({ status: "in_progress", assignedProfessionalId: lockedApplication.professionalId, updatedAt: new Date() }).where(eq(jobs.id, jobId));
    return { application: acceptedApplication, engagement, offer: { ...latestOffer, status: "accepted" as const }, changed: true };
  });
}

/**
 * Preserves the professional-side offer response route without allowing it to
 * create duplicate engagements after an employer has already completed the
 * Candidate Pipeline hire confirmation.
 */
export async function acceptOfferAndEnsureEngagement(professionalId: number, offerId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Offer data is temporarily unavailable." });
  const [offer] = await db.select().from(offers).where(and(eq(offers.id, offerId), eq(offers.professionalId, professionalId))).limit(1);
  if (!offer) throw new TRPCError({ code: "NOT_FOUND", message: "Offer not found." });
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${offer.jobId})`);
    const [job] = await tx.select().from(jobs).where(eq(jobs.id, offer.jobId)).limit(1);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    if (job.assignedProfessionalId && job.assignedProfessionalId !== professionalId) throw new TRPCError({ code: "CONFLICT", message: "This position has already been filled." });
    const [existing] = await tx.select().from(engagements).where(and(eq(engagements.jobId, offer.jobId), eq(engagements.professionalId, professionalId), sql`${engagements.status} <> 'cancelled'`)).limit(1);
    const [engagement] = existing ? [existing] : await tx.insert(engagements).values({ jobId: offer.jobId, offerId: offer.id, employerId: job.clientId, professionalId, compensation: offer.compensation, startDate: offer.startDate }).returning();
    const [updatedOffer] = offer.status === "accepted" ? [offer] : await tx.update(offers).set({ status: "accepted", updatedAt: new Date() }).where(eq(offers.id, offer.id)).returning();
    const [application] = offer.applicationId
      ? await tx.update(applications).set({ status: "accepted", updatedAt: new Date() }).where(and(eq(applications.id, offer.applicationId), eq(applications.jobId, offer.jobId), eq(applications.professionalId, professionalId))).returning()
      : await tx.update(applications).set({ status: "accepted", updatedAt: new Date() }).where(and(eq(applications.jobId, offer.jobId), eq(applications.professionalId, professionalId))).returning();
    await tx.update(jobs).set({ status: "in_progress", assignedProfessionalId: professionalId, updatedAt: new Date() }).where(eq(jobs.id, offer.jobId));
    return { offer: updatedOffer, engagement, application: application ?? null, changed: !existing || offer.status !== "accepted" };
  });
}
