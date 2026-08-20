import express from "express";
import { getDb } from "./db";
import { paymentEvents } from "../drizzle/schema";
import { verifyPaystackWebhookSignature, processVerifiedPayment } from "./finance";
import { eq } from "drizzle-orm";

export function registerPaystackWebhook(app: express.Express) {
  // Paystack webhook endpoint requires raw body for HMAC SHA-512 signature verification
  app.post("/api/payments/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const signature = req.headers["x-paystack-signature"] as string | undefined;
      const rawBodyBuffer = req.body as Buffer;
      const rawBodyString = rawBodyBuffer ? rawBodyBuffer.toString("utf8") : "";

      const isValid = await verifyPaystackWebhookSignature(rawBodyString, signature);
      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(rawBodyString);
      } catch (e) {
        parsedPayload = { raw: rawBodyString };
      }

      const eventType = parsedPayload.event || "unknown";
      const providerEventId = parsedPayload.data?.reference || parsedPayload.data?.id?.toString() || `ev-${Date.now()}`;

      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database unavailable" });
      }

      // Check duplicate event (idempotency)
      const existing = await db.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, providerEventId)).limit(1);
      if (existing.length > 0 && existing[0].processed) {
        return res.status(200).json({ status: "success", message: "Event already processed idempotently" });
      }

      // Persist event
      const [eventRecord] = existing.length > 0
        ? existing
        : await db.insert(paymentEvents).values({
            provider: "paystack",
            eventType,
            providerEventId,
            rawPayload: rawBodyString,
            signatureValid: isValid,
            processed: false,
          }).returning();

      if (!isValid) {
        await db.update(paymentEvents).set({ error: "Invalid HMAC signature" }).where(eq(paymentEvents.id, eventRecord.id));
        return res.status(400).json({ error: "Invalid signature" });
      }

      // Process event if charge.success
      if (eventType === "charge.success") {
        const reference = parsedPayload.data?.reference;
        if (reference) {
          try {
            await processVerifiedPayment(reference, parsedPayload.data?.id?.toString());
            await db.update(paymentEvents).set({ processed: true, error: null }).where(eq(paymentEvents.id, eventRecord.id));
          } catch (err: any) {
            await db.update(paymentEvents).set({ error: err.message }).where(eq(paymentEvents.id, eventRecord.id));
            console.error("[Webhook] Processing failed for reference:", reference, err);
          }
        }
      } else {
        // Mark non-charge events as processed
        await db.update(paymentEvents).set({ processed: true }).where(eq(paymentEvents.id, eventRecord.id));
      }

      return res.status(200).json({ status: "success" });
    } catch (err: any) {
      console.error("[Webhook] Error handling Paystack webhook:", err);
      return res.status(500).json({ error: err.message });
    }
  });
}
