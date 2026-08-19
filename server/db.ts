import { drizzle } from "drizzle-orm/postgres-js";
import { and, or, desc, asc, eq, like, gte, lte, lt, sql } from "drizzle-orm";
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
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
    // Collision case: openId belongs to one user, email belongs to another.
    // If one of them is the canonical super admin, or to prevent unique constraint violation:
    // We clear or transfer openId from the conflicting record or merge safely.
    if (isSuperAdmin) {
      // Force email match (canonical super admin) to take openId and role SUPER_ADMIN
      const updateData: Record<string, unknown> = {
        openId: user.openId,
        lastSignedIn: user.lastSignedIn ?? new Date(),
        role: "SUPER_ADMIN",
      };
      if (user.name !== undefined) updateData.name = user.name ?? null;
      if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod ?? null;
      
      // Clear conflicting openId from existingByOpenId to avoid 23505
      await db.update(users).set({ openId: `detached_${Date.now()}_${existingByOpenId.id}` }).where(eq(users.id, existingByOpenId.id));
      await db.update(users).set(updateData).where(eq(users.id, existingByEmail.id));
      return;
    }
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
    escrowRows,
    verifRows,
  ] = await Promise.all([
    db.select({ role: users.role, userType: users.userType }).from(users),
    db.select({ status: jobs.status }).from(jobs),
    db.select({ status: applications.status }).from(applications),
    db.select({ count: sql<number>`count(*)` }).from(reviews),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isVerified, true)),
    db.select({ amount: escrowPayments.amount, status: escrowPayments.status }).from(escrowPayments),
    db.select({ status: verificationRequests.status }).from(verificationRequests),
  ]);

  const clientCount = userRows.filter((u) => u.userType === "client").length;
  const professionalCount = userRows.filter((u) => u.userType === "professional").length;
  const enterpriseCount = userRows.filter((u) => u.userType === "enterprise").length;
  const adminCount = userRows.filter((u) => u.role === "admin" || u.role === "SUPER_ADMIN").length;
  const unsetCount = userRows.filter((u) => u.userType === "unset").length;

  const openJobs = jobRows.filter((j) => j.status === "open").length;
  const inProgressJobs = jobRows.filter((j) => j.status === "in_progress").length;
  const completedJobs = jobRows.filter((j) => j.status === "completed").length;
  const cancelledJobs = jobRows.filter((j) => j.status === "cancelled").length;

  const pendingApplications = appRows.filter((a) => a.status === "pending").length;

  const totalEscrowAmount = escrowRows.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const fundedEscrowAmount = escrowRows.filter(e => e.status === "funded" || e.status === "released").reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const pendingVerificationCount = verifRows.filter(v => v.status === "pending").length;

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
    totalEscrowAmount,
    fundedEscrowAmount,
    pendingVerificationCount,
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
export async function listDisputes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(disputes).orderBy(desc(disputes.createdAt));
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

export async function listAuditLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function deleteOldAuditLogs(days = 30) {
  const db = await getDb();
  if (!db) return { deletedCount: 0 };
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff));
  return { success: true, cutoff };
}

export async function getPlatformReportsData() {
  const db = await getDb();
  if (!db) return null;
  const allU = await db.select().from(users);
  const allJ = await db.select().from(jobs);
  const allV = await db.select().from(verificationRequests);
  const allD = await db.select().from(disputes);
  const allE = await db.select().from(escrowPayments);
  const allO = await db.select().from(orders);

  return {
    users: {
      total: allU.length,
      clients: allU.filter(u => u.userType === "client").length,
      professionals: allU.filter(u => u.userType === "professional").length,
      enterprise: allU.filter(u => u.userType === "enterprise").length,
      admins: allU.filter(u => u.role === "admin" || u.role === "SUPER_ADMIN").length,
      verified: allU.filter(u => u.isVerified).length,
    },
    jobs: {
      total: allJ.length,
      open: allJ.filter(j => j.status === "open").length,
      inProgress: allJ.filter(j => j.status === "in_progress").length,
      completed: allJ.filter(j => j.status === "completed").length,
      cancelled: allJ.filter(j => j.status === "cancelled").length,
    },
    verification: {
      total: allV.length,
      pending: allV.filter(v => v.status === "pending").length,
      approved: allV.filter(v => v.status === "approved").length,
      rejected: allV.filter(v => v.status === "rejected").length,
    },
    disputes: {
      total: allD.length,
      open: allD.filter(d => d.status === "open" || d.status === "under_review" || d.status === "escalated").length,
      resolved: allD.filter(d => d.status === "resolved").length,
      rejected: allD.filter(d => d.status === "rejected" || d.status === "closed").length,
    },
    escrow: {
      totalVolume: allE.reduce((acc, e) => acc + Number(e.amount || 0), 0),
      fundedCount: allE.filter(e => e.status === "funded").length,
      releasedCount: allE.filter(e => e.status === "released").length,
      refundedCount: allE.filter(e => e.status === "refunded").length,
    },
    revenue: {
      totalOrdersAmount: allO.filter(o => o.status === "paid").reduce((acc, o) => acc + Number(o.amount || 0), 0),
    }
  };
}
