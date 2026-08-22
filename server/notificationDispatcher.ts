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
  // Keep the signed 32-bit range accepted by PostgreSQL hashtext/pg_advisory_xact_lock.
  return key.length > 0 ? key : "notification";
}

/**
 * Unified notification dispatch layer. In-app notifications are persisted first;
 * Supabase Realtime observes the committed row through the existing Postgres
 * Changes transport. The transaction lock makes retry handling safe when the
 * same trusted event is delivered concurrently.
 */
export async function dispatchNotification(event: NotificationEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;

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

    const channels = event.channels || ["in_app"];
    let notifId: number | undefined;
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
      notifId = inserted[0]?.id;
    }

    for (const channel of channels) {
      try {
        await tx.insert(notificationDeliveryLogs).values({
          notificationId: notifId || null,
          userId: event.userId,
          channel,
          status: "sent",
          payload: event.idempotencyKey || JSON.stringify({ title: event.title, message: event.message }),
        });
      } catch (err: any) {
        await tx.insert(notificationDeliveryLogs).values({
          notificationId: notifId || null,
          userId: event.userId,
          channel,
          status: "failed",
          errorMessage: err?.message || String(err),
        });
      }
    }
  });
}
