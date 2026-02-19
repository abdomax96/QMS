-- Migration: Emit in-app notifications for new chat messages
-- Date: 2026-02-11
-- Goal:
--   Notify all active conversation members (except sender) when a message is posted,
--   so NotificationCenter reflects chat activity with sound + unread badges.

CREATE OR REPLACE FUNCTION public.chat_emit_message_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_name text;
    v_message_preview text;
BEGIN
    -- Skip system/internal messages.
    IF NEW.message_type = 'system' THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(TRIM(u.name), ''), u.email, 'User')
    INTO v_sender_name
    FROM public.users u
    WHERE u.id = NEW.sender_id;

    v_message_preview := NULLIF(TRIM(COALESCE(NEW.body, '')), '');
    IF v_message_preview IS NULL THEN
        v_message_preview := 'Shared an attachment';
    END IF;

    IF char_length(v_message_preview) > 120 THEN
        v_message_preview := LEFT(v_message_preview, 117) || '...';
    END IF;

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        title_ar,
        message,
        message_ar,
        category,
        entity_type,
        entity_id,
        action_url,
        sender_id,
        sender_name,
        created_at
    )
    SELECT
        m.user_id,
        'chat_message',
        format('New message from %s', COALESCE(v_sender_name, 'User')),
        format('رسالة جديدة من %s', COALESCE(v_sender_name, 'مستخدم')),
        v_message_preview,
        v_message_preview,
        'system',
        'chat_conversation',
        NEW.conversation_id,
        '/chat?conversation=' || NEW.conversation_id::text,
        NEW.sender_id,
        v_sender_name,
        NOW()
    FROM public.chat_conversation_members m
    WHERE m.conversation_id = NEW.conversation_id
      AND m.left_at IS NULL
      AND m.user_id <> NEW.sender_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_emit_message_notifications ON public.chat_messages;
CREATE TRIGGER trg_chat_emit_message_notifications
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.chat_emit_message_notifications();

