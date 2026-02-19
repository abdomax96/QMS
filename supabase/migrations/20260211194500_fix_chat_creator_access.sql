-- Migration: Allow chat creator to read conversation before members are inserted
-- Date: 2026-02-11
-- Why:
--   INSERT ... RETURNING on chat_conversations was failing RLS because
--   SELECT policy used chat_can_access_conversation(), which required membership.
--   The creator is not yet in chat_conversation_members at insert time.
-- Fix:
--   Treat conversation creator as having access.

SET app.bypass_permission_check = 'on';

CREATE OR REPLACE FUNCTION public.chat_can_access_conversation(
    p_conversation_id uuid,
    p_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    JOIN public.users u
      ON u.id = p_user_id
     AND u.is_active = true
     AND u.company_id = c.company_id
    WHERE c.id = p_conversation_id
      AND (
        public.is_admin_user(p_user_id)
        OR c.created_by = p_user_id
        OR EXISTS (
            SELECT 1
            FROM public.chat_conversation_members m
            WHERE m.conversation_id = c.id
              AND m.user_id = p_user_id
              AND m.left_at IS NULL
        )
        OR (
            c.conversation_type = 'department'
            AND c.department_id IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.user_departments ud
                WHERE ud.user_id = p_user_id
                  AND ud.department_id = c.department_id
                  AND ud.is_active = true
            )
        )
      )
);
$$;

GRANT EXECUTE ON FUNCTION public.chat_can_access_conversation(uuid, uuid) TO authenticated;

SET app.bypass_permission_check = 'off';
