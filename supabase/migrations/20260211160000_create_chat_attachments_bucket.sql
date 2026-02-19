-- Migration: Create secure chat attachments bucket
-- Date: 2026-02-11
-- Goal:
--   Create private storage bucket for chat attachments and enforce company/conversation-aware policies.

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'chat-attachments',
    'chat-attachments',
    false,
    52428800,
    ARRAY [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip'
    ]
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.chat_conversation_uuid_from_storage_path(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_conversation text;
BEGIN
    v_conversation := split_part(COALESCE(p_name, ''), '/', 4);
    IF v_conversation = '' THEN
        RETURN NULL;
    END IF;

    IF v_conversation ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN v_conversation::uuid;
    END IF;

    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "Chat attachments read policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments update policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments delete policy" ON storage.objects;

CREATE POLICY "Chat attachments read policy" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'chat-attachments'
    AND split_part(name, '/', 1) = 'company'
    AND split_part(name, '/', 2) = COALESCE(public.get_user_company_id()::text, '')
    AND split_part(name, '/', 3) = 'conversation'
    AND public.chat_can_access_conversation(
        public.chat_conversation_uuid_from_storage_path(name),
        auth.uid()
    )
);

CREATE POLICY "Chat attachments insert policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'chat-attachments'
    AND split_part(name, '/', 1) = 'company'
    AND split_part(name, '/', 2) = COALESCE(public.get_user_company_id()::text, '')
    AND split_part(name, '/', 3) = 'conversation'
    AND public.chat_can_send_message(
        public.chat_conversation_uuid_from_storage_path(name),
        auth.uid()
    )
);

CREATE POLICY "Chat attachments update policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'chat-attachments'
    AND split_part(name, '/', 1) = 'company'
    AND split_part(name, '/', 2) = COALESCE(public.get_user_company_id()::text, '')
    AND split_part(name, '/', 3) = 'conversation'
    AND public.chat_can_send_message(
        public.chat_conversation_uuid_from_storage_path(name),
        auth.uid()
    )
)
WITH CHECK (
    bucket_id = 'chat-attachments'
    AND split_part(name, '/', 1) = 'company'
    AND split_part(name, '/', 2) = COALESCE(public.get_user_company_id()::text, '')
    AND split_part(name, '/', 3) = 'conversation'
    AND public.chat_can_send_message(
        public.chat_conversation_uuid_from_storage_path(name),
        auth.uid()
    )
);

CREATE POLICY "Chat attachments delete policy" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'chat-attachments'
    AND split_part(name, '/', 1) = 'company'
    AND split_part(name, '/', 2) = COALESCE(public.get_user_company_id()::text, '')
    AND split_part(name, '/', 3) = 'conversation'
    AND public.chat_can_send_message(
        public.chat_conversation_uuid_from_storage_path(name),
        auth.uid()
    )
);

