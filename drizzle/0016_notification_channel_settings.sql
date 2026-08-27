ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS "channelSettings" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS notification_preferences_channel_settings_idx
  ON notification_preferences USING gin ("channelSettings");
