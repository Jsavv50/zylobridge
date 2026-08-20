CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'retry_pending', 'cancelled');--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"taskKey" varchar(128) NOT NULL,
	"taskType" varchar(64) NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"payload" text,
	"result" text,
	"errorMessage" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"maxRetries" integer DEFAULT 3 NOT NULL,
	"nextRunAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "background_jobs_taskKey_unique" UNIQUE("taskKey")
);
--> statement-breakpoint
CREATE TABLE "notification_delivery_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"notificationId" integer,
	"userId" integer NOT NULL,
	"channel" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"payload" text,
	"errorMessage" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "background_jobs_task_key_idx" ON "background_jobs" USING btree ("taskKey");--> statement-breakpoint
CREATE INDEX "background_jobs_status_run_idx" ON "background_jobs" USING btree ("status","nextRunAt");--> statement-breakpoint
CREATE INDEX "notification_delivery_logs_user_idx" ON "notification_delivery_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "notification_delivery_logs_status_idx" ON "notification_delivery_logs" USING btree ("status");
