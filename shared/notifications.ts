export const NOTIFICATION_CATEGORIES = [
  "application",
  "job",
  "message",
  "payment",
  "verification",
  "profile",
  "review",
  "scheduling",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationPriority = "action_required" | "important" | "info";
export type NotificationFrequency = "immediately" | "daily" | "weekly" | "never";

export type NotificationChannelSettings = {
  email?: Record<NotificationCategory, boolean>;
  push?: Record<NotificationCategory, boolean>;
  inApp?: Record<NotificationCategory, boolean>;
  frequency?: Record<NotificationCategory, NotificationFrequency>;
  quietHours?: { enabled: boolean; start: string; end: string };
};

export const notificationCategoryLabel: Record<NotificationCategory, string> = {
  application: "Applications",
  job: "Jobs",
  message: "Messages",
  payment: "Payments",
  verification: "Profile & verification",
  profile: "Profile",
  review: "Reviews",
  scheduling: "Scheduling",
  system: "System",
};

export const notificationCategoryIcon: Record<NotificationCategory, string> = {
  application: "briefcase",
  job: "search",
  message: "message",
  payment: "wallet",
  verification: "shield",
  profile: "user",
  review: "star",
  scheduling: "calendar",
  system: "bell",
};

export function normalizeNotificationCategory(value: string | null | undefined): NotificationCategory {
  const normalized = (value || "system").toLowerCase().replaceAll("_", "-");
  if (normalized === "applications") return "application";
  if (normalized === "messages") return "message";
  if (normalized === "payments" || normalized === "escrow") return "payment";
  if (normalized === "verification" || normalized === "security") return "verification";
  if (normalized === "reviews" || normalized === "reputation") return "review";
  if (normalized === "schedule" || normalized === "interview") return "scheduling";
  if ((NOTIFICATION_CATEGORIES as readonly string[]).includes(normalized)) return normalized as NotificationCategory;
  return "system";
}

export function deriveNotificationPriority(notification: { category?: string | null; title?: string | null; isRead?: boolean }): NotificationPriority {
  const text = `${notification.title || ""} ${notification.category || ""}`.toLowerCase();
  if (/required|action|verify|failed|security|payout setup|respond|accept offer/.test(text)) return "action_required";
  if (/payment|interview|shortlist|message|application|job|review/.test(text)) return "important";
  return "info";
}

export function notificationDestination(referenceType: string | null, referenceId: string | null): string {
  if (!referenceId) return "/notifications";
  if (referenceType === "job") return `/jobs/${encodeURIComponent(referenceId)}?from=${encodeURIComponent("/notifications")}`;
  if (referenceType === "message" && /^\d+$/.test(referenceId)) return `/messages/${encodeURIComponent(referenceId)}`;
  if (referenceType === "application" && /^\d+$/.test(referenceId)) return `/applications/${encodeURIComponent(referenceId)}`;
  if (referenceType === "payment" || referenceType === "escrow") return "/payments";
  if (referenceType === "verification") return "/verification";
  if (referenceType === "profile") return "/profile";
  if (referenceType === "review") return "/profile";
  if (referenceType === "interview" || referenceType === "scheduling") return "/applications";
  if (referenceType === "enterprise" || referenceType === "organization") return "/enterprise";
  return "/notifications";
}
