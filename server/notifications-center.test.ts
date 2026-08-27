import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "client/src/pages/Notifications.tsx"), "utf8");
const settings = readFileSync(resolve(process.cwd(), "client/src/pages/NotificationSettings.tsx"), "utf8");
const shell = readFileSync(resolve(process.cwd(), "client/src/components/shell/ZyloShell.tsx"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const service = readFileSync(resolve(process.cwd(), "server/phase4.ts"), "utf8");
const taxonomy = readFileSync(resolve(process.cwd(), "shared/notifications.ts"), "utf8");
const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");


describe("professional notifications center", () => {
  it("uses protected history, unread, search, category, pagination, and mark-all contracts", () => {
    expect(router).toContain("listNotifications");
    expect(router).toContain("markAllNotificationsRead");
    expect(router).toContain("notifications: router");
    expect(service).toContain("eq(notifications.userId, userId)");
    expect(service).toContain("markAllNotificationsRead");
    expect(service).toContain("actionRequiredCount");
    expect(page).toContain("trpc.notifications.list.useQuery");
    expect(page).toContain("trpc.notifications.markAllRead.useMutation");
    expect(page).toContain("Search payments, employers, jobs, applications");
    expect(page).toContain("Load older notifications");
  });

  it("keeps notification taxonomy and destinations centralized and actionable", () => {
    for (const category of ["application", "job", "message", "payment", "verification", "profile", "review", "scheduling", "system"]) {
      expect(taxonomy).toContain(`"${category}"`);
    }
    expect(taxonomy).toContain("notificationDestination");
    expect(page).toContain("notificationDestination(item.referenceType, item.referenceId)");
    expect(page).toContain("Take action");
  });

  it("keeps user ownership in server queries and realtime subscriptions", () => {
    expect(service).toContain("eq(notifications.userId, userId)");
    expect(service).toContain("and(eq(notifications.id, id), eq(notifications.userId, userId))");
    expect(page).toContain("private-notifications-${user.id}");
    expect(page).toContain("filter: `userId=eq.${user.id}`");
    expect(page).toContain("removeChannel(channel)");
  });

  it("persists category-level delivery settings and quiet hours without a second preferences system", () => {
    expect(schema).toContain("channelSettings: jsonb");
    expect(settings).toContain("Delivery matrix");
    expect(settings).toContain("Quiet hours");
    expect(settings).toContain("updatePreferences.mutate({ channelSettings: next })");
    expect(settings).toContain("immediately");
  });

  it("synchronizes the global bell and professional sidebar badge", () => {
    expect(shell).toContain("trpc.notifications.listUnread.useQuery");
    expect(readFileSync(resolve(process.cwd(), "client/src/components/Navbar.tsx"), "utf8")).toContain("notificationUnreadCount");
    expect(shell).toContain("notificationUnreadCount");
    expect(shell).toContain("View all");
    expect(shell).toContain("item.href === \"/notifications\"");
    expect(shell).toContain("aria-label={notificationUnreadCount");
  });

  it("provides truthful empty/error/loading states and avoids fabricated marketplace content", () => {
    expect(page).toContain("You’re all caught up");
    expect(page).toContain("We couldn’t load your notifications.");
    expect(page).toContain("Array.from({ length: 4 })");
    expect(page).not.toContain("Sherry Witt");
    expect(page).not.toContain("R2,500");
    expect(page).not.toContain("Mason needed");
  });
});
