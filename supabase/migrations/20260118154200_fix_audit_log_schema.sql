-- Drop the restrictive check constraint that prevents "denied" actions
ALTER TABLE public.permission_audit_log DROP CONSTRAINT IF EXISTS permission_audit_log_action_check;
-- Add request_id column if it doesn't exist
ALTER TABLE public.permission_audit_log
ADD COLUMN IF NOT EXISTS request_id text;
-- Add other potentially missing useful columns
ALTER TABLE public.permission_audit_log
ADD COLUMN IF NOT EXISTS error_code text;
-- Re-add a more permissive check constraint if needed, or leave it open
-- For now, we will leave it open to support dynamic action types like "create_denied", "edit_denied"