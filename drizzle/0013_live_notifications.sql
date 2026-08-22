-- Live notifications: persist in public.notifications, then stream committed INSERTs
-- through Supabase Realtime Postgres Changes on a private per-user channel.
-- Apply to the production PostgreSQL database only after inspecting existing policies.

BEGIN;

GRANT SELECT ON TABLE public.notifications TO authenticated;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zylobridge users read own notifications" ON public.notifications;
CREATE POLICY "zylobridge users read own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    "userId" = NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '')::integer
  );

DROP POLICY IF EXISTS "zylobridge users join notification channel" ON realtime.messages;
CREATE POLICY "zylobridge users join notification channel"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = 'private-user-notifications-' || NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '')
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;

COMMIT;
