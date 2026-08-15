import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  serial,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin", "SUPER_ADMIN"]);
export const userTypeEnum = pgEnum("user_type", ["client", "professional", "enterprise", "unset"]);
export const vocationEnum = pgEnum("vocation", [
  "electrician",
  "carpenter",
  "plumber",
  "mason_bricklayer",
  "painter",
  "flooring_tiler",
  "heavy_equipment_operator",
  "road_construction_worker",
  "hvac_technician",
  "elevator_installer_repairer",
  "pest_control_technician",
  "glazier",
]);
export const jobStatusEnum = pgEnum("job_status", ["open", "in_progress", "completed", "cancelled"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "accepted", "rejected", "withdrawn"]);
export const paymentMethodEnum = pgEnum("payment_method", ["paystack", "bank_transfer"]);
export const escrowStatusEnum = pgEnum("escrow_status", ["pending", "funded", "released", "refunded", "disputed"]);
export const documentTypeEnum = pgEnum("document_type", [
  "trade_licence",
  "certification",
  "government_id",
  "insurance_certificate",
  "guild_membership",
]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "failed", "refunded"]);

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  userType: userTypeEnum("userType").default("unset").notNull(),
  phone: varchar("phone", { length: 20 }),
  avatarUrl: text("avatarUrl"),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Professional Profiles ────────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  vocation: vocationEnum("vocation").notNull(),
  bio: text("bio"),
  skills: text("skills"),
  certifications: text("certifications"),
  portfolioUrl: text("portfolioUrl"),
  hourlyRate: numeric("hourlyRate", { precision: 10, scale: 2 }),
  location: varchar("location", { length: 255 }),
  yearsExperience: integer("yearsExperience"),
  averageRating: numeric("averageRating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: integer("totalReviews").default(0).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  vocation: vocationEnum("vocation").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  deadline: timestamp("deadline"),
  status: jobStatusEnum("status").default("open").notNull(),
  assignedProfessionalId: integer("assignedProfessionalId"),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ─── Applications ─────────────────────────────────────────────────────────────
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  professionalId: integer("professionalId").notNull(),
  coverLetter: text("coverLetter").notNull(),
  bidAmount: numeric("bidAmount", { precision: 12, scale: 2 }).notNull(),
  status: applicationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  reviewerId: integer("reviewerId").notNull(),
  revieweeId: integer("revieweeId").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─── Conversations ────────────────────────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  clientId: integer("clientId").notNull(),
  professionalId: integer("professionalId").notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  senderId: integer("senderId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Escrow Payments ──────────────────────────────────────────────────────────
export const escrowPayments = pgTable("escrow_payments", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  clientId: integer("clientId").notNull(),
  professionalId: integer("professionalId").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("NGN").notNull(),
  paymentMethod: paymentMethodEnum("paymentMethod").notNull(),
  status: escrowStatusEnum("status").default("pending").notNull(),
  paystackReference: varchar("paystackReference", { length: 255 }),
  paystackAccessCode: varchar("paystackAccessCode", { length: 255 }),
  paystackAuthorizationUrl: text("paystackAuthorizationUrl"),
  bankAccountNumber: varchar("bankAccountNumber", { length: 20 }),
  bankAccountName: varchar("bankAccountName", { length: 255 }),
  bankName: varchar("bankName", { length: 255 }),
  transferProofUrl: text("transferProofUrl"),
  transferProofKey: text("transferProofKey"),
  adminConfirmedBy: integer("adminConfirmedBy"),
  paidAt: timestamp("paidAt"),
  releasedAt: timestamp("releasedAt"),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type EscrowPayment = typeof escrowPayments.$inferSelect;
export type InsertEscrowPayment = typeof escrowPayments.$inferInsert;

// ─── Verification Requests ────────────────────────────────────────────────────
export const verificationRequests = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  documentType: documentTypeEnum("documentType").notNull(),
  documentUrl: text("documentUrl").notNull(),
  documentKey: text("documentKey").notNull(),
  status: verificationStatusEnum("status").default("pending").notNull(),
  adminNote: text("adminNote"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: integer("reviewedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type InsertVerificationRequest = typeof verificationRequests.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("NGN").notNull(),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  category: varchar("category", { length: 100 }),
  stock: integer("stock").default(-1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  productId: integer("productId").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("NGN").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  paystackReference: varchar("paystackReference", { length: 255 }),
  paystackAccessCode: varchar("paystackAccessCode", { length: 255 }),
  paystackAuthorizationUrl: text("paystackAuthorizationUrl"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Email OTPs ──────────────────────────────────────────────────────────────
export const emailOtps = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  otp: varchar("otp", { length: 8 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailOtp = typeof emailOtps.$inferSelect;
export type InsertEmailOtp = typeof emailOtps.$inferInsert;

// ─── Phone OTPs ───────────────────────────────────────────────────────────────
export const phoneOtps = pgTable("phone_otps", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PhoneOtp = typeof phoneOtps.$inferSelect;
export type InsertPhoneOtp = typeof phoneOtps.$inferInsert;

// ─── Disputes ─────────────────────────────────────────────────────────────────
export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "awaiting_information",
  "escalated",
  "resolved",
  "rejected",
  "closed",
]);

export const disputePriorityEnum = pgEnum("dispute_priority", ["low", "medium", "high", "urgent"]);

export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  escrowId: integer("escrowId"),
  claimantId: integer("claimantId").notNull(),
  respondentId: integer("respondentId").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: disputeStatusEnum("status").default("open").notNull(),
  priority: disputePriorityEnum("priority").default("medium").notNull(),
  evidenceUrls: text("evidenceUrls"), // JSON or comma-separated URLs
  resolution: text("resolution"),
  adminNotes: text("adminNotes"),
  resolvedBy: integer("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId").notNull(),
  actorRole: varchar("actorRole", { length: 50 }).notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  resourceType: varchar("resourceType", { length: 64 }).notNull(),
  resourceId: varchar("resourceId", { length: 64 }),
  previousState: text("previousState"),
  newState: text("newState"),
  metadata: text("metadata"), // JSON string
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
