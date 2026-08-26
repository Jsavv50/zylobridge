import { getDb } from "./db";
import { notificationDeliveryLogs, notifications, notificationPreferences } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export type NotificationEvent = {
  userId: number;
  title: string;
  message: string;
  category?: string;
  entityType?: string;
  entityId?: number;
  channels?: Array<"in_app" | "email" | "web_push" | "mobile_push">;
  idempotencyKey?: string;
};

function advisoryLockKey(key: string) {
  return key.length > 0 ? key : "notification";
}

/**
 * Persist the in-app notification first. Delivery-log writes are deliberately
 * best effort and cannot roll back the user-visible notification row. Supabase
 * Realtime observes the committed notifications INSERT through Postgres Changes.
 */
export async function dispatchNotification(event: NotificationEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const channels = event.channels || ["in_app"];
  let notificationId: number | undefined;

  await db.transaction(async (tx) => {
    if (event.idempotencyKey) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${advisoryLockKey(event.idempotencyKey)}))`);
      const existing = await tx.select({ id: notificationDeliveryLogs.id })
        .from(notificationDeliveryLogs)
        .where(eq(notificationDeliveryLogs.payload, event.idempotencyKey))
        .limit(1);
      if (existing.length > 0) return;
    }

    const prefs = await tx.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, event.userId))
      .limit(1);
    const userPref = prefs[0] || { emailEnabled: true, marketingEnabled: false, marketplaceEvents: true };
    if (event.category === "marketing" && !userPref.marketingEnabled) return;
    if (event.category !== "security" && userPref.marketplaceEvents === false) return;

    if (channels.includes("in_app")) {
      const inserted = await tx.insert(notifications).values({
        userId: event.userId,
        title: event.title,
        content: event.message,
        category: event.category || event.entityType || "system",
        referenceType: event.entityType ?? null,
        referenceId: event.entityId ? String(event.entityId) : null,
        isRead: false,
      }).returning({ id: notifications.id });
      notificationId = inserted[0]?.id;
    }
  });

  if (!notificationId && channels.includes("in_app")) return;
  for (const channel of channels) {
    try {
      await db.insert(notificationDeliveryLogs).values({
        notificationId: notificationId || null,
        userId: event.userId,
        channel,
        status: "sent",
        payload: event.idempotencyKey || JSON.stringify({ title: event.title, message: event.message }),
      });
    } catch (error) {
      console.warn("[Notifications] Delivery log write skipped after notification persistence", error instanceof Error ? error.message : "unknown error");
    }
  }
}
