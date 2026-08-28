export type MarketplaceUser = {
  userType?: string | null;
  role?: string | null;
} | null | undefined;

export function isHiringAccount(user: MarketplaceUser): boolean {
  return user?.userType === "client" || user?.userType === "enterprise";
}

export function isProfessionalAccount(user: MarketplaceUser): boolean {
  return user?.userType === "professional";
}

export function marketplaceBrowseDestination(user: MarketplaceUser): "/jobs" | "/talent" {
  return isHiringAccount(user) ? "/talent" : "/jobs";
}

export function marketplaceBrowseLabel(user: MarketplaceUser): "Browse Jobs" | "Find Talent" {
  return isHiringAccount(user) ? "Find Talent" : "Browse Jobs";
}
