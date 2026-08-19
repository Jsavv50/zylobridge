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
  index,
  uniqueIndex,
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
export const organizationRoleEnum = pgEnum("organization_role", ["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER", "MEMBER"]);
export const organizationMemberStatusEnum = pgEnum("organization_member_status", ["active", "suspended", "removed"]);
export const organizationInvitationStatusEnum = pgEnum("organization_invitation_status", ["pending", "accepted", "rejected", "cancelled", "expired"]);
export const organizationProjectStatusEnum = pgEnum("organization_project_status", ["active", "archived"]);

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
}, (table) => ({
  userIdx: index("profiles_user_idx").on(table.userId),
  vocationAvailableIdx: index("profiles_vocation_available_idx").on(table.vocation, table.isAvailable),
}));
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
  organizationId: integer("organizationId"),
  projectId: integer("projectId"),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  vocationStatusCreatedAtIdx: index("jobs_vocation_status_created_at_idx").on(table.vocation, table.status, table.createdAt),
  clientCreatedAtIdx: index("jobs_client_created_at_idx").on(table.clientId, table.createdAt),
}));
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
}, (table) => ({
  jobStatusIdx: index("applications_job_status_idx").on(table.jobId, table.status),
  professionalCreatedAtIdx: index("applications_professional_created_at_idx").on(table.professionalId, table.createdAt),
}));
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
}, (table) => ({
  clientLastMessageIdx: index("conversations_client_last_message_idx").on(table.clientId, table.lastMessageAt),
  professionalLastMessageIdx: index("conversations_professional_last_message_idx").on(table.professionalId, table.lastMessageAt),
}));
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
}, (table) => ({
  conversationCreatedAtIdx: index("messages_conversation_created_at_idx").on(table.conversationId, table.createdAt),
  unreadByConversationIdx: index("messages_conversation_read_sender_idx").on(table.conversationId, table.isRead, table.senderId),
}));
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
}, (table) => ({
  userCreatedAtIdx: index("verification_requests_user_created_at_idx").on(table.userId, table.createdAt),
  statusCreatedAtIdx: index("verification_requests_status_created_at_idx").on(table.status, table.createdAt),
}));
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
}, (table) => ({
  userCreatedAtIdx: index("orders_user_created_at_idx").on(table.userId, table.createdAt),
  paystackReferenceIdx: index("orders_paystack_reference_idx").on(table.paystackReference),
}));
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Enterprise organization foundation ─────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  slugUnique: uniqueIndex("organizations_slug_unique").on(table.slug),
  ownerCreatedAtIdx: index("organizations_owner_created_at_idx").on(table.ownerId, table.createdAt),
}));
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull(),
  userId: integer("userId").notNull(),
  role: organizationRoleEnum("role").default("MEMBER").notNull(),
  status: organizationMemberStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  organizationUserUnique: uniqueIndex("organization_members_organization_user_unique").on(table.organizationId, table.userId),
  organizationStatusIdx: index("organization_members_organization_status_idx").on(table.organizationId, table.status),
  userStatusIdx: index("organization_members_user_status_idx").on(table.userId, table.status),
}));
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

export const organizationInvitations = pgTable("organization_invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull(),
  inviterUserId: integer("inviterUserId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: organizationRoleEnum("role").default("MEMBER").notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
  status: organizationInvitationStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedByUserId: integer("acceptedByUserId"),
  acceptedAt: timestamp("acceptedAt"),
  rejectedAt: timestamp("rejectedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tokenHashUnique: uniqueIndex("organization_invitations_token_hash_unique").on(table.tokenHash),
  organizationStatusIdx: index("organization_invitations_organization_status_idx").on(table.organizationId, table.status, table.createdAt),
  emailStatusIdx: index("organization_invitations_email_status_idx").on(table.email, table.status),
}));
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation = typeof organizationInvitations.$inferInsert;

export const organizationProjects = pgTable("organization_projects", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull(),
  createdById: integer("createdById").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: organizationProjectStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  organizationStatusIdx: index("organization_projects_organization_status_idx").on(table.organizationId, table.status, table.createdAt),
}));
export type OrganizationProject = typeof organizationProjects.$inferSelect;
export type InsertOrganizationProject = typeof organizationProjects.$inferInsert;

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

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

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
}, (table) => ({
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  resourceIdx: index("audit_logs_resource_idx").on(table.resourceType, table.resourceId, table.createdAt),
}));
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── OAuth Transactions ────────────────────────────────────────────────────────
export const oauthTransactions = pgTable("oauth_transactions", {
  id: serial("id").primaryKey(),
  requestId: varchar("requestId", { length: 32 }).notNull(),
  stateHash: varchar("stateHash", { length: 64 }).notNull().unique(),
  authCodeHash: varchar("authCodeHash", { length: 64 }),
  status: varchar("status", { length: 32 }).default("initiated").notNull(), // initiated, claimed, completed, failed
  userId: integer("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  completedAt: timestamp("completedAt"),
});
export type OAuthTransaction = typeof oauthTransactions.$inferSelect;
export type InsertOAuthTransaction = typeof oauthTransactions.$inferInsert;
