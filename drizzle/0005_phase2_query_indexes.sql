-- Phase 2A: query-pattern indexes
-- Additive and non-destructive. Apply only to the Railway/Supabase PostgreSQL database.
-- Supported patterns:
--   jobs: vocation/status filtering, newest-first marketplace browsing, client jobs
--   applications: per-job status filtering and professional application history
--   profiles: user lookup and vocation/availability filtering
--   conversations/messages: participant inboxes, chronological message history, unread counts
--   verification/orders/audit logs: user/status/time and resource/time lookups

CREATE INDEX IF NOT EXISTS "jobs_vocation_status_created_at_idx"
  ON "jobs" ("vocation", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "jobs_client_created_at_idx"
  ON "jobs" ("clientId", "createdAt");

CREATE INDEX IF NOT EXISTS "applications_job_status_idx"
  ON "applications" ("jobId", "status");
CREATE INDEX IF NOT EXISTS "applications_professional_created_at_idx"
  ON "applications" ("professionalId", "createdAt");

CREATE INDEX IF NOT EXISTS "profiles_user_idx"
  ON "profiles" ("userId");
CREATE INDEX IF NOT EXISTS "profiles_vocation_available_idx"
  ON "profiles" ("vocation", "isAvailable");

CREATE INDEX IF NOT EXISTS "conversations_client_last_message_idx"
  ON "conversations" ("clientId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "conversations_professional_last_message_idx"
  ON "conversations" ("professionalId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "messages_conversation_created_at_idx"
  ON "messages" ("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "messages_conversation_read_sender_idx"
  ON "messages" ("conversationId", "isRead", "senderId");

CREATE INDEX IF NOT EXISTS "verification_requests_user_created_at_idx"
  ON "verification_requests" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "verification_requests_status_created_at_idx"
  ON "verification_requests" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "orders_user_created_at_idx"
  ON "orders" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_paystack_reference_idx"
  ON "orders" ("paystackReference");

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx"
  ON "audit_logs" ("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx"
  ON "audit_logs" ("resourceType", "resourceId", "createdAt");
