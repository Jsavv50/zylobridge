import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  organizationInvitations,
  organizationMembers,
  organizationProjects,
  organizations,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationProject,
  organizationRoleEnum,
  InsertOrganization,
  InsertOrganizationInvitation,
  InsertOrganizationMember,
  InsertOrganizationProject,
  users,
} from "../drizzle/schema";
import { getDb, clampOffset, clampPageSize, MAX_PAGE_SIZE } from "./db";
import { sendOrganizationInvitationEmail } from "./email";

export type OrganizationRole = "OWNER" | "ADMIN" | "HIRING_MANAGER" | "RECRUITER" | "MEMBER";
export type OrganizationInvitationStatus = "pending" | "accepted" | "rejected" | "cancelled" | "expired";

const TEAM_MANAGEMENT_ROLES: OrganizationRole[] = ["OWNER", "ADMIN"];
const INVITE_ROLES: OrganizationRole[] = ["ADMIN", "HIRING_MANAGER", "RECRUITER", "MEMBER"];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function slugify(value: string) {
  const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return `${base || "organization"}-${randomBytes(4).toString("hex")}`;
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function canManageOrganization(role: OrganizationRole | undefined) {
  return !!role && TEAM_MANAGEMENT_ROLES.includes(role);
}

export function canInviteOrganizationMembers(role: OrganizationRole | undefined) {
  return !!role && TEAM_MANAGEMENT_ROLES.includes(role);
}

export async function getOrganizationMember(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [member] = await db.select().from(organizationMembers).where(and(
    eq(organizationMembers.organizationId, organizationId),
    eq(organizationMembers.userId, userId),
    eq(organizationMembers.status, "active"),
  )).limit(1);
  return member;
}

export async function requireOrganizationMember(organizationId: number, userId: number) {
  const member = await getOrganizationMember(organizationId, userId);
  if (!member) throw new Error("Organization membership required");
  return member;
}

export async function createOrganization(ownerId: number, input: { name: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const slug = slugify(input.name);
  const [organization] = await db.insert(organizations).values({
    ownerId,
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
  }).returning();
  await db.insert(organizationMembers).values({
    organizationId: organization.id,
    userId: ownerId,
    role: "OWNER",
    status: "active",
  });
  return organization;
}

export async function listOrganizationsForUser(userId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ organization: organizations, membership: organizationMembers })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .orderBy(desc(organizations.updatedAt))
    .limit(clampPageSize(limit, MAX_PAGE_SIZE))
    .offset(clampOffset(offset));
}

export async function getOrganizationById(organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [organization] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  return organization;
}

export async function listOrganizationMembers(organizationId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ member: organizationMembers, user: users })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active")))
    .orderBy(desc(organizationMembers.createdAt))
    .limit(clampPageSize(limit, MAX_PAGE_SIZE))
    .offset(clampOffset(offset));
}

export async function updateOrganizationMemberRole(organizationId: number, memberUserId: number, role: OrganizationRole) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(organizationMembers).set({ role, updatedAt: new Date() }).where(and(
    eq(organizationMembers.organizationId, organizationId),
    eq(organizationMembers.userId, memberUserId),
    eq(organizationMembers.status, "active"),
  ));
}

export async function removeOrganizationMember(organizationId: number, memberUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(organizationMembers).set({ status: "removed", updatedAt: new Date() }).where(and(
    eq(organizationMembers.organizationId, organizationId),
    eq(organizationMembers.userId, memberUserId),
    eq(organizationMembers.status, "active"),
  ));
}

export async function listOrganizationInvitations(organizationId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationInvitations)
    .where(eq(organizationInvitations.organizationId, organizationId))
    .orderBy(desc(organizationInvitations.createdAt))
    .limit(clampPageSize(limit, MAX_PAGE_SIZE))
    .offset(clampOffset(offset));
}

export async function createOrganizationInvitation(input: {
  organizationId: number;
  inviterUserId: number;
  email: string;
  role: OrganizationRole;
  expiresInDays?: number;
  origin?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = normalizeEmail(input.email);
  const [targetUser] = await db.select({ id: users.id }).from(users).where(sql`LOWER(${users.email}) = ${email}`).limit(1);
  if (targetUser) {
    const existingMember = await getOrganizationMember(input.organizationId, targetUser.id);
    if (existingMember) throw new Error("User is already an active organization member");
  }

  const [existingInvitation] = await db.select().from(organizationInvitations).where(and(
    eq(organizationInvitations.organizationId, input.organizationId),
    eq(organizationInvitations.email, email),
    eq(organizationInvitations.status, "pending"),
  )).orderBy(desc(organizationInvitations.createdAt)).limit(1);
  if (existingInvitation) {
    if (existingInvitation.expiresAt > new Date()) throw new Error("A pending invitation already exists for this email");
    await db.update(organizationInvitations).set({ status: "expired", updatedAt: new Date() }).where(eq(organizationInvitations.id, existingInvitation.id));
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000);
  const [invitation] = await db.insert(organizationInvitations).values({
    organizationId: input.organizationId,
    inviterUserId: input.inviterUserId,
    email,
    role: input.role,
    tokenHash: hashInvitationToken(token),
    status: "pending",
    expiresAt,
  }).returning();
  const organization = await getOrganizationById(input.organizationId);
  const origin = input.origin && /^https:\/\//i.test(input.origin) ? input.origin.replace(/\/$/, "") : "https://zylobridge.com";
  try {
    await sendOrganizationInvitationEmail(email, organization?.name ?? "ZYLOBRIDGE organization", input.role, `${origin}/enterprise/invitations/accept?token=${token}`);
  } catch (error) {
    await db.update(organizationInvitations).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(eq(organizationInvitations.id, invitation.id));
    throw error;
  }
  return { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt, status: invitation.status };
}

async function getPendingInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const [invitation] = await db.select().from(organizationInvitations).where(and(
    eq(organizationInvitations.tokenHash, hashInvitationToken(token)),
    eq(organizationInvitations.status, "pending"),
  )).limit(1);
  if (!invitation) return undefined;
  if (invitation.expiresAt <= new Date()) {
    await db.update(organizationInvitations).set({ status: "expired", updatedAt: new Date() }).where(eq(organizationInvitations.id, invitation.id));
    return undefined;
  }
  return invitation;
}

export async function acceptOrganizationInvitation(token: string, userId: number, userEmail: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const invitation = await getPendingInvitationByToken(token);
  if (!invitation) throw new Error("Invitation is invalid or expired");
  if (normalizeEmail(userEmail) !== normalizeEmail(invitation.email)) throw new Error("Invitation email does not match the signed-in account");

  const existing = await db.select().from(organizationMembers).where(and(
    eq(organizationMembers.organizationId, invitation.organizationId),
    eq(organizationMembers.userId, userId),
  )).limit(1);
  if (existing[0]?.status === "active") throw new Error("You are already an organization member");

  if (existing[0]) {
    await db.update(organizationMembers).set({ role: invitation.role, status: "active", updatedAt: new Date() }).where(eq(organizationMembers.id, existing[0].id));
  } else {
    await db.insert(organizationMembers).values({ organizationId: invitation.organizationId, userId, role: invitation.role, status: "active" });
  }
  await db.update(organizationInvitations).set({ status: "accepted", acceptedByUserId: userId, acceptedAt: new Date(), updatedAt: new Date() }).where(eq(organizationInvitations.id, invitation.id));
  return { organizationId: invitation.organizationId, role: invitation.role };
}

export async function rejectOrganizationInvitation(token: string, userEmail: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const invitation = await getPendingInvitationByToken(token);
  if (!invitation) throw new Error("Invitation is invalid or expired");
  if (normalizeEmail(userEmail) !== normalizeEmail(invitation.email)) throw new Error("Invitation email does not match the signed-in account");
  await db.update(organizationInvitations).set({ status: "rejected", rejectedAt: new Date(), updatedAt: new Date() }).where(eq(organizationInvitations.id, invitation.id));
  return { success: true };
}

export async function cancelOrganizationInvitation(organizationId: number, invitationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(organizationInvitations).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(and(
    eq(organizationInvitations.id, invitationId),
    eq(organizationInvitations.organizationId, organizationId),
    eq(organizationInvitations.status, "pending"),
  ));
}

export async function createOrganizationProject(input: InsertOrganizationProject) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [project] = await db.insert(organizationProjects).values(input).returning();
  return project;
}

export async function listOrganizationProjects(organizationId: number, limit = MAX_PAGE_SIZE, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizationProjects).where(eq(organizationProjects.organizationId, organizationId)).orderBy(desc(organizationProjects.updatedAt)).limit(clampPageSize(limit, MAX_PAGE_SIZE)).offset(clampOffset(offset));
}


export async function getOrganizationProjectById(projectId: number, organizationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [project] = await db.select().from(organizationProjects).where(and(
    eq(organizationProjects.id, projectId),
    eq(organizationProjects.organizationId, organizationId),
    eq(organizationProjects.status, "active"),
  )).limit(1);
  return project;
}
