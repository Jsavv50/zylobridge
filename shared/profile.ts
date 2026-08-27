export type ProfileAvailabilityStatus = "available_now" | "available_from" | "currently_working" | "not_available" | "emergency_only";
export type ProfileVisibility = "visible" | "hidden";
export type RateVisibility = "public" | "private";
export type WorkPreferenceType = "contract" | "project" | "temporary" | "full_time";
export type PaymentStructure = "hourly" | "daily" | "fixed_project" | "milestone";
export type Proficiency = "basic" | "conversational" | "fluent" | "native";

export type ProfileLanguage = { language: string; proficiency: Proficiency };

export type ProfessionalProfileMetadata = {
  headline?: string;
  additionalVocations?: string[];
  specializations?: string[];
  availabilityStatus?: ProfileAvailabilityStatus;
  availableFrom?: string;
  preferredWorkDays?: string[];
  employmentTypes?: WorkPreferenceType[];
  preferredProjectTypes?: string[];
  preferredJobSize?: "small" | "medium" | "large";
  minimumProjectValue?: number;
  paymentStructure?: PaymentStructure;
  dailyRate?: number;
  startingProjectRate?: number;
  rateVisibility?: RateVisibility;
  languages?: ProfileLanguage[];
  equipment?: string[];
  transportation?: string;
  serviceAreas?: string[];
  serviceRadiusKm?: number;
  willingToTravel?: boolean;
  visibility?: ProfileVisibility;
  allowEmployerContact?: boolean;
};

export const EMPTY_PROFILE_METADATA: ProfessionalProfileMetadata = {};

export function parseProfileMetadata(value: unknown): ProfessionalProfileMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return {
    headline: typeof source.headline === "string" ? source.headline : undefined,
    additionalVocations: stringArray(source.additionalVocations),
    specializations: stringArray(source.specializations),
    availabilityStatus: isOneOf(source.availabilityStatus, ["available_now", "available_from", "currently_working", "not_available", "emergency_only"] as const) ? source.availabilityStatus : undefined,
    availableFrom: typeof source.availableFrom === "string" ? source.availableFrom : undefined,
    preferredWorkDays: stringArray(source.preferredWorkDays),
    employmentTypes: enumArray(source.employmentTypes, ["contract", "project", "temporary", "full_time"] as const),
    preferredProjectTypes: stringArray(source.preferredProjectTypes),
    preferredJobSize: isOneOf(source.preferredJobSize, ["small", "medium", "large"] as const) ? source.preferredJobSize : undefined,
    minimumProjectValue: finiteNumber(source.minimumProjectValue),
    paymentStructure: isOneOf(source.paymentStructure, ["hourly", "daily", "fixed_project", "milestone"] as const) ? source.paymentStructure : undefined,
    dailyRate: finiteNumber(source.dailyRate),
    startingProjectRate: finiteNumber(source.startingProjectRate),
    rateVisibility: isOneOf(source.rateVisibility, ["public", "private"] as const) ? source.rateVisibility : undefined,
    languages: Array.isArray(source.languages) ? source.languages.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const language = (item as Record<string, unknown>).language;
      const proficiency = (item as Record<string, unknown>).proficiency;
      if (typeof language !== "string" || !language.trim() || !isOneOf(proficiency, ["basic", "conversational", "fluent", "native"] as const)) return [];
      return [{ language: language.trim(), proficiency }];
    }) : undefined,
    equipment: stringArray(source.equipment),
    transportation: typeof source.transportation === "string" ? source.transportation : undefined,
    serviceAreas: stringArray(source.serviceAreas),
    serviceRadiusKm: finiteNumber(source.serviceRadiusKm),
    willingToTravel: typeof source.willingToTravel === "boolean" ? source.willingToTravel : undefined,
    visibility: isOneOf(source.visibility, ["visible", "hidden"] as const) ? source.visibility : undefined,
    allowEmployerContact: typeof source.allowEmployerContact === "boolean" ? source.allowEmployerContact : undefined,
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

function enumArray<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is T => typeof item === "string" && (allowed as readonly string[]).includes(item));
  return items.length ? Array.from(new Set(items)) : undefined;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export function calculateProfileCompletion(input: {
  avatarUrl?: string | null;
  profile?: { bio?: string | null; vocation?: string | null; skills?: string | null; hourlyRate?: number | string | null; yearsExperience?: number | null; location?: string | null; isAvailable?: boolean | null; profileMetadata?: unknown } | null;
  portfolioCount: number;
  experienceCount: number;
  qualificationCount: number;
  verifiedCount: number;
}): { percentage: number; completed: string[]; remaining: string[] } {
  const metadata = parseProfileMetadata(input.profile?.profileMetadata);
  const factors: Array<[string, boolean]> = [
    ["Profile photo", Boolean(input.avatarUrl)],
    ["Professional headline", Boolean(metadata.headline)],
    ["Biography", Boolean(input.profile?.bio?.trim())],
    ["Primary vocation", Boolean(input.profile?.vocation)],
    ["Specializations", Boolean(metadata.additionalVocations?.length || metadata.specializations?.length)],
    ["Skills", Boolean(input.profile?.skills?.trim())],
    ["Experience", input.experienceCount > 0 || Number(input.profile?.yearsExperience ?? 0) > 0],
    ["Portfolio", input.portfolioCount > 0],
    ["Availability", Boolean(input.profile?.isAvailable !== null && input.profile?.isAvailable !== undefined)],
    ["Service area", Boolean(input.profile?.location || metadata.serviceAreas?.length)],
    ["Rates or preferences", Boolean(input.profile?.hourlyRate || metadata.dailyRate || metadata.startingProjectRate || metadata.employmentTypes?.length || metadata.paymentStructure)],
    ["Qualifications", input.qualificationCount > 0],
    ["Verification", input.verifiedCount > 0],
  ];
  const completed = factors.filter(([, complete]) => complete).map(([label]) => label);
  const remaining = factors.filter(([, complete]) => !complete).map(([label]) => label);
  return { percentage: Math.round((completed.length / factors.length) * 100), completed, remaining };
}

export function publicProfileMetadata(value: unknown): ProfessionalProfileMetadata {
  const metadata = parseProfileMetadata(value);
  return {
    headline: metadata.headline,
    additionalVocations: metadata.additionalVocations,
    specializations: metadata.specializations,
    availabilityStatus: metadata.availabilityStatus,
    availableFrom: metadata.availableFrom,
    preferredWorkDays: metadata.preferredWorkDays,
    employmentTypes: metadata.employmentTypes,
    preferredProjectTypes: metadata.preferredProjectTypes,
    preferredJobSize: metadata.preferredJobSize,
    paymentStructure: metadata.paymentStructure,
    dailyRate: metadata.rateVisibility === "public" ? metadata.dailyRate : undefined,
    startingProjectRate: metadata.rateVisibility === "public" ? metadata.startingProjectRate : undefined,
    rateVisibility: metadata.rateVisibility,
    languages: metadata.languages,
    equipment: metadata.equipment,
    transportation: metadata.transportation,
    serviceAreas: metadata.serviceAreas,
    serviceRadiusKm: metadata.serviceRadiusKm,
    willingToTravel: metadata.willingToTravel,
    visibility: metadata.visibility,
    allowEmployerContact: metadata.allowEmployerContact,
  };
}
