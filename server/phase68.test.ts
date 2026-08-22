import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("Phase 68 live notifications", () => {
  it("uses one authenticated per-user Realtime channel with reconnect and cleanup", () => {
    const source = read("../client/src/hooks/useNotificationRealtime.ts");
    expect(source).toContain("private-user-notifications-");
    expect(source).toContain('config: { private: true }');
    expect(source).toContain('event: "INSERT"');
    expect(source).toContain("table: \"notifications\"");
    expect(source).toContain("filter: `userId=eq.${userId}`");
    expect(source).toContain("scheduleReconnect");
    expect(source).toContain("removeChannel");
  });

  it("keeps the activity feed persisted, paginated, and user-scoped", () => {
    const router = read("./routers.ts");
    const page = read("../client/src/pages/Notifications.tsx");
    expect(router).toContain("unreadCount: protectedProcedure");
    expect(router).toContain("eq(notifications.userId, ctx.user.id)");
    expect(router).toContain(".offset(input?.offset ?? 0)");
    expect(page).toContain("useNotificationRealtime");
    expect(page).toContain("incoming.userId !== user?.id");
    expect(page).toContain("Load more");
    expect(page).toContain("markAllAsRead");
  });

  it("prevents duplicate trusted events while persisting before realtime delivery", () => {
    const dispatcher = read("./notificationDispatcher.ts");
    const router = read("./routers.ts");
    expect(dispatcher).toContain("pg_advisory_xact_lock");
    expect(dispatcher).toContain("notificationDeliveryLogs.payload");
    expect(dispatcher).toContain("tx.insert(notifications)");
    expect(router).toContain("idempotencyKey: `message:${message.id}`");
    expect(router).toContain("idempotencyKey: `application-received:${application.id}`");
    expect(router).toContain("idempotencyKey: `job-posted:${job.id}`");
  });

  it("defines the secure PostgreSQL Realtime publication and notification RLS contract", () => {
    const migration = read("../drizzle/0013_live_notifications.sql");
    expect(migration).toContain("ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("current_setting('request.jwt.claims'");
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications");
    expect(migration).toContain("DROP POLICY IF EXISTS");
  });
});
