-- Migration: Optimize chat conversation summaries and message pagination
-- Date: 2026-03-22

CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_archived_last_message
ON public.chat_conversations(company_id, is_archived, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_deleted_created
ON public.chat_messages(conversation_id, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_members_conversation_left_user
ON public.chat_conversation_members(conversation_id, left_at, user_id);

CREATE INDEX IF NOT EXISTS idx_chat_members_user_left_conversation
ON public.chat_conversation_members(user_id, left_at, conversation_id);

CREATE OR REPLACE FUNCTION public.chat_refresh_conversation_activity_on_message_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_conversation_id uuid;
BEGIN
    v_conversation_id := COALESCE(NEW.conversation_id, OLD.conversation_id);

    UPDATE public.chat_conversations AS c
    SET
        last_message_at = COALESCE(
            (
                SELECT newest.created_at
                FROM public.chat_messages AS newest
                WHERE newest.conversation_id = v_conversation_id
                  AND newest.deleted_at IS NULL
                ORDER BY newest.created_at DESC
                LIMIT 1
            ),
            c.created_at
        ),
        updated_at = NOW()
    WHERE c.id = v_conversation_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_refresh_conversation_on_message_update ON public.chat_messages;
CREATE TRIGGER trg_chat_refresh_conversation_on_message_update
AFTER UPDATE OF body, message_type, edited_at, is_edited, deleted_at ON public.chat_messages
FOR EACH ROW
WHEN (
    OLD.body IS DISTINCT FROM NEW.body
    OR OLD.message_type IS DISTINCT FROM NEW.message_type
    OR OLD.edited_at IS DISTINCT FROM NEW.edited_at
    OR OLD.is_edited IS DISTINCT FROM NEW.is_edited
    OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
)
EXECUTE FUNCTION public.chat_refresh_conversation_activity_on_message_change();

DROP TRIGGER IF EXISTS trg_chat_refresh_conversation_on_message_delete ON public.chat_messages;
CREATE TRIGGER trg_chat_refresh_conversation_on_message_delete
AFTER DELETE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.chat_refresh_conversation_activity_on_message_change();

CREATE OR REPLACE FUNCTION public.chat_list_conversation_summaries(p_user_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    conversation_type text,
    title text,
    department_id uuid,
    created_by uuid,
    last_message_at timestamptz,
    is_archived boolean,
    created_at timestamptz,
    updated_at timestamptz,
    display_title text,
    members_count integer,
    last_message_preview text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := COALESCE(auth.uid(), p_user_id);

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'chat_list_conversation_summaries requires an authenticated user or explicit user id';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.conversation_type,
        c.title,
        c.department_id,
        c.created_by,
        c.last_message_at,
        c.is_archived,
        c.created_at,
        c.updated_at,
        CASE
            WHEN c.conversation_type = 'direct' THEN COALESCE(other_user.name, other_user.email, c.title, 'Direct Message')
            WHEN c.conversation_type = 'department' THEN COALESCE(c.title, d.name_ar, d.name, 'Department Conversation')
            ELSE COALESCE(c.title, 'Conversation')
        END AS display_title,
        COALESCE(member_stats.members_count, 0) AS members_count,
        latest_message.last_message_preview
    FROM public.chat_conversations AS c
    LEFT JOIN public.departments AS d
        ON d.id = c.department_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::integer AS members_count
        FROM public.chat_conversation_members AS m
        WHERE m.conversation_id = c.id
          AND m.left_at IS NULL
    ) AS member_stats
        ON TRUE
    LEFT JOIN LATERAL (
        SELECT
            CASE
                WHEN m.message_type = 'attachment' THEN '[Attachment]'
                WHEN m.message_type = 'mixed' AND NULLIF(BTRIM(COALESCE(m.body, '')), '') IS NULL THEN '[Attachment]'
                ELSE COALESCE(NULLIF(BTRIM(COALESCE(m.body, '')), ''), '[Message]')
            END AS last_message_preview
        FROM public.chat_messages AS m
        WHERE m.conversation_id = c.id
          AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS latest_message
        ON TRUE
    LEFT JOIN LATERAL (
        SELECT
            u.name,
            u.email
        FROM public.chat_conversation_members AS m
        JOIN public.users AS u
            ON u.id = m.user_id
        WHERE m.conversation_id = c.id
          AND m.left_at IS NULL
          AND m.user_id <> v_user_id
        ORDER BY m.joined_at ASC
        LIMIT 1
    ) AS other_user
        ON c.conversation_type = 'direct'
    WHERE c.is_archived = FALSE
      AND public.chat_can_access_conversation(c.id, v_user_id)
      AND public.check_matrix_permission(v_user_id, 'chat', 'view_conversations', NULL, c.department_id)
    ORDER BY c.last_message_at DESC, c.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_list_conversation_summaries(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_list_conversation_summaries(uuid) TO service_role;
