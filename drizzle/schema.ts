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
  bigint,
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
  "steel_fixer",
  "roofer",
  "scaffolder",
  "drywall_gypsum_installer",
  "acoustic_ceiling_wallpaper_installer",
  "concrete_finisher",
  "stone_mason",
  "waterproofing_technician",
  "insulation_installer",
  "rigger",
  "building_restoration_technician",
  "demolition_worker",
  "handyman",
  "solar_pv_installer",
  "solar_technician",
  "generator_technician",
  "power_systems_technician",
  "wind_turbine_technician",
  "fire_alarm_technician",
  "security_systems_cctv_technician",
  "smart_home_building_automation_technician",
  "fiber_optics_installer",
  "telecommunication_technician",
  "security_system_installer",
  "pipefitter",
  "gas_technician",
  "sanitary_installation_technician",
  "drainage_technician",
  "water_treatment_technician",
  "borehole_technician_driller",
  "irrigation_smart_agricultural_technician",
  "pool_technician",
  "civil_engineer",
  "surveyor",
  "road_marking_technician",
  "excavation_worker",
  "bridge_construction_worker",
  "railway_construction_worker",
  "port_railway_worker",
  "geological_field_assistant",
  "drilling_operator",
  "automotive_mechanic",
  "heavy_vehicle_mechanic",
  "fitters_turners",
  "plant_mechanic",
  "industrial_machinery_technician",
  "hydraulic_technician",
  "compressed_air_pneumatic_technician",
  "millwright",
  "machinist",
  "boilermaker",
  "welder_fabricator",
  "pipe_welder",
  "mining_technician",
  "mining_equipment_plant_technician",
  "mechanical_industrial_technician",
  "truck_driver",
  "fleet_operator",
  "warehouse_worker",
  "supply_chain_technician",
  "agricultural_processing_worker",
  "farm_equipment_operator",
  "arborist",
  "landscape_maintenance_worker",
  "gardener_groundskeeper",
  "general_maintenance_technician",
  "building_maintenance_technician",
  "facilities_technician",
  "private_commercial_cleaning_technician",
  "appliance_repair_technician",
  "door_window_installer",
  "locksmith",
  "furniture_maker",
  "safety_officer",
  "fire_protection_technician",
  "fire_sprinkler_installer",
  "fire_extinguisher_technician",
  "drone_operator",
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
  latitude: numeric("latitude", { precision: 10, scale: 8 }),
  longitude: numeric("longitude", { precision: 11, scale: 8 }),
  serviceRadiusKm: integer("serviceRadiusKm").default(50),
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
  /** Explicit market currency for new jobs; null preserves legacy records without reinterpretation. */
  currency: varchar("currency", { length: 3 }),
  location: varchar("location", { length: 255 }).notNull(),
  deadline: timestamp("deadline"),
  status: jobStatusEnum("status").default("open").notNull(),
  assignedProfessionalId: integer("assignedProfessionalId"),
  organizationId: integer("organizationId"),
  projectId: integer("projectId"),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 8 }),
  longitude: numeric("longitude", { precision: 11, scale: 8 }),
  serviceRadiusKm: integer("serviceRadiusKm").default(50),
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

// ─── Saved Jobs ───────────────────────────────────────────────────────────────
export const savedJobs = pgTable("saved_jobs", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  professionalId: integer("professionalId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  jobProfessionalUnique: uniqueIndex("saved_jobs_job_professional_unique").on(table.jobId, table.professionalId),
  professionalCreatedAtIdx: index("saved_jobs_professional_created_at_idx").on(table.professionalId, table.createdAt),
}));
export type SavedJob = typeof savedJobs.$inferSelect;
export type InsertSavedJob = typeof savedJobs.$inferInsert;

// ─── Professional Job Alerts ───────────────────────────────────────────────────
export const jobAlerts = pgTable("job_alerts", {
  id: serial("id").primaryKey(),
  professionalId: integer("professionalId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  q: varchar("q", { length: 120 }),
  vocation: varchar("vocation", { length: 64 }),
  location: varchar("location", { length: 200 }),
  currency: varchar("currency", { length: 3 }),
  isUrgentOnly: boolean("isUrgentOnly").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  professionalActiveIdx: index("job_alerts_professional_active_idx").on(table.professionalId, table.isActive, table.updatedAt),
  professionalNameUnique: uniqueIndex("job_alerts_professional_name_unique").on(table.professionalId, table.name),
}));
export type JobAlert = typeof jobAlerts.$inferSelect;
export type InsertJobAlert = typeof jobAlerts.$inferInsert;

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


// ─── Phase 3 Hiring Marketplace & Verification Extensions ─────────────────────
export const verificationCategoryEnum = pgEnum("verification_category", [
  "email",
  "phone",
  "identity",
  "qualification",
  "certification",
  "work_history",
  "reference",
  "portfolio",
]);

export const verificationItemStatusEnum = pgEnum("verification_item_status", [
  "pending",
  "under_review",
  "verified",
  "rejected",
  "expired",
  "resubmission_required",
]);

export const interviewStatusEnum = pgEnum("interview_status", ["proposed", "confirmed", "cancelled", "completed"]);
export const offerStatusEnum = pgEnum("offer_status", ["pending", "accepted", "declined"]);
export const engagementStatusEnum = pgEnum("engagement_status", ["active", "completed", "cancelled", "disputed"]);

export const professionalPortfolios = pgTable("professional_portfolios", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  projectUrl: text("projectUrl"),
  skills: text("skills"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("professional_portfolios_user_idx").on(table.userId),
}));
export type ProfessionalPortfolio = typeof professionalPortfolios.$inferSelect;
export type InsertProfessionalPortfolio = typeof professionalPortfolios.$inferInsert;

export const professionalQualifications = pgTable("professional_qualifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  issuingOrg: varchar("issuingOrg", { length: 255 }).notNull(),
  issueDate: timestamp("issueDate"),
  expiryDate: timestamp("expiryDate"),
  credentialId: varchar("credentialId", { length: 128 }),
  credentialUrl: text("credentialUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("professional_qualifications_user_idx").on(table.userId),
}));
export type ProfessionalQualification = typeof professionalQualifications.$inferSelect;
export type InsertProfessionalQualification = typeof professionalQualifications.$inferInsert;

export const professionalExperiences = pgTable("professional_experiences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  isCurrent: boolean("isCurrent").default(false).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("professional_experiences_user_idx").on(table.userId),
}));
export type ProfessionalExperience = typeof professionalExperiences.$inferSelect;
export type InsertProfessionalExperience = typeof professionalExperiences.$inferInsert;

export const professionalVerifications = pgTable("professional_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  verificationType: verificationCategoryEnum("verificationType").notNull(),
  status: verificationItemStatusEnum("status").default("pending").notNull(),
  documentUrl: text("documentUrl"),
  documentKey: text("documentKey"),
  adminNote: text("adminNote"),
  reviewedBy: integer("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userTypeUnique: uniqueIndex("professional_verifications_user_type_unique").on(table.userId, table.verificationType),
  statusIdx: index("professional_verifications_status_idx").on(table.status, table.createdAt),
}));
export type ProfessionalVerification = typeof professionalVerifications.$inferSelect;
export type InsertProfessionalVerification = typeof professionalVerifications.$inferInsert;

export const shortlists = pgTable("shortlists", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  employerId: integer("employerId").notNull(),
  professionalId: integer("professionalId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  jobProfessionalUnique: uniqueIndex("shortlists_job_professional_unique").on(table.jobId, table.professionalId),
  employerIdx: index("shortlists_employer_idx").on(table.employerId, table.createdAt),
}));
export type Shortlist = typeof shortlists.$inferSelect;
export type InsertShortlist = typeof shortlists.$inferInsert;

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  applicationId: integer("applicationId"),
  employerId: integer("employerId").notNull(),
  professionalId: integer("professionalId").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: interviewStatusEnum("status").default("proposed").notNull(),
  locationOrLink: text("locationOrLink"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  professionalIdx: index("interviews_professional_idx").on(table.professionalId, table.scheduledAt),
  employerIdx: index("interviews_employer_idx").on(table.employerId, table.scheduledAt),
}));
export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  applicationId: integer("applicationId"),
  employerId: integer("employerId").notNull(),
  professionalId: integer("professionalId").notNull(),
  compensation: numeric("compensation", { precision: 12, scale: 2 }).notNull(),
  roleDescription: text("roleDescription").notNull(),
  startDate: timestamp("startDate").notNull(),
  duration: varchar("duration", { length: 128 }),
  status: offerStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  professionalIdx: index("offers_professional_idx").on(table.professionalId, table.status),
  employerIdx: index("offers_employer_idx").on(table.employerId, table.status),
}));
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

export const engagements = pgTable("engagements", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  offerId: integer("offerId"),
  employerId: integer("employerId").notNull(),
  professionalId: integer("professionalId").notNull(),
  compensation: numeric("compensation", { precision: 12, scale: 2 }).notNull(),
  status: engagementStatusEnum("status").default("active").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  professionalIdx: index("engagements_professional_idx").on(table.professionalId, table.status),
  employerIdx: index("engagements_employer_idx").on(table.employerId, table.status),
}));
export type Engagement = typeof engagements.$inferSelect;
export type InsertEngagement = typeof engagements.$inferInsert;


// ─── Phase 4 Marketplace Intelligence & Communication Extensions ──────────────
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  marketingEnabled: boolean("marketingEnabled").default(false).notNull(),
  marketplaceEvents: boolean("marketplaceEvents").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("notification_preferences_user_idx").on(table.userId),
}));
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 64 }).default("system").notNull(),
  referenceType: varchar("referenceType", { length: 64 }),
  referenceId: varchar("referenceId", { length: 64 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userUnreadIdx: index("notifications_user_unread_idx").on(table.userId, table.isRead, table.createdAt),
}));
export type NotificationItem = typeof notifications.$inferSelect;
export type InsertNotificationItem = typeof notifications.$inferInsert;

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  reminderType: varchar("reminderType", { length: 64 }).notNull(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  isSent: boolean("isSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  scheduledIdx: index("reminders_scheduled_idx").on(table.isSent, table.scheduledFor),
  uniqueUserEntity: uniqueIndex("reminders_unique_user_entity_type").on(table.userId, table.entityType, table.entityId, table.reminderType),
}));
export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

export const matchingScores = pgTable("matching_scores", {
  id: serial("id").primaryKey(),
  jobId: integer("jobId").notNull(),
  professionalId: integer("professionalId").notNull(),
  structuredScore: numeric("structuredScore", { precision: 5, scale: 2 }).notNull(),
  semanticScore: numeric("semanticScore", { precision: 5, scale: 2 }),
  finalScore: numeric("finalScore", { precision: 5, scale: 2 }).notNull(),
  explanation: text("explanation"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  jobProfUnique: uniqueIndex("matching_scores_job_prof_unique").on(table.jobId, table.professionalId),
  jobScoreIdx: index("matching_scores_job_score_idx").on(table.jobId, table.finalScore),
}));
export type MatchingScore = typeof matchingScores.$inferSelect;
export type InsertMatchingScore = typeof matchingScores.$inferInsert;


// ─── Phase 5B-1 Financial Core Extensions ─────────────────────────────────────
export const milestoneStatusEnum = pgEnum("milestone_status", ["draft", "funded", "in_progress", "submitted", "approved", "release_pending", "released", "disputed", "cancelled"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["created", "payment_required", "payment_initiated", "payment_pending", "payment_confirmed", "funded", "failed", "expired", "refund_pending", "refunded", "disputed", "cancelled"]);
export const ledgerAccountTypeEnum = pgEnum("ledger_account_type", ["asset", "liability", "equity", "revenue", "expense"]);

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  engagementId: integer("engagementId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amountMinor: bigint("amountMinor", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  status: milestoneStatusEnum("status").default("draft").notNull(),
  dueDate: timestamp("dueDate"),
  fundedAt: timestamp("fundedAt"),
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  engagementIdx: index("milestones_engagement_idx").on(table.engagementId),
}));
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 120 }).notNull().unique(),
  engagementId: integer("engagementId").notNull(),
  milestoneId: integer("milestoneId").notNull(),
  payerId: integer("payerId").notNull(),
  payeeId: integer("payeeId"),
  amountMinor: bigint("amountMinor", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  status: transactionStatusEnum("status").default("created").notNull(),
  provider: varchar("provider", { length: 32 }).default("paystack").notNull(),
  providerReference: varchar("providerReference", { length: 120 }),
  platformFeeMinor: bigint("platformFeeMinor", { mode: "number" }).default(0).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  refIdx: index("payment_transactions_ref_idx").on(table.reference),
  engagementIdx: index("payment_transactions_engagement_idx").on(table.engagementId),
}));
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  transactionId: integer("transactionId"),
  provider: varchar("provider", { length: 32 }).default("paystack").notNull(),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  providerEventId: varchar("providerEventId", { length: 120 }).unique(),
  rawPayload: text("rawPayload").notNull(),
  signatureValid: boolean("signatureValid").default(false).notNull(),
  processed: boolean("processed").default(false).notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  providerEventIdx: index("payment_events_provider_event_idx").on(table.providerEventId),
}));
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type InsertPaymentEvent = typeof paymentEvents.$inferInsert;

export const ledgerAccounts = pgTable("ledger_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  type: ledgerAccountTypeEnum("type").notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LedgerAccount = typeof ledgerAccounts.$inferSelect;
export type InsertLedgerAccount = typeof ledgerAccounts.$inferInsert;

export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  transactionId: integer("transactionId").notNull(),
  accountId: integer("accountId").notNull(),
  debitMinor: bigint("debitMinor", { mode: "number" }).default(0).notNull(),
  creditMinor: bigint("creditMinor", { mode: "number" }).default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  transactionIdx: index("ledger_entries_transaction_idx").on(table.transactionId),
  accountIdx: index("ledger_entries_account_idx").on(table.accountId),
}));
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;

export const reconciliationRecords = pgTable("reconciliation_records", {
  id: serial("id").primaryKey(),
  transactionId: integer("transactionId").notNull(),
  status: varchar("status", { length: 32 }).default("matched").notNull(),
  discrepancyDetails: text("discrepancyDetails"),
  reconciledAt: timestamp("reconciledAt").defaultNow().notNull(),
});
export type ReconciliationRecord = typeof reconciliationRecords.$inferSelect;
export type InsertReconciliationRecord = typeof reconciliationRecords.$inferInsert;


// ─── Phase 5B-2 Financial Protection Extensions ───────────────────────────────
export const payoutStatusEnum = pgEnum("payout_status", ["payout_pending", "payout_eligible", "payout_initiated", "payout_processing", "payout_completed", "payout_failed", "payout_retry_pending", "payout_reversed"]);
export const refundStatusEnum = pgEnum("refund_status", ["refund_pending", "refund_processing", "refund_completed", "refund_failed"]);
export const professionalBankAccounts = pgTable("professional_bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  bankName: varchar("bankName", { length: 128 }).notNull(),
  bankCode: varchar("bankCode", { length: 32 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 32 }).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  recipientCode: varchar("recipientCode", { length: 128 }),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("professional_bank_accounts_user_idx").on(table.userId),
}));
export type ProfessionalBankAccount = typeof professionalBankAccounts.$inferSelect;
export type InsertProfessionalBankAccount = typeof professionalBankAccounts.$inferInsert;

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 120 }).notNull().unique(),
  engagementId: integer("engagementId").notNull(),
  milestoneId: integer("milestoneId").notNull(),
  professionalId: integer("professionalId").notNull(),
  amountMinor: bigint("amountMinor", { mode: "number" }).notNull(),
  platformFeeMinor: bigint("platformFeeMinor", { mode: "number" }).default(0).notNull(),
  netAmountMinor: bigint("netAmountMinor", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  status: payoutStatusEnum("status").default("payout_pending").notNull(),
  transferCode: varchar("transferCode", { length: 128 }),
  transferReference: varchar("transferReference", { length: 120 }),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  refIdx: index("payouts_reference_idx").on(table.reference),
  engagementIdx: index("payouts_engagement_idx").on(table.engagementId),
}));
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 120 }).notNull().unique(),
  transactionId: integer("transactionId").notNull(),
  engagementId: integer("engagementId").notNull(),
  amountMinor: bigint("amountMinor", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NGN").notNull(),
  status: refundStatusEnum("status").default("refund_pending").notNull(),
  providerRefundId: varchar("providerRefundId", { length: 128 }),
  reason: text("reason"),
  authorizedBy: integer("authorizedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  refIdx: index("refunds_reference_idx").on(table.reference),
}));
export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = typeof refunds.$inferInsert;

export const engagementDisputes = pgTable("engagement_disputes", {
  id: serial("id").primaryKey(),
  engagementId: integer("engagementId").notNull(),
  milestoneId: integer("milestoneId"),
  transactionId: integer("transactionId"),
  initiatorId: integer("initiatorId").notNull(),
  respondentId: integer("respondentId").notNull(),
  reason: text("reason").notNull(),
  status: pgEnum("engagement_dispute_status", ["opened", "under_review", "evidence_requested", "mediation", "resolution_pending", "resolved", "escalated", "closed"])("status").default("opened").notNull(),
  resolution: text("resolution"),
  resolvedBy: integer("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  engagementIdx: index("engagement_disputes_engagement_idx").on(table.engagementId),
}));
export type EngagementDispute = typeof engagementDisputes.$inferSelect;
export type InsertEngagementDispute = typeof engagementDisputes.$inferInsert;

export const disputeEvidence = pgTable("dispute_evidence", {
  id: serial("id").primaryKey(),
  disputeId: integer("disputeId").notNull(),
  uploaderId: integer("uploaderId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  disputeIdx: index("dispute_evidence_dispute_idx").on(table.disputeId),
}));
export type DisputeEvidence = typeof disputeEvidence.$inferSelect;
export type InsertDisputeEvidence = typeof disputeEvidence.$inferInsert;

// ─── Phase 6A delivery log compatibility ──────────────────────────────────────
// Kept as a simple operational log table so the existing notification dispatcher
// can remain aligned with the Phase 6A migration contract.
export const notificationDeliveryLogs = pgTable("notification_delivery_logs", {
  id: serial("id").primaryKey(),
  notificationId: integer("notificationId"),
  userId: integer("userId").notNull(),
  channel: varchar("channel", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  payload: text("payload"),
  errorMessage: text("errorMessage"),
  retryCount: integer("retryCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("notification_delivery_logs_user_idx").on(table.userId),
  statusIdx: index("notification_delivery_logs_status_idx").on(table.status),
}));
export type NotificationDeliveryLog = typeof notificationDeliveryLogs.$inferSelect;
export type InsertNotificationDeliveryLog = typeof notificationDeliveryLogs.$inferInsert;
