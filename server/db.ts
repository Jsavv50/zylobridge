import { drizzle } from "drizzle-orm/postgres-js";
import { and, or, inArray, desc, asc, eq, like, gte, lte, lt, sql } from "drizzle-orm";
import {
  InsertUser,
  users,
  jobs,
  applications,
  profiles,
  reviews,
  InsertJob,
  InsertApplication,
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
  shortlists,
  interviews,
  offers,
  engagements,
  organizations,
  organizationMembers,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
  const result = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`).limit(1);
  return result[0];
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

  console.log("[JobCreate] Pre-insert payload inspection:", {
    clientId: data.clientId,
    title: data.title,
    description: data.description ? data.description.substring(0, 40) + "..." : null,
    vocation: data.vocation,
    budget: data.budget,
    location: data.location,
    deadline: data.deadline,
    status: data.status,
    isUrgent: data.isUrgent,
    organizationId: data.organizationId ?? null,
    projectId: data.projectId ?? null,
  });

  try {
    const [created] = await db.insert(jobs).values(data).returning();
    console.log("[JobCreate] Successfully inserted job id:", created.id);
    return created;
  } catch (error) {
    const candidate = error instanceof Error && "cause" in error && error.cause
      ? error.cause
      : error;
    const originalError = error instanceof Error && "originalError" in error
      ? (error as any).originalError
      : undefined;

    const pgError = candidate as {
      code?: unknown;
      message?: unknown;
      detail?: unknown;
      hint?: unknown;
      schema?: unknown;
      table?: unknown;
      column?: unknown;
      constraint?: unknown;
      dataType?: unknown;
    };

    console.error("[JobCreate] Detailed PostgreSQL / Drizzle Exception:", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      code: typeof pgError.code === "string" ? pgError.code : undefined,
      pgMessage: typeof pgError.message === "string" ? pgError.message : undefined,
      detail: typeof pgError.detail === "string" ? pgError.detail : undefined,
      hint: typeof pgError.hint === "string" ? pgError.hint : undefined,
      constraint: typeof pgError.constraint === "string" ? pgError.constraint : undefined,
      table: typeof pgError.table === "string" ? pgError.table : undefined,
      column: typeof pgError.column === "string" ? pgError.column : undefined,
      schema: typeof pgError.schema === "string" ? pgError.schema : undefined,
      originalError: originalError ? String(originalError) : undefined,
    });
    throw error;
  }
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
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
  const conditions = [eq(users.userType, "professional")];
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
  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    nextOffset: hasMore ? offset + limit : null,
    hasMore,
  };
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
    .where(and(eq(profiles.userId, userId), eq(users.userType, "professional")))
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

export async function updateProfile(userId: number, data: Partial<InsertProfile>) {
  const db = await getDb();
  if (!db) return;
  await db.update(profiles).set(data).where(eq(profiles.userId, userId));
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
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

export async function getConversationsByUserId(userId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(
    or(eq(conversations.clientId, userId), eq(conversations.professionalId, userId))
  ).orderBy(desc(conversations.lastMessageAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
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
