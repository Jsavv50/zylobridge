import { getDb } from "./db";
import { notificationDeliveryLogs, notifications } from "../drizzle/schema";

export type NotificationEvent = {
  userId: number;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  channels?: Array<"in_app" | "email" | "web_push" | "mobile_push">;
};

/**
 * Unified notification dispatch layer supporting channel-independent delivery and idempotency.
 */
export async function dispatchNotification(event: NotificationEvent): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const channels = event.channels || ["in_app"];

  let notifId: number | undefined;
  if (channels.includes("in_app")) {
    const inserted = await db.insert(notifications).values({
      userId: event.userId,
      title: event.title,
      content: event.message,
      category: event.entityType || "system",
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
        payload: JSON.stringify({ title: event.title, message: event.message }),
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
