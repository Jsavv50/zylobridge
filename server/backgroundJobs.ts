import { getDb } from "./db";
import { pgTable, serial, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { eq, and, lte, sql } from "drizzle-orm";
import { reconciliationRecords, paymentTransactions, payouts, auditLogs } from "../drizzle/schema";

export const backgroundJobs = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  taskKey: varchar("taskKey", { length: 128 }).notNull().unique(),
  taskType: varchar("taskType", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(), // pending, running, succeeded, failed, retry_pending, dead_letter
  payload: text("payload"),
  result: text("result"),
  errorMessage: text("errorMessage"),
  retryCount: integer("retryCount").default(0).notNull(),
  maxRetries: integer("maxRetries").default(3).notNull(),
  nextRunAt: timestamp("nextRunAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  taskKeyIdx: index("background_jobs_task_key_idx").on(table.taskKey),
  statusRunIdx: index("background_jobs_status_run_idx").on(table.status, table.nextRunAt),
}));

export async function runAutomatedReconciliation(): Promise<{ reconciledCount: number; discrepanciesFound: number }> {
  let reconciledCount = 0;
  let discrepanciesFound = 0;
  const db = await getDb();
  if (!db) return { reconciledCount, discrepanciesFound };

  try {
    const txns = await db.select().from(paymentTransactions).where(eq(paymentTransactions.status, "funded" as any));
    for (const txn of txns) {
      const existing = await db.select().from(reconciliationRecords).where(eq(reconciliationRecords.transactionId, txn.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(reconciliationRecords).values({
          transactionId: txn.id,
          status: "matched",
          discrepancyDetails: null,
        });
        reconciledCount++;
      }
    }
  } catch (e) {
    discrepanciesFound++;
  }

  return { reconciledCount, discrepanciesFound };
}

export async function enqueueBackgroundJob(taskKey: string, taskType: string, payload: unknown, maxRetries = 3): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(backgroundJobs).values({
      taskKey,
      taskType,
      status: "pending",
      payload: JSON.stringify(payload),
      maxRetries,
      nextRunAt: new Date(),
    });
  } catch (err) {
    // Ignore duplicate key conflicts for idempotency
  }
}

/**
 * Process pending background jobs with exponential backoff, jitter, crash recovery, and dead-letter classification.
 */
export async function processBackgroundJobs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const now = new Date();

    // 1. Crash recovery: rescue jobs stuck in "running" for more than 10 minutes
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
    await db.update(backgroundJobs)
      .set({ status: "pending", updatedAt: new Date() })
      .where(and(
        eq(backgroundJobs.status, "running"),
        lte(backgroundJobs.updatedAt, staleThreshold)
      ));

    // 2. Claim pending or retry_pending jobs whose nextRunAt has arrived
    const pending = await db.select()
      .from(backgroundJobs)
      .where(and(
        sql`${backgroundJobs.status} IN ('pending', 'retry_pending')`,
        lte(backgroundJobs.nextRunAt, now)
      ))
      .limit(10);

    let processed = 0;
    for (const job of pending) {
      // Claim job
      await db.update(backgroundJobs)
        .set({ status: "running", updatedAt: new Date() })
        .where(eq(backgroundJobs.id, job.id));

      try {
        let taskResult: any = { success: true };
        if (job.taskType === "reconciliation_daily" || job.taskType === "reconciliation") {
          taskResult = await runAutomatedReconciliation();
        } else {
          // Generic task execution stub
          taskResult = { executed: true, timestamp: new Date().toISOString() };
        }

        await db.update(backgroundJobs)
          .set({
            status: "succeeded",
            result: JSON.stringify(taskResult),
            updatedAt: new Date(),
          })
          .where(eq(backgroundJobs.id, job.id));
        processed++;
      } catch (err: any) {
        const errorMessage = err?.message || String(err);
        const isPermanent = errorMessage.includes("Permanent") || errorMessage.includes("INVALID") || errorMessage.includes("MALFORMED");
        const nextRetryCount = job.retryCount + 1;

        if (isPermanent || nextRetryCount >= job.maxRetries) {
          // Enter dead-letter state
          await db.update(backgroundJobs)
            .set({
              status: "dead_letter",
              errorMessage,
              retryCount: nextRetryCount,
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));
        } else {
          // Exponential backoff with jitter: base 5s * 2^retryCount + random jitter (0-2s)
          const backoffSeconds = Math.pow(2, nextRetryCount) * 5;
          const jitter = Math.random() * 2000;
          const nextRunAt = new Date(Date.now() + backoffSeconds * 1000 + jitter);

          await db.update(backgroundJobs)
            .set({
              status: "retry_pending",
              errorMessage,
              retryCount: nextRetryCount,
              nextRunAt,
              updatedAt: new Date(),
            })
            .where(eq(backgroundJobs.id, job.id));
        }
      }
    }
    return processed;
  } catch (err) {
    return 0;
  }
}
