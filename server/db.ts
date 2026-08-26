import { and, or, desc, asc, eq, ne, like, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
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
  organizations,
  organizationMembers,
  organizationInvitations,
  organizationProjects,
  organizationVerificationRequests,
  workforceAssignments,
  notifications,
  auditLogs,
  InsertOrganization,
  InsertOrganizationMember,
  InsertOrganizationInvitation,
  InsertOrganizationProject,
  InsertOrganizationVerificationRequest,
  InsertWorkforceAssignment,
  InsertNotification,
  InsertAuditLog,
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationProject,
  WorkforceAssignment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
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
  const result = await db.insert(jobs).values(data);
  return result;
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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
    .limit(filters.limit ?? 20)
    .offset(filters.offset ?? 0);

  return query;
}

export async function getJobsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.clientId, clientId)).orderBy(desc(jobs.createdAt));
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
export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(applications).values(data);
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getApplicationsByJobId(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applications).where(eq(applications.jobId, jobId)).orderBy(desc(applications.createdAt));
}

export async function getApplicationsByProfessionalId(professionalId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applications).where(eq(applications.professionalId, professionalId)).orderBy(desc(applications.createdAt));
}

export async function getApplicationForJobAndProfessional(jobId: number, professionalId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications).where(
    and(eq(applications.jobId, jobId), eq(applications.professionalId, professionalId))
  ).limit(1);
  return result[0];
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

// ─── Enterprise organizations ─────────────────────────────────────────────────
export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0];
}

export async function getOrganizationMembership(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationMembers).where(
    and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId))
  ).limit(1);
  return result[0];
}

export async function getOrganizationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ organization: organizations, membership: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .orderBy(desc(organizations.createdAt));
}

export async function createOrganizationWithOwner(data: InsertOrganization, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [organization] = await db.insert(organizations).values(data).returning();
  if (!organization) throw new Error("Organization could not be created");
  await db.insert(organizationMembers).values({
    organizationId: organization.id,
    userId: ownerId,
    role: "OWNER",
    status: "active",
  }).onConflictDoNothing();
  return organization;
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [organization] = await db.update(organizations).set({ ...data, updatedAt: new Date() }).where(eq(organizations.id, id)).returning();
  return organization;
}

export async function listOrganizationMembers(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ member: organizationMembers, user: users })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId))
    .orderBy(asc(organizationMembers.createdAt));
}

export async function updateOrganizationMember(id: number, data: Partial<InsertOrganizationMember>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [member] = await db.update(organizationMembers).set({ ...data, updatedAt: new Date() }).where(eq(organizationMembers.id, id)).returning();
  return member;
}

export async function createOrganizationInvitation(data: InsertOrganizationInvitation) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [invitation] = await db.insert(organizationInvitations).values(data).returning();
  return invitation;
}

export async function getOrganizationInvitationByTokenHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationInvitations).where(eq(organizationInvitations.tokenHash, tokenHash)).limit(1);
  return result[0];
}

export async function listOrganizationInvitations(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationInvitations).where(eq(organizationInvitations.organizationId, organizationId)).orderBy(desc(organizationInvitations.createdAt));
}

export async function updateOrganizationInvitation(id: number, data: Partial<InsertOrganizationInvitation>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [invitation] = await db.update(organizationInvitations).set({ ...data, updatedAt: new Date() }).where(eq(organizationInvitations.id, id)).returning();
  return invitation;
}

export async function createOrganizationVerificationRequest(data: InsertOrganizationVerificationRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [request] = await db.insert(organizationVerificationRequests).values(data).returning();
  return request;
}

export async function listOrganizationVerificationRequests(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationVerificationRequests).where(eq(organizationVerificationRequests.organizationId, organizationId)).orderBy(desc(organizationVerificationRequests.createdAt));
}

export async function getOrganizationVerificationRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationVerificationRequests).where(eq(organizationVerificationRequests.id, id)).limit(1);
  return result[0];
}

export async function updateOrganizationVerificationRequest(id: number, data: Partial<InsertOrganizationVerificationRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [request] = await db.update(organizationVerificationRequests).set({ ...data, updatedAt: new Date() }).where(eq(organizationVerificationRequests.id, id)).returning();
  return request;
}

export async function activateOrganizationMember(organizationId: number, userId: number, role: OrganizationMember["role"]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [member] = await db.insert(organizationMembers).values({ organizationId, userId, role, status: "active" })
    .onConflictDoUpdate({
      target: [organizationMembers.organizationId, organizationMembers.userId],
      set: { role, status: "active", updatedAt: new Date() },
    })
    .returning();
  return member;
}

export async function createOrganizationProject(data: InsertOrganizationProject) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [project] = await db.insert(organizationProjects).values(data).returning();
  return project;
}

export async function listOrganizationProjects(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationProjects).where(eq(organizationProjects.organizationId, organizationId)).orderBy(desc(organizationProjects.createdAt));
}

export async function updateOrganizationProject(id: number, data: Partial<InsertOrganizationProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [project] = await db.update(organizationProjects).set({ ...data, updatedAt: new Date() }).where(eq(organizationProjects.id, id)).returning();
  return project;
}

export async function getOrganizationProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(organizationProjects).where(eq(organizationProjects.id, id)).limit(1);
  return result[0];
}

export async function getOrganizationJobs(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.organizationId, organizationId)).orderBy(desc(jobs.createdAt));
}

export async function createWorkforceAssignment(data: InsertWorkforceAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [assignment] = await db.insert(workforceAssignments).values(data).returning();
  return assignment;
}

export async function listWorkforceAssignments(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ assignment: workforceAssignments, user: users, profile: profiles })
    .from(workforceAssignments)
    .innerJoin(users, eq(workforceAssignments.professionalId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(workforceAssignments.organizationId, organizationId))
    .orderBy(desc(workforceAssignments.createdAt));
}

export async function updateWorkforceAssignment(id: number, data: Partial<InsertWorkforceAssignment>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [assignment] = await db.update(workforceAssignments).set({ ...data, updatedAt: new Date() }).where(eq(workforceAssignments.id, id)).returning();
  return assignment;
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [notification] = await db.insert(notifications).values(data).returning();
  return notification;
}

export async function listNotificationsForUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(auditLogs).values(data);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(reviews).values(data);
}

export async function getReviewsByRevieweeId(revieweeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.revieweeId, revieweeId)).orderBy(desc(reviews.createdAt));
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────
export async function getAdminStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0, clientCount: 0, professionalCount: 0, adminCount: 0, unsetCount: 0,
      totalJobs: 0, openJobs: 0, inProgressJobs: 0, completedJobs: 0, cancelledJobs: 0,
      totalApplications: 0, pendingApplications: 0,
      verifiedUsers: 0, totalReviews: 0,
    };
  }
  const [
    userRows,
    jobRows,
    appRows,
    reviewRows,
    verifiedRows,
  ] = await Promise.all([
    db.select({ role: users.role, userType: users.userType }).from(users),
    db.select({ status: jobs.status }).from(jobs),
    db.select({ status: applications.status }).from(applications),
    db.select({ count: sql<number>`count(*)` }).from(reviews),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isVerified, true)),
  ]);

  const clientCount = userRows.filter((u) => u.userType === "client").length;
  const professionalCount = userRows.filter((u) => u.userType === "professional").length;
  const adminCount = userRows.filter((u) => u.role === "admin").length;
  const unsetCount = userRows.filter((u) => u.userType === "unset").length;

  const openJobs = jobRows.filter((j) => j.status === "open").length;
  const inProgressJobs = jobRows.filter((j) => j.status === "in_progress").length;
  const completedJobs = jobRows.filter((j) => j.status === "completed").length;
  const cancelledJobs = jobRows.filter((j) => j.status === "cancelled").length;

  const pendingApplications = appRows.filter((a) => a.status === "pending").length;

  return {
    totalUsers: userRows.length,
    clientCount,
    professionalCount,
    adminCount,
    unsetCount,
    totalJobs: jobRows.length,
    openJobs,
    inProgressJobs,
    completedJobs,
    cancelledJobs,
    totalApplications: appRows.length,
    pendingApplications,
    verifiedUsers: Number(verifiedRows[0]?.count ?? 0),
    totalReviews: Number(reviewRows[0]?.count ?? 0),
  };
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

export async function getConversationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(
    or(eq(conversations.clientId, userId), eq(conversations.professionalId, userId))
  ).orderBy(desc(conversations.lastMessageAt));
}

export async function getConversationById(conversationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return result[0];
}

export async function getMessagesByConversationId(conversationId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt)).limit(limit);
}

export async function markMessagesReadByParticipant(conversationId: number, readerId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ isRead: true }).where(
    and(eq(messages.conversationId, conversationId), eq(messages.isRead, false), ne(messages.senderId, readerId))
  );
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
  const result = await db.select().from(escrowPayments).where(eq(escrowPayments.paystackReference, reference)).limit(1);
  return result[0] ?? null;
}

export async function updateEscrowStatus(id: number, status: EscrowPayment["status"], extra?: Partial<EscrowPayment>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(escrowPayments).set({ status, ...extra }).where(eq(escrowPayments.id, id));
}

export async function getAllEscrowPayments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(escrowPayments).orderBy(desc(escrowPayments.createdAt));
}

// ─── Verification Requests ────────────────────────────────────────────────────
export async function createVerificationRequest(data: InsertVerificationRequest) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [inserted] = await db.insert(verificationRequests).values(data).returning();
  return inserted;
}

export async function getVerificationRequestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(verificationRequests).where(eq(verificationRequests.userId, userId)).orderBy(desc(verificationRequests.createdAt));
}

export async function getVerificationRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(verificationRequests).where(eq(verificationRequests.id, id)).limit(1);
  return result[0];
}

export async function getAllVerificationRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(verificationRequests).orderBy(desc(verificationRequests.createdAt));
}

export async function updateVerificationRequest(id: number, data: Partial<VerificationRequest>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(verificationRequests).set(data).where(eq(verificationRequests.id, id));
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function listProducts(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const q = db.select().from(products).orderBy(desc(products.createdAt));
  if (activeOnly) return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  return q;
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

export async function getOrdersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function updateOrder(id: number, data: Partial<Order>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function upsertUserByEmail(email: string, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await getUserByEmail(email);
  if (existing) {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.email, email));
    return existing;
  }
  // Create new user with email as openId (unique identifier)
  const openId = `email:${email}`;
  await db.insert(users).values({
    openId,
    email,
    name: name ?? null,
    loginMethod: "email",
    role: "user",
    lastSignedIn: new Date(),
  });
  const newUser = await getUserByEmail(email);
  return newUser!;
}
