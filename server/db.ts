import { and, or, desc, asc, eq, like, gte, lte, sql } from "drizzle-orm";
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

export async function updateUserRole(userId: number, role: "user" | "admin" | "super_admin") {
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
      totalUsers: 0, clientCount: 0, professionalCount: 0, enterpriseCount: 0, adminCount: 0, unsetCount: 0,
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
  const enterpriseCount = userRows.filter((u) => u.userType === "enterprise").length;
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
    enterpriseCount,
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

export async function getMessagesByConversationId(conversationId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt)).limit(limit);
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
