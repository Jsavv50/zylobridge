import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  notificationPreferences,
  organizationMembers,
  organizations,
  profiles,
  users,
  type User,
} from "../drizzle/schema";
import {
  isOnboardingComplete,
  resolvePostOnboardingDestination,
  type MarketplaceUserType,
  type OnboardingDraft,
  type OnboardingStatus,
} from "../shared/onboarding";
import { normalizeVocation } from "../shared/vocations";
import { parseProfileMetadata } from "../shared/profile";
import { getDb } from "./db";

export class OnboardingRevisionConflict extends Error {
  constructor() {
    super("Your onboarding progress changed in another session. Refresh to continue from the latest saved version.");
    this.name = "OnboardingRevisionConflict";
  }
}

function cleanText(value: string | undefined, max: number) {
  const normalized = value?.trim().slice(0, max);
  return normalized || undefined;
}

function cleanList(value: string[] | undefined, maxItems: number, itemMax = 100) {
  if (!value) return undefined;
  const result = Array.from(new Set(value.map((item) => cleanText(item, itemMax)).filter((item): item is string => Boolean(item))));
  return result.slice(0, maxItems);
}

function cleanRoles(
  roles: Array<Exclude<MarketplaceUserType, "unset">> | undefined,
  primaryRole: Exclude<MarketplaceUserType, "unset"> | undefined,
) {
  return Array.from(new Set((roles ?? []).filter((role) => role !== primaryRole))).slice(0, 2);
}

export function sanitizeOnboardingDraft(input: OnboardingDraft): OnboardingDraft {
  const primaryRole = input.primaryRole;
  return {
    primaryRole,
    additionalRoles: cleanRoles(input.additionalRoles, primaryRole),
    identity: {
      name: cleanText(input.identity?.name, 100),
      phone: cleanText(input.identity?.phone, 20),
      location: cleanText(input.identity?.location, 200),
      timezone: cleanText(input.identity?.timezone, 80),
    },
    contractor: {
      hiringNeeds: cleanList(input.contractor?.hiringNeeds, 12),
      typicalJobSize: input.contractor?.typicalJobSize,
      urgency: input.contractor?.urgency,
      budgetRange: cleanText(input.contractor?.budgetRange, 80),
      teamSize: cleanText(input.contractor?.teamSize, 80),
      serviceLocations: cleanList(input.contractor?.serviceLocations, 12, 120),
      organizationName: cleanText(input.contractor?.organizationName, 255),
    },
    professional: {
      vocation: input.professional?.vocation ? normalizeVocation(input.professional.vocation) : undefined,
      additionalVocations: cleanList(input.professional?.additionalVocations, 12),
      skills: cleanList(input.professional?.skills, 30),
      experienceLevel: input.professional?.experienceLevel,
      hourlyRate: input.professional?.hourlyRate,
      availabilityStatus: input.professional?.availabilityStatus,
      serviceAreas: cleanList(input.professional?.serviceAreas, 20, 120),
      willingToTravel: input.professional?.willingToTravel,
      bio: cleanText(input.professional?.bio, 2_000),
      certifications: cleanList(input.professional?.certifications, 20, 150),
    },
    enterprise: {
      organizationName: cleanText(input.enterprise?.organizationName, 255),
      organizationDescription: cleanText(input.enterprise?.organizationDescription, 2_000),
      hiringVolume: cleanText(input.enterprise?.hiringVolume, 80),
      teamSize: cleanText(input.enterprise?.teamSize, 80),
      servicesNeeded: cleanList(input.enterprise?.servicesNeeded, 20),
      workLocations: cleanList(input.enterprise?.workLocations, 20, 120),
      budgetRange: cleanText(input.enterprise?.budgetRange, 80),
    },
    trust: {
      verificationIntent: input.trust?.verificationIntent,
      emailUpdates: input.trust?.emailUpdates,
      marketplaceContact: input.trust?.marketplaceContact,
      preferencesSkipped: input.trust?.preferencesSkipped,
    },
  };
}

function mergeDraft(current: unknown, patch: OnboardingDraft) {
  const base = current && typeof current === "object" && !Array.isArray(current) ? current as OnboardingDraft : {};
  return sanitizeOnboardingDraft({
    ...base,
    ...patch,
    identity: { ...base.identity, ...patch.identity },
    contractor: { ...base.contractor, ...patch.contractor },
    professional: { ...base.professional, ...patch.professional },
    enterprise: { ...base.enterprise, ...patch.enterprise },
    trust: { ...base.trust, ...patch.trust },
  });
}

export function validateOnboardingDraftForCompletion(draft: OnboardingDraft) {
  if (!draft.primaryRole) return { valid: false, message: "Choose the workspace that best matches your immediate goal." } as const;
  if (!cleanText(draft.identity?.name, 100)) return { valid: false, message: "Add your name before completing setup." } as const;
  if (draft.primaryRole === "professional" && !normalizeVocation(draft.professional?.vocation ?? "")) {
    return { valid: false, message: "Choose your primary vocation before completing setup." } as const;
  }
  if (draft.primaryRole === "enterprise" && !cleanText(draft.enterprise?.organizationName, 255)) {
    return { valid: false, message: "Add your organization name before completing setup." } as const;
  }
  return { valid: true } as const;
}

export function calculateOnboardingProgress(input: { status: OnboardingStatus; currentStep: number; draft: OnboardingDraft }) {
  if (input.status === "completed") return 100;
  const milestones = [
    Boolean(input.draft.primaryRole),
    Boolean(cleanText(input.draft.identity?.name, 100)),
    Boolean(input.draft.trust?.preferencesSkipped || input.draft.trust?.verificationIntent || input.draft.trust?.emailUpdates !== undefined),
  ];
  return Math.min(95, milestones.filter(Boolean).length * 25 + Math.max(0, Math.min(3, input.currentStep - 1)) * 5);
}

function inferExistingDraft(user: User, profile: typeof profiles.$inferSelect | undefined, organization: typeof organizations.$inferSelect | undefined): OnboardingDraft {
  const metadata = parseProfileMetadata(profile?.profileMetadata);
  return sanitizeOnboardingDraft({
    primaryRole: user.userType === "unset" ? undefined : user.userType,
    additionalRoles: Array.isArray(user.additionalUserTypes) ? user.additionalUserTypes : [],
    identity: { name: user.name ?? undefined, phone: user.phone ?? undefined, location: profile?.location ?? undefined },
    professional: profile ? {
      vocation: profile.vocation,
      additionalVocations: metadata.additionalVocations,
      skills: profile.skills?.split(",").map((item) => item.trim()).filter(Boolean),
      hourlyRate: profile.hourlyRate ? Number(profile.hourlyRate) : undefined,
      availabilityStatus: metadata.availabilityStatus,
      serviceAreas: metadata.serviceAreas,
      willingToTravel: metadata.willingToTravel,
      bio: profile.bio ?? undefined,
      certifications: profile.certifications?.split(",").map((item) => item.trim()).filter(Boolean),
    } : undefined,
    enterprise: organization ? { organizationName: organization.name, organizationDescription: organization.description ?? undefined } : undefined,
  });
}

export async function getOnboardingState(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("Account not found");
  const [[profile], [organizationRow]] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select({ organization: organizations }).from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
      .limit(1),
  ]);
  const inferred = inferExistingDraft(user, profile, organizationRow?.organization);
  const draft = mergeDraft(inferred, user.onboardingData as OnboardingDraft);
  const completed = isOnboardingComplete(user);
  const status: OnboardingStatus = completed ? "completed" : user.onboardingStatus;
  const currentStep = completed ? 4 : Math.max(1, Math.min(4, user.onboardingStep || 1));
  return {
    status,
    currentStep,
    revision: user.onboardingRevision,
    completedAt: user.onboardingCompletedAt,
    additionalRoles: cleanRoles(user.additionalUserTypes, draft.primaryRole),
    draft,
    progress: calculateOnboardingProgress({ status, currentStep, draft }),
    destination: completed ? resolvePostOnboardingDestination(user) : "/onboarding",
    verification: { identityVerified: user.isVerified, available: true },
  };
}

export async function saveOnboardingProgress(input: { userId: number; currentStep: number; expectedRevision: number; patch: OnboardingDraft; profileMode?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!user) throw new Error("Account not found");
    if (user.onboardingRevision !== input.expectedRevision) throw new OnboardingRevisionConflict();
    if (user.onboardingStatus === "completed" && !input.profileMode) return getOnboardingState(input.userId);
    if (user.onboardingStatus === "completed" && input.patch.primaryRole && input.patch.primaryRole !== user.userType) {
      throw new Error("Your primary workspace cannot be changed through profile completion.");
    }
    const draft = mergeDraft(user.onboardingData, input.patch);
    const nextStep = Math.max(1, Math.min(4, input.currentStep));
    await tx.update(users).set({
      onboardingStatus: user.onboardingStatus === "completed" ? "completed" : "in_progress",
      onboardingStep: nextStep,
      onboardingRevision: user.onboardingRevision + 1,
      onboardingData: draft,
      updatedAt: new Date(),
    }).where(and(eq(users.id, input.userId), eq(users.onboardingRevision, input.expectedRevision)));
    return { revision: user.onboardingRevision + 1, currentStep: nextStep, progress: calculateOnboardingProgress({ status: "in_progress", currentStep: nextStep, draft }), draft };
  });
}

function experienceYears(level: OnboardingDraft["professional"] extends infer T ? T extends { experienceLevel?: infer E } ? E : never : never) {
  if (level === "expert") return 10;
  if (level === "experienced") return 5;
  if (level === "developing") return 2;
  return 0;
}

function organizationSlug(name: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return `${base || "organization"}-${randomBytes(4).toString("hex")}`;
}

export async function completeOnboarding(input: { userId: number; expectedRevision: number; patch: OnboardingDraft; profileMode?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
    if (!user) throw new Error("Account not found");
    if (user.onboardingStatus === "completed" && user.userType !== "unset" && !input.profileMode) {
      return { success: true as const, destination: resolvePostOnboardingDestination(user), alreadyCompleted: true as const };
    }
    if (user.onboardingStatus === "completed" && input.patch.primaryRole && input.patch.primaryRole !== user.userType) {
      throw new Error("Your primary workspace cannot be changed through profile completion.");
    }
    if (user.onboardingRevision !== input.expectedRevision) throw new OnboardingRevisionConflict();

    const draft = mergeDraft(user.onboardingData, input.patch);
    const validation = validateOnboardingDraftForCompletion(draft);
    if (!validation.valid || !draft.primaryRole) throw new Error(validation.message);
    const now = new Date();

    if (draft.primaryRole === "professional") {
      const vocation = normalizeVocation(draft.professional?.vocation ?? "");
      if (!vocation) throw new Error("Choose a valid primary vocation.");
      const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, input.userId)).limit(1);
      const existingMetadata = parseProfileMetadata(profile?.profileMetadata);
      const profileData = {
        vocation: vocation as typeof profiles.$inferInsert["vocation"],
        bio: draft.professional?.bio ?? profile?.bio ?? null,
        skills: draft.professional?.skills?.join(", ") || profile?.skills || null,
        certifications: draft.professional?.certifications?.join(", ") || profile?.certifications || null,
        hourlyRate: draft.professional?.hourlyRate !== undefined ? String(draft.professional.hourlyRate) : profile?.hourlyRate ?? null,
        location: draft.identity?.location ?? profile?.location ?? null,
        yearsExperience: draft.professional?.experienceLevel ? experienceYears(draft.professional.experienceLevel) : profile?.yearsExperience ?? null,
        isAvailable: draft.professional?.availabilityStatus ? !["not_available"].includes(draft.professional.availabilityStatus) : profile?.isAvailable ?? true,
        profileMetadata: {
          ...existingMetadata,
          additionalVocations: draft.professional?.additionalVocations,
          availabilityStatus: draft.professional?.availabilityStatus,
          serviceAreas: draft.professional?.serviceAreas,
          willingToTravel: draft.professional?.willingToTravel,
          allowEmployerContact: draft.trust?.marketplaceContact ?? existingMetadata.allowEmployerContact ?? true,
        },
        updatedAt: now,
      };
      if (profile) {
        await tx.update(profiles).set(profileData).where(eq(profiles.userId, input.userId));
      } else {
        await tx.insert(profiles).values({ userId: input.userId, ...profileData });
      }
    }

    if (draft.primaryRole === "enterprise") {
      const [membership] = await tx.select({ organizationId: organizationMembers.organizationId })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.userId, input.userId), eq(organizationMembers.status, "active")))
        .limit(1);
      if (!membership) {
        const name = draft.enterprise?.organizationName?.trim();
        if (!name) throw new Error("Organization name is required.");
        const [organization] = await tx.insert(organizations).values({
          ownerId: input.userId,
          name,
          slug: organizationSlug(name),
          description: draft.enterprise?.organizationDescription?.trim() || null,
        }).returning();
        await tx.insert(organizationMembers).values({ organizationId: organization.id, userId: input.userId, role: "OWNER", status: "active" });
      }
    }

    const additionalRoles = cleanRoles(draft.additionalRoles, draft.primaryRole);
    if (draft.trust?.emailUpdates !== undefined) {
      await tx.insert(notificationPreferences).values({
        userId: input.userId,
        emailEnabled: draft.trust.emailUpdates,
        marketplaceEvents: draft.trust.emailUpdates,
      }).onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          emailEnabled: draft.trust.emailUpdates,
          marketplaceEvents: draft.trust.emailUpdates,
          updatedAt: now,
        },
      });
    }
    await tx.update(users).set({
      name: draft.identity?.name ?? user.name,
      phone: draft.identity?.phone ?? user.phone,
      userType: draft.primaryRole,
      onboardingStatus: "completed",
      onboardingStep: 4,
      onboardingRevision: user.onboardingRevision + 1,
      additionalUserTypes: additionalRoles,
      onboardingData: draft,
      onboardingCompletedAt: user.onboardingCompletedAt ?? now,
      updatedAt: now,
    }).where(and(eq(users.id, input.userId), eq(users.onboardingRevision, input.expectedRevision)));

    return {
      success: true as const,
      destination: resolvePostOnboardingDestination({ ...user, userType: draft.primaryRole, onboardingStatus: "completed" }),
      alreadyCompleted: false as const,
      additionalRoles,
    };
  });
}
