import { drizzle } from "drizzle-orm/postgres-js";
import { and, or, inArray, desc, asc, eq, like, gte, lte, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  InsertUser,
  users,
  jobs,
  applications,
  savedJobs,
  jobReports,
  jobAlerts,
  shortlists,
  profiles,
  reviews,
  InsertJob,
  InsertApplication,
  InsertSavedJob,
  InsertJobReport,
  InsertJobAlert,
  InsertProfile,
  InsertReview,
  conversations,
  messages,
  escrowPayments,
  verificationRequests,
  InsertEscrowPayment,
  InsertVerificationRequest,
  EscrowPayment,
  VerificationRequest,
  products,
  orders,
  phoneOtps,
  emailOtps,
  Product,
  Order,
  InsertOrder,
  InsertProduct,
  disputes,
  InsertDispute,
  Dispute,
  auditLogs,
  InsertAuditLog,
  pushSubscriptions,
  InsertPushSubscription,
  professionalPortfolios,
  professionalQualifications,
  professionalExperiences,
  professionalVerifications,
  interviews,
  offers,
  engagements,
  milestones,
  paymentTransactions,
  payouts,
  professionalBankAccounts,
  organizations,
  organizationMembers,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { deriveApplicationStage, type ApplicationStage } from "../shared/applicationLifecycle";
import { calculateProfileCompletion, parseProfileMetadata, publicProfileMetadata } from "../shared/profile";
import { calculateExplainableJobMatch } from "../shared/jobMatching";

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export function clampPageSize(limit: number | undefined, fallback = DEFAULT_PAGE_SIZE) {
  const normalized = Number.isFinite(limit) ? Math.floor(limit as number) : fallback;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, normalized));
}

export function clampOffset(offset: number | undefined) {
  const normalized = Number.isFinite(offset) ? Math.floor(offset as number) : 0;
  return Math.max(0, normalized);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return undefined;

  // Use the canonical indexed equality predicate first. This avoids forcing
  // PostgreSQL to apply LOWER() to every row during OAuth/OTP sign-in.
  const exactResult = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (exactResult[0]) return exactResult[0];

  // Preserve compatibility with legacy rows stored with mixed-case email.
  try {
    const legacyResult = await db.select().from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`).limit(1);
    return legacyResult[0];
  } catch (error) {
    console.warn("[Database] Legacy case-insensitive email lookup failed:", error);
    return undefined;
  }
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const postgres = await import("postgres");
      const client = postgres.default(process.env.DATABASE_URL, {
        max: 1,            // Transaction pooler: keep pool size at 1
        idle_timeout: 20,  // Close idle connections after 20s
        connect_timeout: 10,
        prepare: false,    // Required for Supabase Transaction Pooler (pgbouncer)
      });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  // Deterministic transactional identity resolution:
  // 1. Check if user exists by openId
  // 2. Check if user exists by email (case-insensitive)
  // 3. Prevent duplicate key violations on users_openId_key and users_email_key
  
  const normalizedEmail = user.email ? user.email.trim().toLowerCase() : null;
  const isSuperAdmin = normalizedEmail === "minermikee777@gmail.com";
  const isAdmin = normalizedEmail === "jsavv50@gmail.com" || isSuperAdmin;

  // Step 1: Look up by openId
  const existingByOpenId = await getUserByOpenId(user.openId);
  // Step 2: Look up by email
  const existingByEmail = normalizedEmail ? await getUserByEmail(normalizedEmail) : undefined;

  if (existingByEmail && existingByOpenId && existingByEmail.id !== existingByOpenId.id) {
    // Collision case: the Google identity is attached to one local row while
    // the email belongs to another. This can happen after an earlier OAuth
    // account merge or when an account was first created by Email OTP.
    // Always detach the stale identity before attaching it to the email owner;
    // otherwise PostgreSQL raises users_openId_key and Google sign-in fails.
    const updateData: Record<string, unknown> = {
      openId: user.openId,
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };
    if (user.name !== undefined) updateData.name = user.name ?? null;
    if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod ?? null;
    if (isSuperAdmin) {
      updateData.role = "SUPER_ADMIN";
    } else if (isAdmin) {
      updateData.role = "admin";
    }

    const detachedOpenId = `detached_${Date.now()}_${existingByOpenId.id}`;
    await db.update(users)
      .set({ openId: detachedOpenId })
      .where(eq(users.id, existingByOpenId.id));
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, existingByEmail.id));
    return;
  }

  if (existingByEmail) {
    const updateData: Record<string, unknown> = {
      openId: user.openId,
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };
    if (user.name !== undefined) updateData.name = user.name ?? null;
    if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod ?? null;
    if (isSuperAdmin) {
      updateData.role = "SUPER_ADMIN";
    } else if (isAdmin) {
      updateData.role = "admin";
    }
    await db.update(users).set(updateData).where(eq(users.id, existingByEmail.id));
    return;
  }

  if (existingByOpenId) {
    const updateData: Record<string, unknown> = {
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };
    if (user.name !== undefined) updateData.name = user.name ?? null;
    if (user.email !== undefined) updateData.email = user.email ?? null;
    if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod ?? null;
    if (isSuperAdmin) {
      updateData.role = "SUPER_ADMIN";
    } else if (isAdmin) {
      updateData.role = "admin";
    }
    await db.update(users).set(updateData).where(eq(users.id, existingByOpenId.id));
    return;
  }

  // Insert new user
  const values: InsertUser = { openId: user.openId };
  if (user.name !== undefined) values.name = user.name ?? null;
  if (user.email !== undefined) values.email = user.email ?? null;
  if (user.loginMethod !== undefined) values.loginMethod = user.loginMethod ?? null;
  values.lastSignedIn = user.lastSignedIn ?? new Date();

  if (isSuperAdmin) {
    values.role = "SUPER_ADMIN";
  } else if (isAdmin) {
    values.role = "admin";
  } else if (user.role !== undefined) {
    values.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
  }

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        ...(user.name !== undefined ? { name: user.name ?? null } : {}),
        ...(user.email !== undefined ? { email: user.email ?? null } : {}),
        ...(user.loginMethod !== undefined ? { loginMethod: user.loginMethod ?? null } : {}),
        lastSignedIn: user.lastSignedIn ?? new Date(),
        ...(isSuperAdmin ? { role: "SUPER_ADMIN" } : {}),
      },
    });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}



export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserType(userId: number, userType: "client" | "professional" | "enterprise") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ userType }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "SUPER_ADMIN") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}
export async function updateUserName(userId: number, name: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; phone?: string; avatarUrl?: string }) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function getAllUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
}

export async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return Number(result[0]?.count ?? 0);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [created] = await db.insert(jobs).values(data).returning();
  return created;
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const [row] = await db.select({
      job: jobs,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
      .from(jobs)
      .leftJoin(organizations, eq(jobs.organizationId, organizations.id))
      .where(eq(jobs.id, id))
      .limit(1);
    if (!row) return undefined;
    return {
      ...row.job,
      organizationName: row.organizationName ?? undefined,
      organizationSlug: row.organizationSlug ?? undefined,
    };
  } catch (error) {
    console.error("[Jobs] getJobById database query failed", {
      jobId: id,
      error: error instanceof Error ? error.message.slice(0, 240) : "unknown_error",
    });
    throw error;
  }
}

export async function createJobReport(data: InsertJobReport) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [report] = await db.insert(jobReports).values(data).onConflictDoNothing({ target: [jobReports.jobId, jobReports.reporterId] }).returning();
  return report ?? { ...data, id: 0, status: data.status ?? "open", createdAt: new Date() };
}

export async function getProfessionalJobDetails(professionalId: number, jobId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const job = await getJobById(jobId);
  if (!job) return undefined;
  const [profile, application, saved, client, posted, completed, shortlist] = await Promise.all([
    getProfileByUserId(professionalId),
    getApplicationByJobAndProfessionalId(jobId, professionalId),
    isJobSaved(jobId, professionalId),
    db.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, isVerified: users.isVerified, createdAt: users.createdAt }).from(users).where(eq(users.id, job.clientId)).limit(1),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.clientId, job.clientId)),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.clientId, job.clientId), eq(jobs.status, "completed"))),
    db.select({ id: shortlists.id }).from(shortlists).where(and(eq(shortlists.jobId, jobId), eq(shortlists.professionalId, professionalId))).limit(1),
  ]);
  if (job.status !== "open" && !application) return undefined;
  const similarResult = job.status === "open" ? await searchJobs({ vocation: job.vocation, status: "open", sort: "newest", limit: 7, offset: 0 }) : { items: [] };
  const similar = similarResult.items.filter((item) => item.id !== job.id).slice(0, 6);
  return {
    job,
    application: application ?? null,
    shortlisted: shortlist.length > 0,
    isSaved: saved,
    match: profile ? calculateExplainableJobMatch(profile, job) : { score: 0, reasons: [] },
    similar,
    client: { ...client[0], jobsPosted: Number(posted[0]?.count ?? 0), completedJobs: Number(completed[0]?.count ?? 0) },
  };
}

export async function listJobs(filters: {
  vocation?: string;
  location?: string;
  status?: string;
  minBudget?: number;
  maxBudget?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.vocation) conditions.push(eq(jobs.vocation, filters.vocation as any));
  if (filters.status) conditions.push(eq(jobs.status, filters.status as any));
  if (filters.location) conditions.push(like(jobs.location, `%${filters.location}%`));
  if (filters.minBudget !== undefined) conditions.push(gte(jobs.budget, String(filters.minBudget)));
  if (filters.maxBudget !== undefined) conditions.push(lte(jobs.budget, String(filters.maxBudget)));

  const query = db
    .select()
    .from(jobs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobs.createdAt))
    .limit(clampPageSize(filters.limit))
    .offset(clampOffset(filters.offset));

  return query;
}

export type JobSearchFilters = {
  q?: string;
  vocation?: string;
  location?: string;
  status?: "open" | "in_progress" | "completed" | "cancelled";
  minBudget?: number;
  maxBudget?: number;
  isUrgent?: boolean;
  sort?: "newest" | "budget_desc" | "deadline";
  limit?: number;
  offset?: number;
};

export async function searchJobs(filters: JobSearchFilters) {
  const db = await getDb();
  if (!db) return { items: [], nextOffset: 0, hasMore: false };

  const conditions = [eq(jobs.status, filters.status ?? "open")];
  const queryText = filters.q?.trim();
  if (queryText) {
    const pattern = `%${queryText}%`;
    conditions.push(sql`(${jobs.title} ILIKE ${pattern} OR ${jobs.description} ILIKE ${pattern} OR ${jobs.vocation}::text ILIKE ${pattern})` as any);
  }
  if (filters.vocation) conditions.push(eq(jobs.vocation, filters.vocation as any));
  if (filters.location) conditions.push(sql`${jobs.location} ILIKE ${`%${filters.location.trim()}%`}` as any);
  if (filters.minBudget !== undefined) conditions.push(gte(jobs.budget, String(filters.minBudget)));
  if (filters.maxBudget !== undefined) conditions.push(lte(jobs.budget, String(filters.maxBudget)));
  if (filters.isUrgent !== undefined) conditions.push(eq(jobs.isUrgent, filters.isUrgent));

  const limit = clampPageSize(filters.limit);
  const offset = clampOffset(filters.offset);
  const orderBy = filters.sort === "budget_desc"
    ? desc(jobs.budget)
    : filters.sort === "deadline"
      ? asc(jobs.deadline)
      : desc(jobs.createdAt);

  const rows = await db.select({
    job: jobs,
    clientName: users.name,
    clientVerified: users.isVerified,
    organizationName: organizations.name,
    organizationSlug: organizations.slug,
  })
    .from(jobs)
    .leftJoin(users, eq(jobs.clientId, users.id))
    .leftJoin(organizations, eq(jobs.organizationId, organizations.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(row => ({
    ...row.job,
    clientName: row.clientName ?? undefined,
    clientVerified: Boolean(row.clientVerified),
    organizationName: row.organizationName ?? undefined,
    organizationSlug: row.organizationSlug ?? undefined,
  }));
  return { items, nextOffset: hasMore ? offset + limit : null, hasMore };
}

export type TalentSearchFilters = {
  q?: string;
  vocation?: string;
  location?: string;
  availableOnly?: boolean;
  verifiedOnly?: boolean;
  minRate?: number;
  maxRate?: number;
  minExperience?: number;
  sort?: "relevance" | "rating" | "experience" | "newest";
  limit?: number;
  offset?: number;
};

export async function searchProfessionals(filters: TalentSearchFilters) {
  const db = await getDb();
  if (!db) return { items: [], nextOffset: 0, hasMore: false };
  const conditions = [eq(users.userType, "professional"), sql`(${profiles.profileMetadata} IS NULL OR ${profiles.profileMetadata}->>'visibility' IS DISTINCT FROM 'hidden')` as any];
  const queryText = filters.q?.trim();
  if (queryText) {
    const pattern = `%${queryText}%`;
    conditions.push(sql`(${users.name} ILIKE ${pattern} OR ${profiles.bio} ILIKE ${pattern} OR ${profiles.skills} ILIKE ${pattern} OR ${profiles.vocation}::text ILIKE ${pattern})` as any);
  }
  if (filters.vocation) conditions.push(eq(profiles.vocation, filters.vocation as any));
  if (filters.location) conditions.push(sql`${profiles.location} ILIKE ${`%${filters.location.trim()}%`}` as any);
  if (filters.availableOnly) conditions.push(eq(profiles.isAvailable, true));
  if (filters.verifiedOnly) conditions.push(eq(users.isVerified, true));
  if (filters.minRate !== undefined) conditions.push(gte(profiles.hourlyRate, String(filters.minRate)));
  if (filters.maxRate !== undefined) conditions.push(lte(profiles.hourlyRate, String(filters.maxRate)));
  if (filters.minExperience !== undefined) conditions.push(gte(profiles.yearsExperience, filters.minExperience));

  const limit = clampPageSize(filters.limit);
  const offset = clampOffset(filters.offset);
  const orderBy = filters.sort === "rating"
    ? desc(profiles.averageRating)
    : filters.sort === "experience"
      ? desc(profiles.yearsExperience)
      : desc(profiles.updatedAt);
  const rows = await db.select({
    profile: profiles,
    user: {
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      isVerified: users.isVerified,
    },
  })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1)
    .offset(offset);
  const hasMore = rows.length > limit;
  const visibleItems = (hasMore ? rows.slice(0, limit) : rows).map((item) => ({ ...item, profile: { ...item.profile, profileMetadata: publicProfileMetadata(item.profile.profileMetadata) } }));
  return {
    items: visibleItems,
    nextOffset: hasMore ? offset + limit : null,
    hasMore,
  };
}

export async function getPublicProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select({ profile: profiles }).from(profiles).innerJoin(users, eq(profiles.userId, users.id)).where(and(eq(profiles.userId, userId), eq(users.userType, "professional"), sql`(${profiles.profileMetadata} IS NULL OR ${profiles.profileMetadata}->>'visibility' IS DISTINCT FROM 'hidden')`)).limit(1);
  return row ? { ...row.profile, profileMetadata: publicProfileMetadata(row.profile.profileMetadata) } : undefined;
}

export async function getPublicProfessionalProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select({
    profile: profiles,
    user: {
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      isVerified: users.isVerified,
      userType: users.userType,
    },
  })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(and(eq(profiles.userId, userId), eq(users.userType, "professional"), sql`(${profiles.profileMetadata} IS NULL OR ${profiles.profileMetadata}->>'visibility' IS DISTINCT FROM 'hidden')`))
    .limit(1);
  if (!row) return undefined;

  const [portfolioRows, qualificationRows, experienceRows, verificationRows, reviewRows, completedRows] = await Promise.all([
    db.select({ id: professionalPortfolios.id, title: professionalPortfolios.title, description: professionalPortfolios.description, imageUrl: professionalPortfolios.imageUrl, projectUrl: professionalPortfolios.projectUrl, skills: professionalPortfolios.skills, createdAt: professionalPortfolios.createdAt }).from(professionalPortfolios).where(eq(professionalPortfolios.userId, userId)).orderBy(desc(professionalPortfolios.createdAt)).limit(20),
    db.select({ id: professionalQualifications.id, title: professionalQualifications.title, issuingOrg: professionalQualifications.issuingOrg, issueDate: professionalQualifications.issueDate, expiryDate: professionalQualifications.expiryDate, credentialId: professionalQualifications.credentialId, createdAt: professionalQualifications.createdAt }).from(professionalQualifications).where(eq(professionalQualifications.userId, userId)).orderBy(desc(professionalQualifications.createdAt)).limit(20),
    db.select({ id: professionalExperiences.id, companyName: professionalExperiences.companyName, title: professionalExperiences.title, location: professionalExperiences.location, startDate: professionalExperiences.startDate, endDate: professionalExperiences.endDate, isCurrent: professionalExperiences.isCurrent, description: professionalExperiences.description }).from(professionalExperiences).where(eq(professionalExperiences.userId, userId)).orderBy(desc(professionalExperiences.startDate)).limit(20),
    db.select({ verificationType: professionalVerifications.verificationType, status: professionalVerifications.status, expiresAt: professionalVerifications.expiresAt }).from(professionalVerifications).where(eq(professionalVerifications.userId, userId)).limit(20),
    db.select({ rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt }).from(reviews).where(eq(reviews.revieweeId, userId)).orderBy(desc(reviews.createdAt)).limit(20),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.assignedProfessionalId, userId), eq(jobs.status, "completed"))),
  ]);

  return {
    ...row,
    profile: { ...row.profile, profileMetadata: publicProfileMetadata(row.profile.profileMetadata) },
    portfolio: portfolioRows,
    qualifications: qualificationRows,
    experience: experienceRows,
    verifications: verificationRows,
    reviews: reviewRows,
    completedJobs: Number(completedRows[0]?.count ?? 0),
  };
}

export async function getPublicOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [organization] = await db.select().from(organizations).where(sql`LOWER(${organizations.slug}) = LOWER(${slug.trim()})`).limit(1);
  if (!organization) return undefined;
  const activeJobs = await db.select({
    job: jobs,
    clientName: users.name,
    clientVerified: users.isVerified,
  })
    .from(jobs)
    .leftJoin(users, eq(jobs.clientId, users.id))
    .where(and(eq(jobs.organizationId, organization.id), eq(jobs.status, "open")))
    .orderBy(desc(jobs.createdAt))
    .limit(20);
  const [memberCountRow, activeJobCountRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, organization.id), eq(organizationMembers.status, "active"))),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.organizationId, organization.id), eq(jobs.status, "open"))),
  ]);
  return {
    organization: { ...organization, ownerId: undefined },
    activeJobs: activeJobs.map(row => ({ ...row.job, clientName: row.clientName ?? undefined, clientVerified: Boolean(row.clientVerified) })),
    stats: { activeJobs: Number(activeJobCountRow[0]?.count ?? 0), activeMembers: Number(memberCountRow[0]?.count ?? 0) },
  };
}

export async function updateOrganizationProfile(organizationId: number, data: { name?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [updated] = await db.update(organizations).set({ ...data, updatedAt: new Date() }).where(eq(organizations.id, organizationId)).returning();
  return updated;
}

export async function getJobsByClientId(clientId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.clientId, clientId)).orderBy(desc(jobs.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function getManagedJobsByUserId(userId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  const memberships = await db.select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")));
  const organizationIds = memberships.map((membership) => membership.organizationId);
  const scope = organizationIds.length > 0
    ? or(eq(jobs.clientId, userId), inArray(jobs.organizationId, organizationIds))
    : eq(jobs.clientId, userId);
  return db.select().from(jobs).where(scope).orderBy(desc(jobs.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function updateJob(id: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobs).set(data).where(eq(jobs.id, id));
}

export async function deleteJob(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(jobs).where(eq(jobs.id, id));
}

export async function getJobCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(jobs);
  return Number(result[0]?.count ?? 0);
}

// ─── Saved Jobs ────────────────────────────────────────────────────────────────
export async function isJobSaved(jobId: number, professionalId: number) {
  const db = await getDb();
  if (!db) return false;
  const [saved] = await db.select({ id: savedJobs.id })
    .from(savedJobs)
    .where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.professionalId, professionalId)))
    .limit(1);
  return Boolean(saved);
}

export async function saveJob(data: InsertSavedJob) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(savedJobs).values(data).onConflictDoNothing({ target: [savedJobs.jobId, savedJobs.professionalId] });
  return { saved: true };
}

export async function unsaveJob(jobId: number, professionalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(savedJobs).where(and(eq(savedJobs.jobId, jobId), eq(savedJobs.professionalId, professionalId)));
  return { saved: false };
}

export async function getSavedJobIds(professionalId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ jobId: savedJobs.jobId })
    .from(savedJobs)
    .where(eq(savedJobs.professionalId, professionalId))
    .orderBy(desc(savedJobs.createdAt));
  return rows.map((row) => row.jobId);
}

export async function getSavedJobsByProfessionalId(professionalId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return { items: [], nextOffset: null, hasMore: false };
  const rows = await db.select({
    job: jobs,
    clientName: users.name,
    clientVerified: users.isVerified,
    organizationName: organizations.name,
    organizationSlug: organizations.slug,
  })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .leftJoin(users, eq(jobs.clientId, users.id))
    .leftJoin(organizations, eq(jobs.organizationId, organizations.id))
    .where(eq(savedJobs.professionalId, professionalId))
    .orderBy(desc(savedJobs.createdAt))
    .limit(clampPageSize(limit) + 1)
    .offset(clampOffset(offset));
  const pageSize = clampPageSize(limit);
  const hasMore = rows.length > pageSize;
  return {
    items: (hasMore ? rows.slice(0, pageSize) : rows).map((row) => ({
      ...row.job,
      clientName: row.clientName ?? undefined,
      clientVerified: Boolean(row.clientVerified),
      organizationName: row.organizationName ?? undefined,
      organizationSlug: row.organizationSlug ?? undefined,
    })),
    nextOffset: hasMore ? clampOffset(offset) + pageSize : null,
    hasMore,
  };
}

export type ProfessionalJobSignal = {
  applicationStatus?: string;
  shortlisted: boolean;
};

export async function getProfessionalJobSignals(professionalId: number, jobIds: number[]) {
  const db = await getDb();
  if (!db || jobIds.length === 0) return new Map<number, ProfessionalJobSignal>();
  const [applicationRows, shortlistRows] = await Promise.all([
    db.select({ jobId: applications.jobId, status: applications.status })
      .from(applications)
      .where(and(eq(applications.professionalId, professionalId), inArray(applications.jobId, jobIds), sql`${applications.status} != 'withdrawn'`)),
    db.select({ jobId: shortlists.jobId })
      .from(shortlists)
      .where(and(eq(shortlists.professionalId, professionalId), inArray(shortlists.jobId, jobIds))),
  ]);
  const signals = new Map<number, ProfessionalJobSignal>();
  for (const row of applicationRows) signals.set(row.jobId, { applicationStatus: row.status, shortlisted: false });
  for (const row of shortlistRows) signals.set(row.jobId, { ...(signals.get(row.jobId) ?? {}), shortlisted: true });
  return signals;
}

export async function getProfessionalMarketplaceActivity(professionalId: number) {
  const db = await getDb();
  if (!db) return { activeApplications: 0, shortlistedJobs: 0, newOpportunities: 0 };
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [activeApplications, shortlistedJobs, newOpportunities] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(applications).where(and(eq(applications.professionalId, professionalId), sql`${applications.status} IN ('pending', 'accepted')`)),
    db.select({ count: sql<number>`count(*)` }).from(shortlists).where(eq(shortlists.professionalId, professionalId)),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.status, "open"), gte(jobs.createdAt, since))),
  ]);
  return {
    activeApplications: Number(activeApplications[0]?.count ?? 0),
    shortlistedJobs: Number(shortlistedJobs[0]?.count ?? 0),
    newOpportunities: Number(newOpportunities[0]?.count ?? 0),
  };
}

export async function listJobAlerts(professionalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobAlerts).where(eq(jobAlerts.professionalId, professionalId)).orderBy(desc(jobAlerts.updatedAt));
}

export async function createJobAlert(data: InsertJobAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [alert] = await db.insert(jobAlerts).values(data)
    .onConflictDoUpdate({ target: [jobAlerts.professionalId, jobAlerts.name], set: { q: data.q, vocation: data.vocation, location: data.location, currency: data.currency, isUrgentOnly: data.isUrgentOnly ?? false, isActive: true, updatedAt: new Date() } })
    .returning();
  return alert;
}

export async function updateJobAlert(professionalId: number, id: number, data: Partial<InsertJobAlert>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [alert] = await db.update(jobAlerts).set({ ...data, updatedAt: new Date() }).where(and(eq(jobAlerts.id, id), eq(jobAlerts.professionalId, professionalId))).returning();
  return alert;
}

export async function deleteJobAlert(professionalId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(jobAlerts).where(and(eq(jobAlerts.id, id), eq(jobAlerts.professionalId, professionalId)));
  return { success: true };
}

// ─── Applications ─────────────────────────────────────────────────────────────
export async function hasActiveApplication(jobId: number, professionalId: number) {
  const db = await getDb();
  if (!db) return false;
  const [existing] = await db.select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.jobId, jobId), eq(applications.professionalId, professionalId), sql`${applications.status} != 'withdrawn'`))
    .limit(1);
  return Boolean(existing);
}

export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const duplicate = await hasActiveApplication(data.jobId, data.professionalId);
  if (duplicate) {
    throw new Error("You already have an active application for this job.");
  }
  const [inserted] = await db.insert(applications).values(data).returning();
  return inserted ?? { id: 0, ...data };
}

export async function getDetailedApplicationsByJobId(jobId: number, limit = MAX_PAGE_SIZE, offset = 0, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(applications.jobId, jobId)];
  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(applications.status, statusFilter as any));
  }
  const rows = await db.select({
    application: applications,
    professional: {
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      isVerified: users.isVerified,
    },
    profile: profiles,
  })
    .from(applications)
    .innerJoin(users, eq(applications.professionalId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(applications.createdAt))
    .limit(clampPageSize(limit, MAX_PAGE_SIZE))
    .offset(clampOffset(offset));

  return rows.map(r => ({
    ...r.application,
    professional: r.professional,
    profile: r.profile,
  }));
}

export async function getDetailedApplicationsByProfessionalId(professionalId: number, limit = MAX_PAGE_SIZE, offset = 0, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(applications.professionalId, professionalId)];
  if (statusFilter && statusFilter !== "all") {
    conditions.push(eq(applications.status, statusFilter as any));
  }
  const rows = await db.select({
    application: applications,
    job: {
      id: jobs.id,
      title: jobs.title,
      location: jobs.location,
      budget: jobs.budget,
      status: jobs.status,
      clientId: jobs.clientId,
      organizationId: jobs.organizationId,
    },
    client: {
      name: users.name,
      isVerified: users.isVerified,
    },
  })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(users, eq(jobs.clientId, users.id))
    .where(and(...conditions))
    .orderBy(desc(applications.createdAt))
    .limit(clampPageSize(limit, MAX_PAGE_SIZE))
    .offset(clampOffset(offset));

  return rows.map(r => ({
    ...r.application,
    job: r.job,
    employerName: r.client?.name ?? "Employer",
    employerVerified: Boolean(r.client?.isVerified),
  }));
}

export type ProfessionalApplicationFilters = {
  q?: string;
  status?: string;
  vocation?: string;
  location?: string;
  employer?: string;
  fromDate?: Date;
  toDate?: Date;
  minBid?: number;
  maxBid?: number;
  paymentStatus?: string;
  sort?: "recent" | "oldest" | "updated" | "bid_high" | "bid_low";
  limit?: number;
  offset?: number;
};

export async function getProfessionalApplicationCommandCenter(professionalId: number, filters: ProfessionalApplicationFilters = {}) {
  const db = await getDb();
  if (!db) return { items: [], counts: {}, total: 0, hasMore: false, nextOffset: 0 };
  const conditions = [eq(applications.professionalId, professionalId)];
  const q = filters.q?.trim().toLowerCase();
  if (q) conditions.push(sql`(LOWER(${jobs.title}) LIKE ${`%${q}%`} OR LOWER(${jobs.description}) LIKE ${`%${q}%`} OR LOWER(${jobs.location}) LIKE ${`%${q}%`} OR LOWER(COALESCE(${users.name}, '')) LIKE ${`%${q}%`})` as any);
  if (filters.status && filters.status !== "all") {
    const statusMap: Record<string, string[]> = { submitted: ["pending"], under_review: ["pending"], shortlisted: ["pending"], interview: ["pending"], accepted: ["accepted"], active: ["accepted"], completed: ["accepted"], rejected: ["rejected"], withdrawn: ["withdrawn"] };
    const statuses = statusMap[filters.status];
    if (statuses?.length === 1) conditions.push(eq(applications.status, statuses[0] as any));
  }
  if (filters.vocation && filters.vocation !== "all") conditions.push(eq(jobs.vocation, filters.vocation as any));
  if (filters.location?.trim()) conditions.push(sql`LOWER(${jobs.location}) LIKE ${`%${filters.location.trim().toLowerCase()}%`}` as any);
  if (filters.employer?.trim()) conditions.push(sql`LOWER(COALESCE(${users.name}, '')) LIKE ${`%${filters.employer.trim().toLowerCase()}%`}` as any);
  if (filters.fromDate) conditions.push(gte(applications.createdAt, filters.fromDate));
  if (filters.toDate) conditions.push(lte(applications.createdAt, filters.toDate));
  if (filters.minBid !== undefined) conditions.push(gte(applications.bidAmount, String(filters.minBid)));
  if (filters.maxBid !== undefined) conditions.push(lte(applications.bidAmount, String(filters.maxBid)));
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    if (filters.paymentStatus === "none") conditions.push(sql`NOT EXISTS (SELECT 1 FROM escrow_payments ep WHERE ep."jobId" = ${applications.jobId} AND ep."professionalId" = ${professionalId})` as any);
    else conditions.push(sql`EXISTS (SELECT 1 FROM escrow_payments ep WHERE ep."jobId" = ${applications.jobId} AND ep."professionalId" = ${professionalId} AND ep."status" = ${filters.paymentStatus})` as any);
  }
  const base = db.select({
    application: applications,
    job: { id: jobs.id, title: jobs.title, description: jobs.description, vocation: jobs.vocation, location: jobs.location, budget: jobs.budget, currency: jobs.currency, status: jobs.status, clientId: jobs.clientId, deadline: jobs.deadline, assignedProfessionalId: jobs.assignedProfessionalId },
    employer: { id: users.id, name: users.name, isVerified: users.isVerified },
  }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).leftJoin(users, eq(jobs.clientId, users.id)).where(and(...conditions));
  const rows = await base.orderBy(filters.sort === "oldest" ? asc(applications.createdAt) : filters.sort === "updated" ? desc(applications.updatedAt) : filters.sort === "bid_high" ? desc(applications.bidAmount) : filters.sort === "bid_low" ? asc(applications.bidAmount) : desc(applications.createdAt)).limit(clampPageSize(filters.limit, MAX_PAGE_SIZE)).offset(clampOffset(filters.offset));
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).leftJoin(users, eq(jobs.clientId, users.id)).where(and(...conditions));
  const applicationIds = rows.map((row) => row.application.id);
  const jobIds = rows.map((row) => row.application.jobId);
  const [shortlistRows, interviewRows, offerRows, engagementRows, escrowRows] = await Promise.all([
    jobIds.length ? db.select().from(shortlists).where(and(eq(shortlists.professionalId, professionalId), inArray(shortlists.jobId, jobIds))) : [],
    applicationIds.length ? db.select().from(interviews).where(and(eq(interviews.professionalId, professionalId), inArray(interviews.applicationId, applicationIds))) : [],
    applicationIds.length ? db.select().from(offers).where(and(eq(offers.professionalId, professionalId), inArray(offers.applicationId, applicationIds))) : [],
    jobIds.length ? db.select().from(engagements).where(and(eq(engagements.professionalId, professionalId), inArray(engagements.jobId, jobIds))) : [],
    jobIds.length ? db.select().from(escrowPayments).where(and(eq(escrowPayments.professionalId, professionalId), inArray(escrowPayments.jobId, jobIds))) : [],
  ]);
  const shortlistJobs = new Set(shortlistRows.map((row) => row.jobId));
  const interviewByApplication = new Map(interviewRows.map((row) => [row.applicationId, row]));
  const offerByApplication = new Map(offerRows.map((row) => [row.applicationId, row]));
  const engagementByJob = new Map(engagementRows.map((row) => [row.jobId, row]));
  const escrowByJob = new Map(escrowRows.map((row) => [row.jobId, row]));
  const items = rows.map((row) => {
    const interview = interviewByApplication.get(row.application.id);
    const engagement = engagementByJob.get(row.application.jobId);
    const stage = deriveApplicationStage({ applicationStatus: row.application.status, jobStatus: row.job.status, shortlisted: shortlistJobs.has(row.application.jobId), interviewStatus: interview?.status, engagementStatus: engagement?.status });
    return { ...row.application, job: row.job, employerId: row.employer?.id ?? null, employerName: row.employer?.name ?? "Employer", employerVerified: Boolean(row.employer?.isVerified), stage, interview: interview ?? null, offer: offerByApplication.get(row.application.id) ?? null, engagement: engagement ?? null, escrow: escrowByJob.get(row.application.jobId) ?? null };
  }).filter((item) => !filters.status || filters.status === "all" || item.stage === filters.status);
  const countMap = await getProfessionalApplicationStageCounts(professionalId);
  return { items, counts: countMap, total: Number(total ?? 0), hasMore: Number(total ?? 0) > (filters.offset ?? 0) + rows.length, nextOffset: (filters.offset ?? 0) + rows.length };
}

export async function getProfessionalApplicationStageCounts(professionalId: number) {
  const db = await getDb();
  if (!db) return {} as Record<string, number>;
  const rows = await db.select({ application: applications, jobStatus: jobs.status }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.professionalId, professionalId));
  const jobIds = rows.map((row) => row.application.jobId);
  const applicationIds = rows.map((row) => row.application.id);
  const [shortlistRows, interviewRows, engagementRows] = await Promise.all([
    jobIds.length ? db.select({ jobId: shortlists.jobId }).from(shortlists).where(and(eq(shortlists.professionalId, professionalId), inArray(shortlists.jobId, jobIds))) : [],
    applicationIds.length ? db.select({ applicationId: interviews.applicationId, status: interviews.status }).from(interviews).where(and(eq(interviews.professionalId, professionalId), inArray(interviews.applicationId, applicationIds))) : [],
    jobIds.length ? db.select({ jobId: engagements.jobId, status: engagements.status }).from(engagements).where(and(eq(engagements.professionalId, professionalId), inArray(engagements.jobId, jobIds))) : [],
  ]);
  const shortlistedJobs = new Set(shortlistRows.map((row) => row.jobId));
  const interviewByApplication = new Map(interviewRows.map((row) => [row.applicationId, row.status]));
  const engagementByJob = new Map(engagementRows.map((row) => [row.jobId, row.status]));
  return rows.reduce<Record<string, number>>((counts, row) => {
    const stage = deriveApplicationStage({ applicationStatus: row.application.status, jobStatus: row.jobStatus, shortlisted: shortlistedJobs.has(row.application.jobId), interviewStatus: interviewByApplication.get(row.application.id), engagementStatus: engagementByJob.get(row.application.jobId) });
    counts[stage] = (counts[stage] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getProfessionalApplicationById(id: number, professionalId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select({
    application: applications,
    job: { id: jobs.id, title: jobs.title, description: jobs.description, vocation: jobs.vocation, location: jobs.location, budget: jobs.budget, currency: jobs.currency, status: jobs.status, clientId: jobs.clientId, deadline: jobs.deadline, assignedProfessionalId: jobs.assignedProfessionalId },
    employer: { id: users.id, name: users.name, isVerified: users.isVerified },
  }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).leftJoin(users, eq(jobs.clientId, users.id)).where(and(eq(applications.id, id), eq(applications.professionalId, professionalId))).limit(1);
  if (!row) return undefined;
  const [shortlist, interview, offer, engagement, escrow] = await Promise.all([
    db.select().from(shortlists).where(and(eq(shortlists.professionalId, professionalId), eq(shortlists.jobId, row.application.jobId))).limit(1),
    db.select().from(interviews).where(and(eq(interviews.professionalId, professionalId), eq(interviews.applicationId, row.application.id))).orderBy(desc(interviews.createdAt)).limit(1),
    db.select().from(offers).where(and(eq(offers.professionalId, professionalId), eq(offers.applicationId, row.application.id))).orderBy(desc(offers.createdAt)).limit(1),
    db.select().from(engagements).where(and(eq(engagements.professionalId, professionalId), eq(engagements.jobId, row.application.jobId))).orderBy(desc(engagements.createdAt)).limit(1),
    db.select().from(escrowPayments).where(and(eq(escrowPayments.professionalId, professionalId), eq(escrowPayments.jobId, row.application.jobId))).orderBy(desc(escrowPayments.createdAt)).limit(1),
  ]);
  const stage = deriveApplicationStage({ applicationStatus: row.application.status, jobStatus: row.job.status, shortlisted: Boolean(shortlist[0]), interviewStatus: interview[0]?.status, engagementStatus: engagement[0]?.status });
  return { ...row.application, job: row.job, employerId: row.employer?.id ?? null, employerName: row.employer?.name ?? "Employer", employerVerified: Boolean(row.employer?.isVerified), stage, shortlist: shortlist[0] ?? null, interview: interview[0] ?? null, offer: offer[0] ?? null, engagement: engagement[0] ?? null, escrow: escrow[0] ?? null };
}

export async function getApplicationByJobAndProfessionalId(jobId: number, professionalId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [application] = await db.select().from(applications).where(and(eq(applications.jobId, jobId), eq(applications.professionalId, professionalId))).orderBy(desc(applications.createdAt)).limit(1);
  return application;
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getApplicationsByJobId(jobId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applications).where(eq(applications.jobId, jobId)).orderBy(desc(applications.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function getApplicationsByProfessionalId(professionalId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applications).where(eq(applications.professionalId, professionalId)).orderBy(desc(applications.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function updateApplicationStatus(
  id: number,
  status: "pending" | "accepted" | "rejected" | "withdrawn"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(applications).set({ status }).where(eq(applications.id, id));
}

export async function getApplicationCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(applications);
  return Number(result[0]?.count ?? 0);
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
export async function createProfile(data: InsertProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(profiles).values(data);
}

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProfessionalProfileHub(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, avatarUrl: users.avatarUrl, userType: users.userType, role: users.role, isVerified: users.isVerified, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return undefined;
  const [profile, portfolio, experience, qualifications, verifications, reviews, activity, completedRows] = await Promise.all([
    getProfileByUserId(userId),
    getProfessionalPortfoliosByUserId(userId),
    getProfessionalExperiencesByUserId(userId),
    getProfessionalQualificationsByUserId(userId),
    getProfessionalVerificationsByUserId(userId),
    getReviewsByRevieweeId(userId, MAX_PAGE_SIZE, 0),
    getProfessionalMarketplaceActivity(userId),
    db.select({ count: sql<number>`count(*)` }).from(jobs).where(and(eq(jobs.assignedProfessionalId, userId), eq(jobs.status, "completed"))),
  ]);
  const approvedVerifications = verifications.filter((item) => item.status === "verified");
  const completion = calculateProfileCompletion({ avatarUrl: user.avatarUrl, profile, portfolioCount: portfolio.length, experienceCount: experience.length, qualificationCount: qualifications.length, verifiedCount: approvedVerifications.length });
  return {
    user,
    profile: profile ? { ...profile, profileMetadata: parseProfileMetadata(profile.profileMetadata) } : null,
    portfolio,
    experience,
    qualifications,
    verifications,
    reviews,
    activity,
    completedJobs: Number(completedRows[0]?.count ?? 0),
    completion,
    trust: { identityVerified: Boolean(user.isVerified), approvedVerifications: approvedVerifications.length, totalVerifications: verifications.length, reviewCount: reviews.length, averageRating: profile?.averageRating ? Number(profile.averageRating) : null },
  };
}

export async function updateProfile(userId: number, data: Partial<InsertProfile>) {
  const db = await getDb();
  if (!db) return;
  await db.update(profiles).set(data).where(eq(profiles.userId, userId));
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.jobId, data.jobId), eq(reviews.reviewerId, data.reviewerId))).limit(1);
  if (existing.length > 0) throw new Error("You have already reviewed this completed job.");
  return db.insert(reviews).values(data);
}

export async function getReviewsByRevieweeId(revieweeId: number, limit?: number, offset?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.revieweeId, revieweeId)).orderBy(desc(reviews.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────
type AdminStats = {
  totalUsers: number;
  clientCount: number;
  professionalCount: number;
  enterpriseCount: number;
  adminCount: number;
  unsetCount: number;
  totalJobs: number;
  openJobs: number;
  inProgressJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalApplications: number;
  pendingApplications: number;
  verifiedUsers: number;
  totalReviews: number;
  totalEscrowAmount: number;
  fundedEscrowAmount: number;
  pendingVerificationCount: number;
};

type AdminStatsRow = Record<keyof AdminStats, string | number | null>;

const EMPTY_ADMIN_STATS: AdminStats = {
  totalUsers: 0,
  clientCount: 0,
  professionalCount: 0,
  enterpriseCount: 0,
  adminCount: 0,
  unsetCount: 0,
  totalJobs: 0,
  openJobs: 0,
  inProgressJobs: 0,
  completedJobs: 0,
  cancelledJobs: 0,
  totalApplications: 0,
  pendingApplications: 0,
  verifiedUsers: 0,
  totalReviews: 0,
  totalEscrowAmount: 0,
  fundedEscrowAmount: 0,
  pendingVerificationCount: 0,
};

const ADMIN_STATS_TIMEOUT_MS = 3_000;
let adminStatsCache: AdminStats = { ...EMPTY_ADMIN_STATS };
let adminStatsInFlight: Promise<AdminStats> | null = null;

function adminStatsFromRow(row: AdminStatsRow | undefined): AdminStats {
  return {
    totalUsers: Number(row?.totalUsers ?? 0),
    clientCount: Number(row?.clientCount ?? 0),
    professionalCount: Number(row?.professionalCount ?? 0),
    enterpriseCount: Number(row?.enterpriseCount ?? 0),
    adminCount: Number(row?.adminCount ?? 0),
    unsetCount: Number(row?.unsetCount ?? 0),
    totalJobs: Number(row?.totalJobs ?? 0),
    openJobs: Number(row?.openJobs ?? 0),
    inProgressJobs: Number(row?.inProgressJobs ?? 0),
    completedJobs: Number(row?.completedJobs ?? 0),
    cancelledJobs: Number(row?.cancelledJobs ?? 0),
    totalApplications: Number(row?.totalApplications ?? 0),
    pendingApplications: Number(row?.pendingApplications ?? 0),
    verifiedUsers: Number(row?.verifiedUsers ?? 0),
    totalReviews: Number(row?.totalReviews ?? 0),
    totalEscrowAmount: Number(row?.totalEscrowAmount ?? 0),
    fundedEscrowAmount: Number(row?.fundedEscrowAmount ?? 0),
    pendingVerificationCount: Number(row?.pendingVerificationCount ?? 0),
  };
}

async function queryAdminStats(db: Awaited<ReturnType<typeof getDb>>): Promise<AdminStats> {
  if (!db) return adminStatsCache;

  // One statement is important here: Railway uses a single transaction-pooler
  // connection, so six concurrent Drizzle queries are still serialized by the
  // pooler and can exceed the request budget even when each query is bounded.
  const result = await db.execute(sql<AdminStatsRow>`
    SELECT
      (SELECT count(*) FROM ${users}) AS "totalUsers",
      (SELECT count(*) FILTER (WHERE ${users.userType} = 'client') FROM ${users}) AS "clientCount",
      (SELECT count(*) FILTER (WHERE ${users.userType} = 'professional') FROM ${users}) AS "professionalCount",
      (SELECT count(*) FILTER (WHERE ${users.userType} = 'enterprise') FROM ${users}) AS "enterpriseCount",
      (SELECT count(*) FILTER (WHERE ${users.role} IN ('admin', 'SUPER_ADMIN')) FROM ${users}) AS "adminCount",
      (SELECT count(*) FILTER (WHERE ${users.userType} = 'unset') FROM ${users}) AS "unsetCount",
      (SELECT count(*) FILTER (WHERE ${users.isVerified} = true) FROM ${users}) AS "verifiedUsers",
      (SELECT count(*) FROM ${jobs}) AS "totalJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'open') FROM ${jobs}) AS "openJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'in_progress') FROM ${jobs}) AS "inProgressJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'completed') FROM ${jobs}) AS "completedJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'cancelled') FROM ${jobs}) AS "cancelledJobs",
      (SELECT count(*) FROM ${applications}) AS "totalApplications",
      (SELECT count(*) FILTER (WHERE ${applications.status} = 'pending') FROM ${applications}) AS "pendingApplications",
      (SELECT count(*) FROM ${reviews}) AS "totalReviews",
      (SELECT coalesce(sum(${escrowPayments.amount}), 0) FROM ${escrowPayments}) AS "totalEscrowAmount",
      (SELECT coalesce(sum(${escrowPayments.amount}) FILTER (WHERE ${escrowPayments.status} IN ('funded', 'released')), 0) FROM ${escrowPayments}) AS "fundedEscrowAmount",
      (SELECT count(*) FILTER (WHERE ${verificationRequests.status} = 'pending') FROM ${verificationRequests}) AS "pendingVerificationCount"
  `);

  return adminStatsFromRow(result[0] as AdminStatsRow | undefined);
}

function getAdminStatsWithTimeout(query: Promise<AdminStats>): Promise<AdminStats> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(adminStatsCache), ADMIN_STATS_TIMEOUT_MS);
    query.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        console.warn("[AdminStats] Query failed; serving cached snapshot:", error);
        resolve(adminStatsCache);
      },
    );
  });
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!adminStatsInFlight) {
    adminStatsInFlight = (async () => {
      const db = await getDb();
      const nextStats = await queryAdminStats(db);
      adminStatsCache = nextStats;
      return nextStats;
    })().catch(error => {
      console.warn("[AdminStats] Database unavailable; serving cached snapshot:", error);
      return adminStatsCache;
    }).finally(() => {
      adminStatsInFlight = null;
    });
  }

  return getAdminStatsWithTimeout(adminStatsInFlight);
}



// ─── Conversations & Messages ─────────────────────────────────────────────────
const conversationClient = alias(users, "conversation_client");
const conversationProfessional = alias(users, "conversation_professional");

export async function getOrCreateConversation(jobId: number, clientId: number, professionalId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(conversations).where(
    and(eq(conversations.jobId, jobId), eq(conversations.clientId, clientId), eq(conversations.professionalId, professionalId))
  ).limit(1);
  if (existing[0]) return existing[0];
  const [inserted] = await db
    .insert(conversations)
    .values({ jobId, clientId, professionalId, lastMessageAt: new Date() })
    .returning();
  return inserted;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return conversation;
}

export type ConversationListFilters = { search?: string; unreadOnly?: boolean; jobsOnly?: boolean };

export async function getConversationsByUserId(userId: number, limit = MAX_PAGE_SIZE, offset = 0, filters: ConversationListFilters = {}) {
  const db = await getDb();
  if (!db) return [];
  const membership = or(eq(conversations.clientId, userId), eq(conversations.professionalId, userId));
  const conditions = [membership];
  if (filters.unreadOnly) conditions.push(sql`EXISTS (SELECT 1 FROM messages unread_messages WHERE unread_messages."conversationId" = ${conversations.id} AND unread_messages."isRead" = false AND unread_messages."senderId" <> ${userId})` as any);
  if (filters.jobsOnly) conditions.push(sql`${conversations.jobId} IS NOT NULL` as any);
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    conditions.push(or(
      sql`LOWER(COALESCE(${conversationClient.name}, '')) LIKE ${term}`,
      sql`LOWER(COALESCE(${conversationProfessional.name}, '')) LIKE ${term}`,
      sql`LOWER(COALESCE(${jobs.title}, '')) LIKE ${term}`,
      sql`LOWER(COALESCE(${jobs.location}, '')) LIKE ${term}`,
      sql`EXISTS (SELECT 1 FROM messages searched_messages WHERE searched_messages."conversationId" = ${conversations.id} AND LOWER(searched_messages."content") LIKE ${term})`,
    ) as any);
  }
  return db.select({
    id: conversations.id,
    jobId: conversations.jobId,
    clientId: conversations.clientId,
    professionalId: conversations.professionalId,
    lastMessageAt: conversations.lastMessageAt,
    createdAt: conversations.createdAt,
    clientName: conversationClient.name,
    clientAvatarUrl: conversationClient.avatarUrl,
    clientVerified: conversationClient.isVerified,
    professionalName: conversationProfessional.name,
    professionalAvatarUrl: conversationProfessional.avatarUrl,
    professionalVerified: conversationProfessional.isVerified,
    jobTitle: jobs.title,
    jobLocation: jobs.location,
    jobStatus: jobs.status,
    lastMessagePreview: sql<string | null>`(SELECT ${messages.content} FROM messages WHERE ${messages.conversationId} = ${conversations.id} ORDER BY ${messages.createdAt} DESC LIMIT 1)`,
    lastMessageSenderId: sql<number | null>`(SELECT ${messages.senderId} FROM messages WHERE ${messages.conversationId} = ${conversations.id} ORDER BY ${messages.createdAt} DESC LIMIT 1)`,
    unreadCount: sql<number>`count(case when ${messages.isRead} = false and ${messages.senderId} <> ${userId} then 1 end)`,
  }).from(conversations)
    .leftJoin(jobs, eq(jobs.id, conversations.jobId))
    .leftJoin(conversationClient, eq(conversationClient.id, conversations.clientId))
    .leftJoin(conversationProfessional, eq(conversationProfessional.id, conversations.professionalId))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(and(...conditions))
    .groupBy(conversations.id, conversations.jobId, conversations.clientId, conversations.professionalId, conversations.lastMessageAt, conversations.createdAt, conversationClient.name, conversationClient.avatarUrl, conversationClient.isVerified, conversationProfessional.name, conversationProfessional.avatarUrl, conversationProfessional.isVerified, jobs.title, jobs.location, jobs.status)
    .orderBy(desc(conversations.lastMessageAt))
    .limit(clampPageSize(limit, MAX_PAGE_SIZE))
    .offset(clampOffset(offset));
}

export async function getProfessionalConversationContext(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [conversation] = await db.select({ conversation: conversations, job: jobs, employer: conversationClient }).from(conversations)
    .innerJoin(jobs, eq(jobs.id, conversations.jobId))
    .leftJoin(conversationClient, eq(conversationClient.id, conversations.clientId))
    .where(and(eq(conversations.id, conversationId), eq(conversations.professionalId, userId)))
    .limit(1);
  if (!conversation) return undefined;
  const application = await getApplicationByJobAndProfessionalId(conversation.conversation.jobId, userId);
  const [reviewCount] = application ? await db.select({ count: sql<number>`count(*)` }).from(reviews).where(and(eq(reviews.jobId, conversation.conversation.jobId), eq(reviews.revieweeId, conversation.conversation.clientId))) : [{ count: 0 }];
  const escrow = await getEscrowByJobId(conversation.conversation.jobId);
  return { ...conversation, application: application ?? null, reviewCount: Number(reviewCount?.count ?? 0), escrow: escrow ?? null };
}

export async function markConversationMessagesRead(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages)
    .set({ isRead: true })
    .where(and(eq(messages.conversationId, conversationId), sql`${messages.senderId} != ${userId}`));
}

export async function getMessagesByConversationId(conversationId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt)).limit(clampPageSize(limit, 50)).offset(clampOffset(offset));
}

export async function createMessage(conversationId: number, senderId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [inserted] = await db.insert(messages).values({
    conversationId,
    senderId,
    content: content.trim(),
    isRead: false,
  }).returning();
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
  return inserted;
}

export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const userConvs = await db.select().from(conversations).where(
    or(eq(conversations.clientId, userId), eq(conversations.professionalId, userId))
  );
  if (!userConvs.length) return 0;
  const convIds = userConvs.map(c => c.id);
  let count = 0;
  for (const cid of convIds) {
    const unread = await db.select().from(messages).where(
      and(eq(messages.conversationId, cid), eq(messages.isRead, false))
    );
    const conv = userConvs.find(c => c.id === cid)!;
    const unreadFromOthers = unread.filter(m => m.senderId !== userId);
    count += unreadFromOthers.length;
  }
  return count;
}

// ─── Escrow Payments ──────────────────────────────────────────────────────────
export async function createEscrowPayment(data: InsertEscrowPayment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [inserted] = await db.insert(escrowPayments).values(data).returning();
  return inserted;
}

export async function getEscrowByJobId(jobId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(escrowPayments).where(eq(escrowPayments.jobId, jobId)).limit(1);
  return result[0] ?? null;
}

export async function getEscrowByReference(reference: string) {
  const db = await getDb();
  if (!db) return null;
  const [escrow] = await db.select().from(escrowPayments).where(eq(escrowPayments.paystackReference, reference)).limit(1);
  return escrow ?? null;
}

export async function updateEscrowStatus(id: number, status: EscrowPayment["status"], extra?: Partial<EscrowPayment>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(escrowPayments).set({ status, ...extra }).where(eq(escrowPayments.id, id));
}

export async function getAllEscrowPayments(limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(escrowPayments).orderBy(desc(escrowPayments.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

// ─── Verification Requests ────────────────────────────────────────────────────
export async function createVerificationRequest(data: InsertVerificationRequest) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [inserted] = await db.insert(verificationRequests).values(data).returning();
  return inserted;
}

export async function getVerificationRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [request] = await db.select().from(verificationRequests).where(eq(verificationRequests.id, id)).limit(1);
  return request;
}

export async function getVerificationRequestsByUserId(userId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(verificationRequests).where(eq(verificationRequests.userId, userId)).orderBy(desc(verificationRequests.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function getAllVerificationRequests(limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(verificationRequests).orderBy(desc(verificationRequests.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function updateVerificationRequest(id: number, data: Partial<VerificationRequest>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(verificationRequests).set(data).where(eq(verificationRequests.id, id));
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function listProducts(activeOnly = true, limit?: number, offset?: number) {
  const db = await getDb();
  if (!db) return [];
  const boundedLimit = clampPageSize(limit, MAX_PAGE_SIZE);
  const boundedOffset = clampOffset(offset);
  if (activeOnly) return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt)).limit(boundedLimit).offset(boundedOffset);
  return db.select().from(products).orderBy(desc(products.createdAt)).limit(boundedLimit).offset(boundedOffset);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [inserted] = await db.insert(products).values(data).returning();
  return inserted;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(products).where(eq(products.id, id));
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [inserted] = await db.insert(orders).values(data).returning();
  return inserted;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0];
}

export async function getOrderByReference(ref: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.paystackReference, ref)).limit(1);
  return result[0];
}

export async function getOrdersByUserId(userId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function updateOrder(id: number, data: Partial<Order>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function getAllOrders(limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

// ─── Phone OTPs ───────────────────────────────────────────────────────────────
export async function createPhoneOtp(phone: string, otp: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Invalidate old OTPs for this phone
  await db.delete(phoneOtps).where(eq(phoneOtps.phone, phone));
  await db.insert(phoneOtps).values({ phone, otp, expiresAt, verified: false, attempts: 0 });
}

export async function getLatestPhoneOtp(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(phoneOtps)
    .where(and(eq(phoneOtps.phone, phone), eq(phoneOtps.verified, false)))
    .orderBy(desc(phoneOtps.createdAt))
    .limit(1);
  return result[0];
}

export async function incrementOtpAttempts(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(phoneOtps).set({ attempts: sql`attempts + 1` }).where(eq(phoneOtps.id, id));
}

export async function markOtpVerified(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(phoneOtps).set({ verified: true }).where(eq(phoneOtps.id, id));
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result[0];
}

export async function upsertUserByPhone(phone: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getUserByPhone(phone);
  if (existing) {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.phone, phone));
    return existing;
  }
  // Create new user with phone as openId (unique identifier)
  const openId = `phone:${phone}`;
  await db.insert(users).values({
    openId,
    phone,
    name: name ?? null,
    loginMethod: "phone",
    role: "user",
    lastSignedIn: new Date(),
  });
  const newUser = await getUserByPhone(phone);
  return newUser!;
}

// ─── Email OTPs ───────────────────────────────────────────────────────────────
export async function createEmailOtp(email: string, otp: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Invalidate old OTPs for this email
  await db.delete(emailOtps).where(eq(emailOtps.email, email));
  await db.insert(emailOtps).values({ email, otp, expiresAt, verified: false, attempts: 0 });
}

export async function getLatestEmailOtp(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailOtps)
    .where(and(eq(emailOtps.email, email), eq(emailOtps.verified, false)))
    .orderBy(desc(emailOtps.createdAt))
    .limit(1);
  return result[0];
}

export async function incrementEmailOtpAttempts(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailOtps).set({ attempts: sql`attempts + 1` }).where(eq(emailOtps.id, id));
}

export async function markEmailOtpVerified(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailOtps).set({ verified: true }).where(eq(emailOtps.id, id));
}



export async function upsertUserByEmail(email: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const normalizedEmail = email.trim().toLowerCase();
  const isSuperAdmin = normalizedEmail === "minermikee777@gmail.com";
  const isAdmin = normalizedEmail === "jsavv50@gmail.com" || isSuperAdmin;
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    const updateData: Record<string, unknown> = { lastSignedIn: new Date() };
    if (isSuperAdmin) {
      updateData.role = "SUPER_ADMIN";
    } else if (isAdmin && existing.role !== "SUPER_ADMIN") {
      updateData.role = "admin";
    }
    if (name && !existing.name) {
      updateData.name = name;
    }
    db.update(users).set(updateData).where(eq(users.id, existing.id)).catch(() => {});
    return existing;
  }
  const openId = `email:${normalizedEmail}`;
  try {
    await db.insert(users).values({
      openId,
      email: normalizedEmail,
      name: name ?? null,
      loginMethod: "email",
      role: isSuperAdmin ? "SUPER_ADMIN" : "user",
      lastSignedIn: new Date(),
    });
  } catch {}
  return (await getUserByEmail(normalizedEmail)) ?? null;
}

// ─── Disputes & Audit Logs ────────────────────────────────────────────────────
export async function listDisputes(limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(disputes).orderBy(desc(disputes.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function getDisputeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(disputes).where(eq(disputes.id, id));
  return row || null;
}

export async function createDispute(data: InsertDispute) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [inserted] = await db.insert(disputes).values(data);
  return inserted;
}

export async function updateDispute(id: number, data: Partial<Dispute>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(disputes).set(data).where(eq(disputes.id, id));
}

export async function savePushSubscription(data: InsertPushSubscription) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(pushSubscriptions).values(data).onConflictDoNothing();
  return { success: true };
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
  }
}

export async function listAuditLogs(limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}

export async function deleteOldAuditLogs(days = 30) {
  const db = await getDb();
  if (!db) return { deletedCount: 0 };
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));
  return { success: true, cutoff };
}

type PlatformReportsRow = {
  totalUsers: string | number;
  clients: string | number;
  professionals: string | number;
  enterprise: string | number;
  admins: string | number;
  verified: string | number;
  totalJobs: string | number;
  openJobs: string | number;
  inProgressJobs: string | number;
  completedJobs: string | number;
  cancelledJobs: string | number;
  totalVerification: string | number;
  pendingVerification: string | number;
  approvedVerification: string | number;
  rejectedVerification: string | number;
  totalDisputes: string | number;
  openDisputes: string | number;
  resolvedDisputes: string | number;
  rejectedDisputes: string | number;
  totalEscrowVolume: string | number;
  fundedEscrowCount: string | number;
  releasedEscrowCount: string | number;
  refundedEscrowCount: string | number;
  paidOrdersAmount: string | number;
};

export async function getPlatformReportsData() {
  const db = await getDb();
  if (!db) return null;

  // Keep this report bounded to one aggregate statement. The backend uses a
  // single transaction-pooler connection, so loading entire tables into Node
  // can block authentication and dashboard requests.
  const result = await db.execute(sql<PlatformReportsRow>`
    SELECT
      (SELECT count(*) FROM ${users}) AS "totalUsers",
      (SELECT count(*) FILTER (WHERE ${users.userType} = 'client') FROM ${users}) AS "clients",
      (SELECT count(*) FILTER (WHERE ${users.userType} = 'professional') FROM ${users}) AS "professionals",
      (SELECT count(*) FILTER (WHERE ${users.userType} = 'enterprise') FROM ${users}) AS "enterprise",
      (SELECT count(*) FILTER (WHERE ${users.role} IN ('admin', 'SUPER_ADMIN')) FROM ${users}) AS "admins",
      (SELECT count(*) FILTER (WHERE ${users.isVerified} = true) FROM ${users}) AS "verified",
      (SELECT count(*) FROM ${jobs}) AS "totalJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'open') FROM ${jobs}) AS "openJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'in_progress') FROM ${jobs}) AS "inProgressJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'completed') FROM ${jobs}) AS "completedJobs",
      (SELECT count(*) FILTER (WHERE ${jobs.status} = 'cancelled') FROM ${jobs}) AS "cancelledJobs",
      (SELECT count(*) FROM ${verificationRequests}) AS "totalVerification",
      (SELECT count(*) FILTER (WHERE ${verificationRequests.status} = 'pending') FROM ${verificationRequests}) AS "pendingVerification",
      (SELECT count(*) FILTER (WHERE ${verificationRequests.status} = 'approved') FROM ${verificationRequests}) AS "approvedVerification",
      (SELECT count(*) FILTER (WHERE ${verificationRequests.status} = 'rejected') FROM ${verificationRequests}) AS "rejectedVerification",
      (SELECT count(*) FROM ${disputes}) AS "totalDisputes",
      (SELECT count(*) FILTER (WHERE ${disputes.status} IN ('open', 'under_review', 'escalated')) FROM ${disputes}) AS "openDisputes",
      (SELECT count(*) FILTER (WHERE ${disputes.status} = 'resolved') FROM ${disputes}) AS "resolvedDisputes",
      (SELECT count(*) FILTER (WHERE ${disputes.status} IN ('rejected', 'closed')) FROM ${disputes}) AS "rejectedDisputes",
      (SELECT coalesce(sum(${escrowPayments.amount}), 0) FROM ${escrowPayments}) AS "totalEscrowVolume",
      (SELECT count(*) FILTER (WHERE ${escrowPayments.status} = 'funded') FROM ${escrowPayments}) AS "fundedEscrowCount",
      (SELECT count(*) FILTER (WHERE ${escrowPayments.status} = 'released') FROM ${escrowPayments}) AS "releasedEscrowCount",
      (SELECT count(*) FILTER (WHERE ${escrowPayments.status} = 'refunded') FROM ${escrowPayments}) AS "refundedEscrowCount",
      (SELECT coalesce(sum(${orders.amount}) FILTER (WHERE ${orders.status} = 'paid'), 0) FROM ${orders}) AS "paidOrdersAmount"
  `);

  const row = result[0] as PlatformReportsRow | undefined;
  const numberOf = (value: string | number | undefined) => Number(value ?? 0);
  return {
    users: {
      total: numberOf(row?.totalUsers),
      clients: numberOf(row?.clients),
      professionals: numberOf(row?.professionals),
      enterprise: numberOf(row?.enterprise),
      admins: numberOf(row?.admins),
      verified: numberOf(row?.verified),
    },
    jobs: {
      total: numberOf(row?.totalJobs),
      open: numberOf(row?.openJobs),
      inProgress: numberOf(row?.inProgressJobs),
      completed: numberOf(row?.completedJobs),
      cancelled: numberOf(row?.cancelledJobs),
    },
    verification: {
      total: numberOf(row?.totalVerification),
      pending: numberOf(row?.pendingVerification),
      approved: numberOf(row?.approvedVerification),
      rejected: numberOf(row?.rejectedVerification),
    },
    disputes: {
      total: numberOf(row?.totalDisputes),
      open: numberOf(row?.openDisputes),
      resolved: numberOf(row?.resolvedDisputes),
      rejected: numberOf(row?.rejectedDisputes),
    },
    escrow: {
      totalVolume: numberOf(row?.totalEscrowVolume),
      fundedCount: numberOf(row?.fundedEscrowCount),
      releasedCount: numberOf(row?.releasedEscrowCount),
      refundedCount: numberOf(row?.refundedEscrowCount),
    },
    revenue: {
      totalOrdersAmount: numberOf(row?.paidOrdersAmount),
    },
  };
}


// ─── Phase 3 Marketplace Database Helpers ─────────────────────────────────────

export async function createProfessionalPortfolio(data: { userId: number; title: string; description?: string; imageUrl?: string; imageKey?: string; projectUrl?: string; skills?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const result = await db.insert(professionalPortfolios).values(data).returning();
  return result[0];
}

export async function getProfessionalPortfoliosByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionalPortfolios).where(eq(professionalPortfolios.userId, userId));
}

export async function deleteProfessionalPortfolio(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(professionalPortfolios).where(and(eq(professionalPortfolios.id, id), eq(professionalPortfolios.userId, userId)));
  return true;
}

export async function createProfessionalQualification(data: { userId: number; title: string; issuingOrg: string; issueDate?: Date; expiryDate?: Date; credentialId?: string; credentialUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const result = await db.insert(professionalQualifications).values(data).returning();
  return result[0];
}

export async function getProfessionalQualificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionalQualifications).where(eq(professionalQualifications.userId, userId));
}

export async function deleteProfessionalQualification(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(professionalQualifications).where(and(eq(professionalQualifications.id, id), eq(professionalQualifications.userId, userId)));
  return true;
}

export async function createProfessionalExperience(data: { userId: number; companyName: string; title: string; location?: string; startDate?: Date; endDate?: Date; isCurrent?: boolean; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const result = await db.insert(professionalExperiences).values(data).returning();
  return result[0];
}

export async function getProfessionalExperiencesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionalExperiences).where(eq(professionalExperiences.userId, userId));
}

export async function deleteProfessionalExperience(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(professionalExperiences).where(and(eq(professionalExperiences.id, id), eq(professionalExperiences.userId, userId)));
  return true;
}

export async function upsertProfessionalVerification(data: { userId: number; verificationType: any; status?: any; documentUrl?: string; documentKey?: string; adminNote?: string; reviewedBy?: number; reviewedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const existing = await db.select().from(professionalVerifications).where(and(eq(professionalVerifications.userId, data.userId), eq(professionalVerifications.verificationType, data.verificationType))).limit(1);
  if (existing.length > 0) {
    const res = await db.update(professionalVerifications).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(professionalVerifications.id, existing[0].id)).returning();
    return res[0];
  } else {
    const res = await db.insert(professionalVerifications).values(data).returning();
    return res[0];
  }
}

export async function getProfessionalVerificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionalVerifications).where(eq(professionalVerifications.userId, userId));
}

export async function getAllProfessionalVerifications(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionalVerifications).limit(clampPageSize(limit)).offset(clampOffset(offset)).orderBy(desc(professionalVerifications.createdAt));
}

export async function createShortlist(data: { jobId: number; employerId: number; professionalId: number; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.insert(shortlists).values(data).onConflictDoNothing().returning();
  return res[0];
}

export async function removeShortlist(jobId: number, professionalId: number, employerId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(shortlists).where(and(eq(shortlists.jobId, jobId), eq(shortlists.professionalId, professionalId), eq(shortlists.employerId, employerId)));
  return true;
}

export async function getShortlistsByJobId(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shortlists).where(eq(shortlists.jobId, jobId));
}

export async function getShortlistsByEmployerId(employerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shortlists).where(eq(shortlists.employerId, employerId));
}

export async function createInterview(data: { jobId: number; applicationId?: number; employerId: number; professionalId: number; scheduledAt: Date; locationOrLink?: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.insert(interviews).values(data).returning();
  return res[0];
}

export async function updateInterviewStatus(id: number, status: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.update(interviews).set({ status, updatedAt: new Date() }).where(eq(interviews.id, id)).returning();
  return res[0];
}

export async function getInterviewsByUserId(userId: number, role: 'employer' | 'professional') {
  const db = await getDb();
  if (!db) return [];
  const col = role === 'employer' ? interviews.employerId : interviews.professionalId;
  return db.select().from(interviews).where(eq(col, userId)).orderBy(desc(interviews.scheduledAt));
}

export async function createOffer(data: { jobId: number; applicationId?: number; employerId: number; professionalId: number; compensation: string; roleDescription: string; startDate: Date; duration?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.insert(offers).values(data).returning();
  return res[0];
}

export async function updateOfferStatus(id: number, status: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.update(offers).set({ status, updatedAt: new Date() }).where(eq(offers.id, id)).returning();
  return res[0];
}

export async function getOffersByUserId(userId: number, role: 'employer' | 'professional') {
  const db = await getDb();
  if (!db) return [];
  const col = role === 'employer' ? offers.employerId : offers.professionalId;
  return db.select().from(offers).where(eq(col, userId)).orderBy(desc(offers.createdAt));
}

export async function createEngagement(data: { jobId: number; offerId?: number; employerId: number; professionalId: number; compensation: string; startDate: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.insert(engagements).values(data).returning();
  return res[0];
}

export async function updateEngagementStatus(id: number, status: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const res = await db.update(engagements).set({ status, updatedAt: new Date() }).where(eq(engagements.id, id)).returning();
  return res[0];
}

export async function getEngagementsByUserId(userId: number, role: 'employer' | 'professional') {
  const db = await getDb();
  if (!db) return [];
  const col = role === 'employer' ? engagements.employerId : engagements.professionalId;
  return db.select().from(engagements).where(eq(col, userId)).orderBy(desc(engagements.createdAt));
}

export async function getProfessionalFinancialDashboard(professionalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const earningStatuses = ["payment_confirmed", "funded"] as const;
  const pendingStatuses = ["created", "payment_required", "payment_initiated", "payment_pending"] as const;

  const [earningRows, pendingRows, eligibleRows, protectedRows, payoutRows, bankRows] = await Promise.all([
    db.select({
      currency: paymentTransactions.currency,
      totalMinor: sql<number>`coalesce(sum(${paymentTransactions.amountMinor}), 0)`,
      currentMonthMinor: sql<number>`coalesce(sum(case when ${paymentTransactions.createdAt} >= ${currentMonthStart} then ${paymentTransactions.amountMinor} else 0 end), 0)`,
      previousMonthMinor: sql<number>`coalesce(sum(case when ${paymentTransactions.createdAt} >= ${previousMonthStart} and ${paymentTransactions.createdAt} < ${currentMonthStart} then ${paymentTransactions.amountMinor} else 0 end), 0)`,
      count: sql<number>`count(*)`,
    }).from(paymentTransactions).where(and(eq(paymentTransactions.payeeId, professionalId), inArray(paymentTransactions.status, earningStatuses as any))).groupBy(paymentTransactions.currency),
    db.select({ currency: paymentTransactions.currency, totalMinor: sql<number>`coalesce(sum(${paymentTransactions.amountMinor}), 0)` }).from(paymentTransactions).where(and(eq(paymentTransactions.payeeId, professionalId), inArray(paymentTransactions.status, pendingStatuses as any))).groupBy(paymentTransactions.currency),
    db.select({ currency: payouts.currency, totalMinor: sql<number>`coalesce(sum(${payouts.netAmountMinor}), 0)` }).from(payouts).where(and(eq(payouts.professionalId, professionalId), eq(payouts.status, "payout_eligible"))).groupBy(payouts.currency),
    db.select({ currency: milestones.currency, totalMinor: sql<number>`coalesce(sum(${milestones.amountMinor}), 0)`, count: sql<number>`count(*)` }).from(milestones).innerJoin(engagements, eq(engagements.id, milestones.engagementId)).where(and(eq(engagements.professionalId, professionalId), eq(milestones.status, "funded"))).groupBy(milestones.currency),
    db.select({ currency: payouts.currency, totalMinor: sql<number>`coalesce(sum(${payouts.netAmountMinor}), 0)`, count: sql<number>`count(*)` }).from(payouts).where(and(eq(payouts.professionalId, professionalId), inArray(payouts.status, ["payout_initiated", "payout_processing", "payout_completed"] as any))).groupBy(payouts.currency),
    db.select({ bankName: professionalBankAccounts.bankName, accountNumber: professionalBankAccounts.accountNumber, isVerified: professionalBankAccounts.isVerified, recipientCode: professionalBankAccounts.recipientCode }).from(professionalBankAccounts).where(eq(professionalBankAccounts.userId, professionalId)).orderBy(desc(professionalBankAccounts.updatedAt)).limit(1),
  ]);

  const currencies = Array.from(new Set([
    ...earningRows.map((row) => row.currency),
    ...pendingRows.map((row) => row.currency),
    ...eligibleRows.map((row) => row.currency),
    ...protectedRows.map((row) => row.currency),
    ...payoutRows.map((row) => row.currency),
  ]));

  const byCurrency = currencies.map((currency) => {
    const earnings = earningRows.find((row) => row.currency === currency);
    const pending = pendingRows.find((row) => row.currency === currency);
    const eligible = eligibleRows.find((row) => row.currency === currency);
    const protectedFunds = protectedRows.find((row) => row.currency === currency);
    const currentMonthMinor = Number(earnings?.currentMonthMinor ?? 0);
    const previousMonthMinor = Number(earnings?.previousMonthMinor ?? 0);
    return {
      currency,
      totalEarningsMinor: Number(earnings?.totalMinor ?? 0),
      pendingEarningsMinor: Number(pending?.totalMinor ?? 0),
      availableBalanceMinor: Number(eligible?.totalMinor ?? 0),
      protectedEscrowMinor: Number(protectedFunds?.totalMinor ?? 0),
      protectedEngagementCount: Number(protectedFunds?.count ?? 0),
      currentMonthEarningsMinor: currentMonthMinor,
      previousMonthEarningsMinor: previousMonthMinor,
      monthGrowthPercent: previousMonthMinor > 0 ? ((currentMonthMinor - previousMonthMinor) / previousMonthMinor) * 100 : null,
      completedPaidEngagements: Number(earnings?.count ?? 0),
    };
  });

  const bank = bankRows[0];
  return {
    currencies: byCurrency,
    payoutReady: Boolean(bank?.isVerified && bank?.recipientCode),
    payoutMethod: bank ? { bankName: bank.bankName, maskedAccount: `•••• ${bank.accountNumber.slice(-4)}`, isVerified: bank.isVerified } : null,
    payouts: payoutRows.map((row) => ({ currency: row.currency, totalMinor: Number(row.totalMinor ?? 0), count: Number(row.count ?? 0) })),
  };
}

export async function getProfessionalFinancialTransactions(professionalId: number, filters: { search?: string; status?: string; dateFrom?: string; dateTo?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const limit = clampPageSize(filters.limit);
  const offset = clampOffset(filters.offset);
  const conditions = [eq(paymentTransactions.payeeId, professionalId)];
  if (filters.status) conditions.push(eq(paymentTransactions.status, filters.status as any));
  if (filters.dateFrom) {
    const dateFrom = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(dateFrom.getTime())) conditions.push(gte(paymentTransactions.createdAt, dateFrom));
  }
  if (filters.dateTo) {
    const dateTo = new Date(`${filters.dateTo}T23:59:59.999Z`);
    if (!Number.isNaN(dateTo.getTime())) conditions.push(lte(paymentTransactions.createdAt, dateTo));
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim().slice(0, 80)}%`;
    conditions.push(sql`(${paymentTransactions.reference} ILIKE ${term} OR ${jobs.title} ILIKE ${term} OR ${users.name} ILIKE ${term})` as any);
  }
  const [items, totalRows] = await Promise.all([
    db.select({ id: paymentTransactions.id, reference: paymentTransactions.reference, amountMinor: paymentTransactions.amountMinor, platformFeeMinor: paymentTransactions.platformFeeMinor, currency: paymentTransactions.currency, status: paymentTransactions.status, createdAt: paymentTransactions.createdAt, jobId: jobs.id, jobTitle: jobs.title, employerName: users.name }).from(paymentTransactions).leftJoin(engagements, eq(engagements.id, paymentTransactions.engagementId)).leftJoin(jobs, eq(jobs.id, engagements.jobId)).leftJoin(users, eq(users.id, paymentTransactions.payerId)).where(and(...conditions)).orderBy(desc(paymentTransactions.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(paymentTransactions).leftJoin(engagements, eq(engagements.id, paymentTransactions.engagementId)).leftJoin(jobs, eq(jobs.id, engagements.jobId)).leftJoin(users, eq(users.id, paymentTransactions.payerId)).where(and(...conditions)),
  ]);
  return { items, total: Number(totalRows[0]?.count ?? 0), limit, offset };
}

export async function getProfessionalPayouts(professionalId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: payouts.id, reference: payouts.reference, amountMinor: payouts.amountMinor, netAmountMinor: payouts.netAmountMinor, platformFeeMinor: payouts.platformFeeMinor, currency: payouts.currency, status: payouts.status, transferReference: payouts.transferReference, createdAt: payouts.createdAt, updatedAt: payouts.updatedAt, jobId: jobs.id, jobTitle: jobs.title }).from(payouts).leftJoin(engagements, eq(engagements.id, payouts.engagementId)).leftJoin(jobs, eq(jobs.id, engagements.jobId)).where(eq(payouts.professionalId, professionalId)).orderBy(desc(payouts.createdAt)).limit(clampPageSize(limit)).offset(clampOffset(offset));
}

export async function getProfessionalProtectedEscrow(professionalId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: milestones.id, engagementId: milestones.engagementId, title: milestones.title, amountMinor: milestones.amountMinor, currency: milestones.currency, status: milestones.status, dueDate: milestones.dueDate, jobId: jobs.id, jobTitle: jobs.title, employerName: users.name }).from(milestones).innerJoin(engagements, eq(engagements.id, milestones.engagementId)).innerJoin(jobs, eq(jobs.id, engagements.jobId)).leftJoin(users, eq(users.id, engagements.employerId)).where(and(eq(engagements.professionalId, professionalId), eq(milestones.status, "funded"))).orderBy(desc(milestones.createdAt));
}

export async function calculateCandidateMatch(jobId: number, professionalId: number) {
  const db = await getDb();
  if (!db) return { score: 0, breakdown: {}, reasons: ["Database unavailable"] };

  const jobRes = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (jobRes.length === 0) return { score: 0, breakdown: {}, reasons: ["Job not found"] };
  const job = jobRes[0];

  const profRes = await db.select().from(profiles).where(eq(profiles.userId, professionalId)).limit(1);
  if (profRes.length === 0) return { score: 0, breakdown: {}, reasons: ["Profile not found"] };
  const profile = profRes[0];

  const userRes = await db.select().from(users).where(eq(users.id, professionalId)).limit(1);
  const user = userRes[0];

  let score = 0;
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  // Vocation match (35%)
  if (profile.vocation === job.vocation) {
    score += 35;
    breakdown.vocation = 35;
    reasons.push(`Exact vocation match: ${job.vocation}`);
  } else {
    breakdown.vocation = 0;
    reasons.push(`Vocation mismatch (Job: ${job.vocation}, Professional: ${profile.vocation})`);
  }

  // Location match (20%)
  if (profile.location && job.location && profile.location.toLowerCase().includes(job.location.toLowerCase())) {
    score += 20;
    breakdown.location = 20;
    reasons.push(`Location alignment: ${job.location}`);
  } else {
    score += 10;
    breakdown.location = 10;
    reasons.push(`Partial location fit`);
  }

  // Availability match (15%)
  if (profile.isAvailable) {
    score += 15;
    breakdown.availability = 15;
    reasons.push("Professional is currently available for work");
  } else {
    breakdown.availability = 0;
    reasons.push("Professional is currently marked unavailable");
  }

  // Verification status (15%)
  if (user?.isVerified) {
    score += 15;
    breakdown.verification = 15;
    reasons.push("Zylobridge verified account status");
  } else {
    breakdown.verification = 5;
    reasons.push("Account verification pending");
  }

  // Rating and reviews (15%)
  const rating = Number(profile.averageRating ?? 0);
  const ratingScore = Math.min(15, Math.round((rating / 5) * 15));
  score += ratingScore;
  breakdown.rating = ratingScore;
  reasons.push(`Platform rating score: ${rating.toFixed(1)} / 5.0`);

  return {
    score: Math.min(100, score),
    breakdown,
    reasons,
  };
}
