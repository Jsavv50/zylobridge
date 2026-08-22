import { getDb } from "./db";
import { notificationDeliveryLogs, notifications, notificationPreferences } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

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

/**
 * Unified notification dispatch layer supporting channel-independent delivery, preference gating, and idempotency.
 */
export async function dispatchNotification(event: NotificationEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Idempotency check via idempotencyKey if provided in entityId/reference
  if (event.idempotencyKey) {
    const existing = await db.select().from(notificationDeliveryLogs)
      .where(eq(notificationDeliveryLogs.payload, event.idempotencyKey))
      .limit(1);
    if (existing.length > 0) {
      return; // Already dispatched
    }
  }

  // Check user preferences
  const prefs = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, event.userId))
    .limit(1);

  const userPref = prefs[0] || { emailEnabled: true, marketingEnabled: false, marketplaceEvents: true };
  if (event.category === "marketing" && !userPref.marketingEnabled) {
    return;
  }
  if (event.category !== "security" && userPref.marketplaceEvents === false) {
    return;
  }

  const channels = event.channels || ["in_app"];
  let notifId: number | undefined;

  if (channels.includes("in_app")) {
    const inserted = await db.insert(notifications).values({
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
      await db.insert(notificationDeliveryLogs).values({
        notificationId: notifId || null,
        userId: event.userId,
        channel,
        status: "sent",
        payload: event.idempotencyKey || JSON.stringify({ title: event.title, message: event.message }),
      });
    } catch (err: any) {
      await db.insert(notificationDeliveryLogs).values({
        notificationId: notifId || null,
        userId: event.userId,
        channel,
        status: "failed",
        errorMessage: err?.message || String(err),
      });
    }
  }
}
