-- Migration: Backfill tasks assigned_to / assigned_to_name from assignments
-- Date: 2026-02-16
-- Why:
--   Some tasks were assigned via task_assignments without syncing tasks.assigned_to
--   and tasks.assigned_to_name, causing UI to show assignee as "غير محدد".

SET app.bypass_permission_check = 'on';

-- Ensure assignment rows have display names where possible.
UPDATE public.task_assignments ta
SET user_name = COALESCE(NULLIF(u.name, ''), u.email, ta.user_id::text)
FROM public.users u
WHERE ta.user_name IS NULL
  AND ta.user_id = u.id;

-- 1) Fill assigned_to from primary_assignee_id when missing.
UPDATE public.tasks t
SET assigned_to = t.primary_assignee_id
WHERE t.assigned_to IS NULL
  AND t.primary_assignee_id IS NOT NULL;

-- 2) Fill assigned_to from primary assignment row when still missing.
WITH primary_assignment AS (
    SELECT DISTINCT ON (ta.task_id)
        ta.task_id,
        ta.user_id,
        ta.user_name
    FROM public.task_assignments ta
    ORDER BY ta.task_id, ta.is_primary DESC, ta.assigned_at ASC
)
UPDATE public.tasks t
SET assigned_to = pa.user_id
FROM primary_assignment pa
WHERE t.id = pa.task_id
  AND t.assigned_to IS NULL;

-- 3) Fill assigned_to_name from users table.
UPDATE public.tasks t
SET assigned_to_name = COALESCE(NULLIF(u.name, ''), u.email, t.assigned_to_name)
FROM public.users u
WHERE t.assigned_to = u.id
  AND (t.assigned_to_name IS NULL OR btrim(t.assigned_to_name) = '');

-- 4) Fallback: fill assigned_to_name from primary assignment snapshot.
WITH primary_assignment AS (
    SELECT DISTINCT ON (ta.task_id)
        ta.task_id,
        ta.user_name
    FROM public.task_assignments ta
    ORDER BY ta.task_id, ta.is_primary DESC, ta.assigned_at ASC
)
UPDATE public.tasks t
SET assigned_to_name = pa.user_name
FROM primary_assignment pa
WHERE t.id = pa.task_id
  AND (t.assigned_to_name IS NULL OR btrim(t.assigned_to_name) = '')
  AND pa.user_name IS NOT NULL
  AND btrim(pa.user_name) <> '';

SET app.bypass_permission_check = 'off';
