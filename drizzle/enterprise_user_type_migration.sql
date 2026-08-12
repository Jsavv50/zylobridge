-- Add Enterprise as a first-class actor type without changing existing users.
-- This is idempotent and preserves current client, professional, and unset values.
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'enterprise';
