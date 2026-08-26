-- Safe additive migration to ensure SUPER_ADMIN exists in role enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'role' AND e.enumlabel = 'SUPER_ADMIN'
  ) THEN
    ALTER TYPE role ADD VALUE 'SUPER_ADMIN';
  END IF;
END $$;
