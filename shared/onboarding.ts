export type MarketplaceUserType = "client" | "professional" | "enterprise" | "unset";
export type OnboardingStatus = "not_started" | "in_progress" | "completed";

export type OnboardingAwareUser = {
  role?: "user" | "admin" | "SUPER_ADMIN" | string | null;
  userType?: MarketplaceUserType | string | null;
  onboardingStatus?: OnboardingStatus | string | null;
};

export type OnboardingDraft = {
  primaryRole?: Exclude<MarketplaceUserType, "unset">;
  additionalRoles?: Array<Exclude<MarketplaceUserType, "unset">>;
  identity?: { name?: string; phone?: string; location?: string; timezone?: string };
  contractor?: {
    hiringNeeds?: string[];
    typicalJobSize?: "small" | "medium" | "large";
    urgency?: "planned" | "soon" | "urgent";
    budgetRange?: string;
    teamSize?: string;
    serviceLocations?: string[];
    organizationName?: string;
  };
  professional?: {
    vocation?: string;
    additionalVocations?: string[];
    skills?: string[];
    experienceLevel?: "starting_out" | "developing" | "experienced" | "expert";
    hourlyRate?: number;
    availabilityStatus?: "available_now" | "available_from" | "currently_working" | "not_available" | "emergency_only";
    serviceAreas?: string[];
    willingToTravel?: boolean;
    bio?: string;
    certifications?: string[];
  };
  enterprise?: {
    organizationName?: string;
    organizationDescription?: string;
    hiringVolume?: string;
    teamSize?: string;
    servicesNeeded?: string[];
    workLocations?: string[];
    budgetRange?: string;
  };
  trust?: {
    verificationIntent?: "now" | "later";
    emailUpdates?: boolean;
    marketplaceContact?: boolean;
    preferencesSkipped?: boolean;
  };
};

export const ONBOARDING_STEPS = [
  { id: 1, label: "Choose role" },
  { id: 2, label: "Personalize" },
  { id: 3, label: "Preferences" },
  { id: 4, label: "Ready" },
] as const;

const PUBLIC_ROUTES = [
  "/about",
  "/contact",
  "/cookie-policy",
  "/forgot-password",
  "/how-it-works",
  "/jobs",
  "/privacy-policy",
  "/reset-password",
  "/shop",
  "/sign-in",
  "/talent",
  "/terms",
] as const;

const PUBLIC_ROUTE_PREFIXES = [
  "/companies/",
  "/jobs/",
  "/professionals/",
  "/shop/department/",
  "/shop/product/",
  "/shop/products/",
] as const;

const PROTECTED_ROUTE_PREFIXES = [
  "/admin",
  "/applications",
  "/dashboard",
  "/employer",
  "/enterprise",
  "/messages",
  "/my-work",
  "/notifications",
  "/payments",
  "/profile",
  "/verification",
  "/orders",
  "/shop/account",
  "/shop/admin",
  "/shop/digital",
  "/shop/downloads",
  "/shop/orders",
  "/shop/procurement",
  "/shop/quotes",
  "/shop/requests",
  "/shop/seller",
  "/shop/transactions",
  "/shop/wishlist",
] as const;

function normalizePath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export function isAdministrativeUser(user: OnboardingAwareUser | null | undefined) {
  return user?.role === "admin" || user?.role === "SUPER_ADMIN";
}

export function isOnboardingComplete(user: OnboardingAwareUser | null | undefined) {
  if (!user || !user.userType || user.userType === "unset") return false;
  if (user.onboardingStatus === "completed") return true;
  // Backward-compatible inference while older API nodes or pre-migration rows
  // are still rolling through the split frontend/backend deployment.
  return user.onboardingStatus == null;
}

export function resolveRoleDashboard(user: OnboardingAwareUser | null | undefined) {
  if (isAdministrativeUser(user)) return "/dashboard/admin";
  if (user?.userType === "client") return "/employer";
  if (user?.userType === "professional") return "/dashboard";
  if (user?.userType === "enterprise") return "/enterprise";
  return "/profile";
}

export function resolvePostOnboardingDestination(user: OnboardingAwareUser | null | undefined) {
  return resolveRoleDashboard(user);
}

export function resolvePostAuthenticationDestination(
  user: OnboardingAwareUser | null | undefined,
  intendedPath?: string | null,
) {
  if (!user) return "/sign-in";
  if (isAdministrativeUser(user)) return resolveRoleDashboard(user);
  if (!isOnboardingComplete(user)) return "/onboarding";

  const intended = normalizePath(intendedPath);
  if (intended !== "/" && intended !== "/sign-in" && intended !== "/onboarding") {
    return intended;
  }
  return resolveRoleDashboard(user);
}

export function requiresCompletedOnboarding(pathname: string) {
  const path = normalizePath(pathname).split("?")[0] ?? "/";
  if (path === "/onboarding" || path === "/") return false;
  if (path === "/jobs/new") return true;
  if (PUBLIC_ROUTES.includes(path as (typeof PUBLIC_ROUTES)[number])) {
    return false;
  }
  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
