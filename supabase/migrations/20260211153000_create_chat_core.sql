-- Migration: Create chat core schema (Phase 1)
-- Date: 2026-02-11
-- Goal:
--   Introduce company-isolated chat foundations (conversations, members, messages, attachments, reads, reactions, mentions)
--   with strict RLS and integration with existing matrix permission model.

SET app.bypass_permission_check = 'on';

-- Ensure chat module exists in the permission matrix.
UPDATE public.app_modules
SET
    name = 'Chat',
    name_ar = 'الدردشة',
    icon = 'MessageSquare',
    color = '#0EA5E9',
    display_order = 10,
    is_active = true,
    data_isolation_mode = 'isolated',
    supports_sharing = true,
    module_type = 'core',
    is_department_scoped = true,
    available_actions = ARRAY [
        'view_conversations',
        'create_conversation',
        'send_message',
        'send_attachment',
        'manage_conversation',
        'manage_department_chat',
        'moderate_chat'
    ]::text[],
    updated_at = NOW()
WHERE code = 'chat';

INSERT INTO public.app_modules (
    code,
    name,
    name_ar,
    icon,
    color,
    display_order,
    is_active,
    data_isolation_mode,
    supports_sharing,
    module_type,
    is_department_scoped,
    available_actions
)
SELECT
    'chat',
    'Chat',
    'الدردشة',
    'MessageSquare',
    '#0EA5E9',
    10,
    true,
    'isolated',
    true,
    'core',
    true,
    ARRAY [
        'view_conversations',
        'create_conversation',
        'send_message',
        'send_attachment',
        'manage_conversation',
        'manage_department_chat',
        'moderate_chat'
    ]::text[]
WHERE NOT EXISTS (
    SELECT 1
    FROM public.app_modules
    WHERE code = 'chat'
);

-- Grant chat module actions to platform admins by default.
-- Use UPDATE + INSERT to tolerate environments where the unique constraint drifted.
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

CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    conversation_type text NOT NULL CHECK (conversation_type IN ('direct', 'department', 'group')),
    title text,
    department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    is_archived boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_message_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_conversations_department_type_check CHECK (
        (conversation_type = 'department' AND department_id IS NOT NULL)
        OR (conversation_type <> 'department')
    )
);

CREATE TABLE IF NOT EXISTS public.chat_conversation_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
    can_send_messages boolean NOT NULL DEFAULT true,
    is_muted boolean NOT NULL DEFAULT false,
    joined_at timestamptz NOT NULL DEFAULT NOW(),
    left_at timestamptz,
    last_read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_conversation_members_unique UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    body text,
    message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'attachment', 'mixed')),
    reply_to_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    is_edited boolean NOT NULL DEFAULT false,
    edited_at timestamptz,
    deleted_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    bucket_id text NOT NULL DEFAULT 'chat-attachments',
    storage_path text NOT NULL,
    file_name text NOT NULL,
    content_type text,
    size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    checksum text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_message_attachments_storage_unique UNIQUE (bucket_id, storage_path)
);

CREATE TABLE IF NOT EXISTS public.chat_message_reads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    read_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_message_reads_unique UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_message_reactions_unique UNIQUE (message_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS public.chat_mentions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    mentioned_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_mentions_unique UNIQUE (message_id, mentioned_user_id)
);

-- Indexes for common access patterns.
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company ON public.chat_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON public.chat_conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_department ON public.chat_conversations(department_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_members_company ON public.chat_conversation_members(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_active ON public.chat_conversation_members(user_id, left_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_conversation ON public.chat_conversation_members(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_company ON public.chat_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON public.chat_message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_conversation ON public.chat_message_attachments(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_reads_message ON public.chat_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON public.chat_message_reads(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON public.chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_message ON public.chat_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_user ON public.chat_mentions(mentioned_user_id);

-- Keep updated_at in sync.
CREATE OR REPLACE FUNCTION public.chat_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_conversations_updated_at ON public.chat_conversations;
CREATE TRIGGER trg_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.chat_set_updated_at();

DROP TRIGGER IF EXISTS trg_chat_members_updated_at ON public.chat_conversation_members;
CREATE TRIGGER trg_chat_members_updated_at
BEFORE UPDATE ON public.chat_conversation_members
FOR EACH ROW EXECUTE FUNCTION public.chat_set_updated_at();

DROP TRIGGER IF EXISTS trg_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER trg_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.chat_set_updated_at();

-- Sync conversation activity when a message is posted.
CREATE OR REPLACE FUNCTION public.chat_touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.chat_conversations
    SET
        last_message_at = COALESCE(NEW.created_at, NOW()),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_touch_conversation_on_message ON public.chat_messages;
CREATE TRIGGER trg_chat_touch_conversation_on_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.chat_touch_conversation_on_message();

-- Access helper functions for RLS.
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

CREATE OR REPLACE FUNCTION public.chat_is_conversation_manager(
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
              AND m.role IN ('owner', 'admin')
        )
      )
);
$$;

CREATE OR REPLACE FUNCTION public.chat_can_send_message(
    p_conversation_id uuid,
    p_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
    public.chat_can_access_conversation(p_conversation_id, p_user_id)
    AND public.check_matrix_permission(p_user_id, 'chat', 'send_message', NULL, NULL)
    AND EXISTS (
        SELECT 1
        FROM public.chat_conversations c
        WHERE c.id = p_conversation_id
          AND (
              c.conversation_type = 'department'
              OR EXISTS (
                  SELECT 1
                  FROM public.chat_conversation_members m
                  WHERE m.conversation_id = c.id
                    AND m.user_id = p_user_id
                    AND m.left_at IS NULL
                    AND m.can_send_messages = true
              )
          )
    );
$$;

GRANT EXECUTE ON FUNCTION public.chat_can_access_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_is_conversation_manager(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_can_send_message(uuid, uuid) TO authenticated;

-- Enable RLS.
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mentions ENABLE ROW LEVEL SECURITY;

-- Conversation policies.
DROP POLICY IF EXISTS "chat_conversations_select_policy" ON public.chat_conversations;
CREATE POLICY "chat_conversations_select_policy" ON public.chat_conversations
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_can_access_conversation(id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'chat', 'view_conversations', NULL, department_id)
);

DROP POLICY IF EXISTS "chat_conversations_insert_policy" ON public.chat_conversations;
CREATE POLICY "chat_conversations_insert_policy" ON public.chat_conversations
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND created_by = auth.uid()
    AND public.check_matrix_permission(auth.uid(), 'chat', 'create_conversation', NULL, department_id)
);

DROP POLICY IF EXISTS "chat_conversations_update_policy" ON public.chat_conversations;
CREATE POLICY "chat_conversations_update_policy" ON public.chat_conversations
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_is_conversation_manager(id, auth.uid())
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.chat_is_conversation_manager(id, auth.uid())
);

DROP POLICY IF EXISTS "chat_conversations_delete_policy" ON public.chat_conversations;
CREATE POLICY "chat_conversations_delete_policy" ON public.chat_conversations
FOR DELETE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_is_conversation_manager(id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'chat', 'moderate_chat', NULL, department_id)
);

-- Member policies.
DROP POLICY IF EXISTS "chat_members_select_policy" ON public.chat_conversation_members;
CREATE POLICY "chat_members_select_policy" ON public.chat_conversation_members
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_can_access_conversation(conversation_id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'chat', 'view_conversations', NULL, NULL)
);

DROP POLICY IF EXISTS "chat_members_insert_policy" ON public.chat_conversation_members;
CREATE POLICY "chat_members_insert_policy" ON public.chat_conversation_members
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
        public.chat_is_conversation_manager(conversation_id, auth.uid())
        OR (
            auth.uid() = user_id
            AND public.chat_can_access_conversation(conversation_id, auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "chat_members_update_policy" ON public.chat_conversation_members;
CREATE POLICY "chat_members_update_policy" ON public.chat_conversation_members
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND (
        auth.uid() = user_id
        OR public.chat_is_conversation_manager(conversation_id, auth.uid())
    )
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
        auth.uid() = user_id
        OR public.chat_is_conversation_manager(conversation_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "chat_members_delete_policy" ON public.chat_conversation_members;
CREATE POLICY "chat_members_delete_policy" ON public.chat_conversation_members
FOR DELETE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND (
        auth.uid() = user_id
        OR public.chat_is_conversation_manager(conversation_id, auth.uid())
    )
);

-- Message policies.
DROP POLICY IF EXISTS "chat_messages_select_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_select_policy" ON public.chat_messages
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_can_access_conversation(conversation_id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'chat', 'view_conversations', NULL, NULL)
);

DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_policy" ON public.chat_messages
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND sender_id = auth.uid()
    AND public.chat_can_send_message(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "chat_messages_update_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_update_policy" ON public.chat_messages
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND (
        sender_id = auth.uid()
        OR public.chat_is_conversation_manager(conversation_id, auth.uid())
    )
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
        sender_id = auth.uid()
        OR public.chat_is_conversation_manager(conversation_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "chat_messages_delete_policy" ON public.chat_messages;
CREATE POLICY "chat_messages_delete_policy" ON public.chat_messages
FOR DELETE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND (
        sender_id = auth.uid()
        OR public.chat_is_conversation_manager(conversation_id, auth.uid())
    )
);

-- Attachment policies.
DROP POLICY IF EXISTS "chat_attachments_select_policy" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_select_policy" ON public.chat_message_attachments
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_can_access_conversation(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "chat_attachments_insert_policy" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_insert_policy" ON public.chat_message_attachments
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND uploaded_by = auth.uid()
    AND public.chat_can_send_message(conversation_id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'chat', 'send_attachment', NULL, NULL)
);

DROP POLICY IF EXISTS "chat_attachments_delete_policy" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_delete_policy" ON public.chat_message_attachments
FOR DELETE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND (
        uploaded_by = auth.uid()
        OR public.chat_is_conversation_manager(conversation_id, auth.uid())
    )
);

-- Read receipt policies.
DROP POLICY IF EXISTS "chat_reads_select_policy" ON public.chat_message_reads;
CREATE POLICY "chat_reads_select_policy" ON public.chat_message_reads
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_can_access_conversation(
        (SELECT m.conversation_id FROM public.chat_messages m WHERE m.id = message_id),
        auth.uid()
    )
);

DROP POLICY IF EXISTS "chat_reads_insert_policy" ON public.chat_message_reads;
CREATE POLICY "chat_reads_insert_policy" ON public.chat_message_reads
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
    AND public.chat_can_access_conversation(
        (SELECT m.conversation_id FROM public.chat_messages m WHERE m.id = message_id),
        auth.uid()
    )
);

DROP POLICY IF EXISTS "chat_reads_update_policy" ON public.chat_message_reads;
CREATE POLICY "chat_reads_update_policy" ON public.chat_message_reads
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
);

-- Reaction policies.
DROP POLICY IF EXISTS "chat_reactions_select_policy" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_select_policy" ON public.chat_message_reactions
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_can_access_conversation(
        (SELECT m.conversation_id FROM public.chat_messages m WHERE m.id = message_id),
        auth.uid()
    )
);

DROP POLICY IF EXISTS "chat_reactions_insert_policy" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_insert_policy" ON public.chat_message_reactions
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
    AND public.chat_can_access_conversation(
        (SELECT m.conversation_id FROM public.chat_messages m WHERE m.id = message_id),
        auth.uid()
    )
);

DROP POLICY IF EXISTS "chat_reactions_delete_policy" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_delete_policy" ON public.chat_message_reactions
FOR DELETE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND user_id = auth.uid()
);

-- Mention policies.
DROP POLICY IF EXISTS "chat_mentions_select_policy" ON public.chat_mentions;
CREATE POLICY "chat_mentions_select_policy" ON public.chat_mentions
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.chat_can_access_conversation(
        (SELECT m.conversation_id FROM public.chat_messages m WHERE m.id = message_id),
        auth.uid()
    )
);

DROP POLICY IF EXISTS "chat_mentions_insert_policy" ON public.chat_mentions;
CREATE POLICY "chat_mentions_insert_policy" ON public.chat_mentions
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.chat_can_send_message(
        (SELECT m.conversation_id FROM public.chat_messages m WHERE m.id = message_id),
        auth.uid()
    )
);

-- Realtime publication (safe idempotent).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        RAISE NOTICE 'Publication supabase_realtime does not exist; skipping chat realtime publication binding.';
        RETURN;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mentions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

SET app.bypass_permission_check = 'off';
