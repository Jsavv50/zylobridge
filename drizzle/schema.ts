import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Shared database enums ────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin", "SUPER_ADMIN"]);
export const userTypeEnum = pgEnum("user_type", ["client", "professional", "enterprise", "unset"]);
export const vocationEnum = pgEnum("vocation", [
  "electrician", "carpenter", "plumber", "mason_bricklayer", "painter", "flooring_tiler",
  "heavy_equipment_operator", "road_construction_worker", "hvac_technician", "elevator_installer_repairer",
  "pest_control_technician", "glazier", "bricklayer", "mason", "tiler", "roofer", "welder",
  "steel_fixer", "scaffolder", "plasterer", "drywall_installer", "flooring_installer", "general_laborer",
  "construction_supervisor", "site_manager", "quantity_surveyor", "civil_engineer", "structural_engineer",
  "architect", "cleaner", "gardener", "landscaper", "security_guard", "cctv_technician",
  "maintenance_technician", "handyman", "pool_technician", "facilities_manager", "mechanic",
  "auto_electrician", "diesel_mechanic", "machine_operator", "forklift_operator", "generator_technician",
  "solar_technician", "refrigeration_technician", "domestic_worker", "nanny", "caregiver", "cook", "baker",
  "hairdresser", "barber", "makeup_artist", "tailor", "fashion_designer", "driver", "delivery_driver",
  "truck_driver", "courier", "warehouse_worker", "logistics_coordinator", "dispatcher", "graphic_designer",
  "web_developer", "software_developer", "it_support_specialist", "network_technician", "digital_marketer",
  "photographer", "videographer", "accountant", "bookkeeper", "administrative_assistant",
]);
export const jobStatusEnum = pgEnum("job_status", ["draft", "open", "paused", "in_progress", "completed", "cancelled", "closed"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "under_review", "shortlisted", "interview", "accepted", "hired", "rejected", "withdrawn"]);
export const paymentMethodEnum = pgEnum("payment_method", ["paystack", "bank_transfer"]);
export const escrowStatusEnum = pgEnum("escrow_status", ["pending", "funded", "released", "refunded", "disputed"]);
export const documentTypeEnum = pgEnum("document_type", ["trade_licence", "certification", "government_id", "insurance_certificate", "guild_membership"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "failed", "refunded"]);
export const organizationRoleEnum = pgEnum("organization_role", ["OWNER", "ADMIN", "HIRING_MANAGER", "RECRUITER", "PROJECT_MANAGER", "FINANCE_MANAGER", "VIEWER", "MEMBER"]);
export const organizationMemberStatusEnum = pgEnum("organization_member_status", ["active", "suspended", "removed"]);
export const organizationInvitationStatusEnum = pgEnum("organization_invitation_status", ["pending", "accepted", "rejected", "cancelled", "expired"]);
export const organizationProjectStatusEnum = pgEnum("organization_project_status", ["active", "archived"]);
export const workforceAssignmentStatusEnum = pgEnum("workforce_assignment_status", ["assigned", "active", "completed", "removed"]);

// ─── Accounts and professional marketplace ───────────────────────────────────
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

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  serviceRadiusKm: numeric("serviceRadiusKm", { precision: 8, scale: 2 }).default("50"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("profiles_user_id_unique").on(table.userId),
  index("profiles_vocation_available_idx").on(table.vocation, table.isAvailable),
]);
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ─── Enterprise organizations ─────────────────────────────────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  logoKey: text("logoKey"),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  industry: varchar("industry", { length: 160 }),
  companySize: varchar("companySize", { length: 80 }),
  yearEstablished: integer("yearEstablished"),
  website: varchar("website", { length: 500 }),
  businessEmail: varchar("businessEmail", { length: 320 }),
  businessPhone: varchar("businessPhone", { length: 40 }),
  location: varchar("location", { length: 255 }),
  operatingRegions: jsonb("operatingRegions").$type<string[]>().default([]),
  socialLinks: jsonb("socialLinks").$type<Record<string, string>>().default({}),
  registrationNumber: varchar("registrationNumber", { length: 160 }),
  verificationStatus: verificationStatusEnum("verificationStatus").default("pending").notNull(),
  verificationNote: text("verificationNote"),
  verificationReviewedAt: timestamp("verificationReviewedAt"),
  verificationReviewedBy: integer("verificationReviewedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("organizations_owner_created_at_idx").on(table.ownerId, table.createdAt)]);
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: organizationRoleEnum("role").default("MEMBER").notNull(),
  status: organizationMemberStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("organization_members_org_user_unique").on(table.organizationId, table.userId)]);
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

export const organizationInvitations = pgTable("organization_invitations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  inviterUserId: integer("inviterUserId").notNull().references(() => users.id),
  email: varchar("email", { length: 320 }).notNull(),
  role: organizationRoleEnum("role").default("MEMBER").notNull(),
  tokenHash: varchar("tokenHash", { length: 255 }).notNull(),
  status: organizationInvitationStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedByUserId: integer("acceptedByUserId").references(() => users.id),
  acceptedAt: timestamp("acceptedAt"),
  rejectedAt: timestamp("rejectedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("organization_invitations_email_status_idx").on(table.email, table.status)]);
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type InsertOrganizationInvitation = typeof organizationInvitations.$inferInsert;

export const organizationProjects = pgTable("organization_projects", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdById: integer("createdById").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: organizationProjectStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type OrganizationProject = typeof organizationProjects.$inferSelect;
export type InsertOrganizationProject = typeof organizationProjects.$inferInsert;

export const organizationVerificationRequests = pgTable("organization_verification_requests", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  submittedByUserId: integer("submittedByUserId").notNull().references(() => users.id),
  documentType: varchar("documentType", { length: 100 }).notNull(),
  documentKey: text("documentKey").notNull(),
  status: verificationStatusEnum("status").default("pending").notNull(),
  adminNote: text("adminNote"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: integer("reviewedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type OrganizationVerificationRequest = typeof organizationVerificationRequests.$inferSelect;
export type InsertOrganizationVerificationRequest = typeof organizationVerificationRequests.$inferInsert;

// ─── Jobs, candidates, and workforce ─────────────────────────────────────────
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull().references(() => users.id),
  organizationId: integer("organizationId").references(() => organizations.id),
  projectId: integer("projectId").references(() => organizationProjects.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  vocation: vocationEnum("vocation").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  deadline: timestamp("deadline"),
  status: jobStatusEnum("status").default("draft").notNull(),
  assignedProfessionalId: integer("assignedProfessionalId").references(() => users.id),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  serviceRadiusKm: numeric("serviceRadiusKm", { precision: 8, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("jobs_client_created_at_idx").on(table.clientId, table.createdAt),
  index("jobs_organization_created_at_idx").on(table.organizationId, table.createdAt),
  index("jobs_project_created_at_idx").on(table.projectId, table.createdAt),
  index("jobs_vocation_status_created_at_idx").on(table.vocation, table.status, table.createdAt),
]);
export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  professionalId: integer("professionalId").notNull().references(() => users.id),
  coverLetter: text("coverLetter").notNull(),
  bidAmount: numeric("bidAmount", { precision: 12, scale: 2 }).notNull(),
  status: applicationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("applications_job_professional_unique").on(table.jobId, table.professionalId),
  index("applications_job_status_idx").on(table.jobId, table.status),
  index("applications_professional_created_at_idx").on(table.professionalId, table.createdAt),
]);
export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

export const workforceAssignments = pgTable("organization_workforce_assignments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  projectId: integer("projectId").references(() => organizationProjects.id, { onDelete: "set null" }),
  jobId: integer("jobId").references(() => jobs.id, { onDelete: "set null" }),
  professionalId: integer("professionalId").notNull().references(() => users.id),
  assignedByUserId: integer("assignedByUserId").notNull().references(() => users.id),
  status: workforceAssignmentStatusEnum("status").default("assigned").notNull(),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workforce_assignment_org_job_professional_unique").on(table.organizationId, table.jobId, table.professionalId),
  index("workforce_assignments_org_status_idx").on(table.organizationId, table.status),
]);
export type WorkforceAssignment = typeof workforceAssignments.$inferSelect;
export type InsertWorkforceAssignment = typeof workforceAssignments.$inferInsert;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().references(() => jobs.id),
  reviewerId: integer("reviewerId").notNull().references(() => users.id),
  revieweeId: integer("revieweeId").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─── Messaging, notifications, verification, and payments ────────────────────
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  clientId: integer("clientId").notNull().references(() => users.id),
  professionalId: integer("professionalId").notNull().references(() => users.id),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("conversations_client_last_message_idx").on(table.clientId, table.lastMessageAt),
  index("conversations_professional_last_message_idx").on(table.professionalId, table.lastMessageAt),
]);
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("senderId").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("messages_conversation_created_at_idx").on(table.conversationId, table.createdAt)]);
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 80 }).default("system").notNull(),
  referenceType: varchar("referenceType", { length: 80 }),
  referenceId: varchar("referenceId", { length: 120 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("notifications_user_created_at_idx").on(table.userId, table.createdAt)]);
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const escrowPayments = pgTable("escrow_payments", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull().references(() => jobs.id),
  clientId: integer("clientId").notNull().references(() => users.id),
  professionalId: integer("professionalId").notNull().references(() => users.id),
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
  adminConfirmedBy: integer("adminConfirmedBy").references(() => users.id),
  paidAt: timestamp("paidAt"),
  releasedAt: timestamp("releasedAt"),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type EscrowPayment = typeof escrowPayments.$inferSelect;
export type InsertEscrowPayment = typeof escrowPayments.$inferInsert;

export const verificationRequests = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  documentType: documentTypeEnum("documentType").notNull(),
  documentUrl: text("documentUrl").notNull(),
  documentKey: text("documentKey").notNull(),
  status: verificationStatusEnum("status").default("pending").notNull(),
  adminNote: text("adminNote"),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: integer("reviewedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type InsertVerificationRequest = typeof verificationRequests.$inferInsert;

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actorUserId").notNull().references(() => users.id),
  actorRole: varchar("actorRole", { length: 80 }).notNull(),
  action: varchar("action", { length: 160 }).notNull(),
  resourceType: varchar("resourceType", { length: 100 }).notNull(),
  resourceId: varchar("resourceId", { length: 120 }),
  previousState: text("previousState"),
  newState: text("newState"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_logs_resource_idx").on(table.resourceType, table.resourceId)]);
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Commerce and legacy OTP tables retained for compatibility ───────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(), name: varchar("name", { length: 255 }).notNull(), description: text("description").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(), currency: varchar("currency", { length: 10 }).default("NGN").notNull(),
  imageUrl: text("imageUrl"), imageKey: text("imageKey"), category: varchar("category", { length: 100 }), stock: integer("stock").default(-1).notNull(),
  isActive: boolean("isActive").default(true).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull().references(() => users.id), productId: integer("productId").notNull().references(() => products.id),
  quantity: integer("quantity").default(1).notNull(), amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), currency: varchar("currency", { length: 10 }).default("NGN").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(), paystackReference: varchar("paystackReference", { length: 255 }), paystackAccessCode: varchar("paystackAccessCode", { length: 255 }),
  paystackAuthorizationUrl: text("paystackAuthorizationUrl"), paidAt: timestamp("paidAt"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const emailOtps = pgTable("email_otps", { id: serial("id").primaryKey(), email: varchar("email", { length: 320 }).notNull(), otp: varchar("otp", { length: 8 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), verified: boolean("verified").default(false).notNull(), attempts: integer("attempts").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const phoneOtps = pgTable("phone_otps", { id: serial("id").primaryKey(), phone: varchar("phone", { length: 20 }).notNull(), otp: varchar("otp", { length: 6 }).notNull(), expiresAt: timestamp("expiresAt").notNull(), verified: boolean("verified").default(false).notNull(), attempts: integer("attempts").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export type EmailOtp = typeof emailOtps.$inferSelect;
export type PhoneOtp = typeof phoneOtps.$inferSelect;
