-- Migration: Emit dedicated notifications for chat mentions
-- Date: 2026-02-11
-- Goal:
--   When a chat mention is created, notify the mentioned user with a higher-priority
--   signal (`chat_mention`) and a direct deep link to the conversation.

CREATE OR REPLACE FUNCTION public.chat_emit_mention_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_name text;
    v_preview text;
    v_conversation_id uuid;
BEGIN
    SELECT
        m.conversation_id,
        COALESCE(NULLIF(TRIM(m.body), ''), 'Mentioned you in a chat'),
        COALESCE(NULLIF(TRIM(u.name), ''), u.email, 'User')
    INTO v_conversation_id, v_preview, v_sender_name
    FROM public.chat_messages m
    JOIN public.users u
      ON u.id = m.sender_id
    WHERE m.id = NEW.message_id;

    IF v_conversation_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF char_length(v_preview) > 120 THEN
        v_preview := LEFT(v_preview, 117) || '...';
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
        NEW.mentioned_user_id,
        'chat_mention',
        format('%s mentioned you', COALESCE(v_sender_name, 'User')),
        format('%s قام بعمل منشن لك', COALESCE(v_sender_name, 'مستخدم')),
        v_preview,
        v_preview,
        'system',
        'chat_conversation',
        v_conversation_id,
        '/chat?conversation=' || v_conversation_id::text,
        m.sender_id,
        v_sender_name,
        NOW()
    FROM public.chat_messages m
    WHERE m.id = NEW.message_id
      AND NEW.mentioned_user_id <> m.sender_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_emit_mention_notification ON public.chat_mentions;
CREATE TRIGGER trg_chat_emit_mention_notification
AFTER INSERT ON public.chat_mentions
FOR EACH ROW
EXECUTE FUNCTION public.chat_emit_mention_notification();

