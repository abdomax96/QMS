-- Migration: Grant baseline chat permissions to active roles
-- Date: 2026-02-14
-- Why:
--   Chat creation can fail with RLS if role_module_permissions has no chat actions.
--   This migration ensures baseline chat actions exist for active roles.

SET app.bypass_permission_check = 'on';

-- Ensure admins have full chat permissions.
UPDATE public.role_module_permissions rmp
SET
    granted_actions = am.available_actions,
    can_see_all_departments = true
FROM public.roles r
JOIN public.app_modules am ON am.code = 'chat'
WHERE rmp.role_id = r.id
  AND rmp.module_code = 'chat'
  AND r.code IN ('super_admin', 'admin');

INSERT INTO public.role_module_permissions (
    role_id,
    module_code,
    granted_actions,
    can_see_all_departments
)
SELECT
    r.id,
    'chat',
    am.available_actions,
    true
FROM public.roles r
JOIN public.app_modules am ON am.code = 'chat'
WHERE r.code IN ('super_admin', 'admin')
  AND NOT EXISTS (
      SELECT 1
      FROM public.role_module_permissions x
      WHERE x.role_id = r.id
        AND x.module_code = 'chat'
  );

-- Baseline chat permissions for other active roles.
WITH chat_actions AS (
    SELECT ARRAY[
        'view_conversations',
        'create_conversation',
        'send_message',
        'send_attachment'
    ]::text[] AS actions
)
UPDATE public.role_module_permissions rmp
SET granted_actions = (
    SELECT ARRAY(
        SELECT DISTINCT unnest(rmp.granted_actions || chat_actions.actions)
    )
)
FROM public.roles r, chat_actions
WHERE rmp.role_id = r.id
  AND rmp.module_code = 'chat'
  AND r.is_active = true
  AND r.code NOT IN ('super_admin', 'admin');

WITH chat_actions AS (
    SELECT ARRAY[
        'view_conversations',
        'create_conversation',
        'send_message',
        'send_attachment'
    ]::text[] AS actions
)
INSERT INTO public.role_module_permissions (
    role_id,
    module_code,
    granted_actions,
    can_see_all_departments
)
SELECT
    r.id,
    'chat',
    chat_actions.actions,
    false
FROM public.roles r, chat_actions
WHERE r.is_active = true
  AND r.code NOT IN ('super_admin', 'admin')
  AND NOT EXISTS (
      SELECT 1
      FROM public.role_module_permissions x
      WHERE x.role_id = r.id
        AND x.module_code = 'chat'
  );

SET app.bypass_permission_check = 'off';
