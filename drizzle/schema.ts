import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["client", "professional", "unset"]).default("unset").notNull(),
  avatarUrl: text("avatarUrl"),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Professional Profiles ────────────────────────────────────────────────────
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vocation: mysqlEnum("vocation", [
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
  ]).notNull(),
  bio: text("bio"),
  skills: text("skills"),
  certifications: text("certifications"),
  portfolioUrl: text("portfolioUrl"),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  location: varchar("location", { length: 255 }),
  yearsExperience: int("yearsExperience"),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00"),
  totalReviews: int("totalReviews").default(0).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  vocation: mysqlEnum("vocation", [
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
  ]).notNull(),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  deadline: timestamp("deadline"),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"])
    .default("open")
    .notNull(),
  assignedProfessionalId: int("assignedProfessionalId"),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

// ─── Applications ─────────────────────────────────────────────────────────────
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  professionalId: int("professionalId").notNull(),
  coverLetter: text("coverLetter").notNull(),
  bidAmount: decimal("bidAmount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "withdrawn"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  revieweeId: int("revieweeId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
