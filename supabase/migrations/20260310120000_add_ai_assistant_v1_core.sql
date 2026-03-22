-- Migration: Add AI Assistant V1 core (module, tables, RLS)
-- Date: 2026-03-10

SET app.bypass_permission_check = 'on';

-- 1) Register AI module in matrix permissions.
UPDATE public.app_modules
SET
    name = 'AI Assistant',
    name_ar = 'المساعد الذكي',
    description = 'Conversational assistant for insights and guided actions.',
    description_ar = 'مساعد محادثة للاستفسار واقتراح الإجراءات داخل النظام.',
    icon = 'Sparkles',
    color = '#0F766E',
    display_order = 11,
    is_active = true,
    data_isolation_mode = 'isolated',
    supports_sharing = false,
    module_type = 'core',
    is_department_scoped = true,
    available_actions = ARRAY[
        'view',
        'create_thread',
        'send_message',
        'view_history',
        'manage_threads',
        'execute_low_risk',
        'execute_medium_risk',
        'execute_high_risk',
        'manage_settings'
    ]::text[],
    updated_at = NOW()
WHERE code = 'ai_assistant';

INSERT INTO public.app_modules (
    code,
    name,
    name_ar,
    description,
    description_ar,
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
    'ai_assistant',
    'AI Assistant',
    'المساعد الذكي',
    'Conversational assistant for insights and guided actions.',
    'مساعد محادثة للاستفسار واقتراح الإجراءات داخل النظام.',
    'Sparkles',
    '#0F766E',
    11,
    true,
    'isolated',
    false,
    'core',
    true,
    ARRAY[
        'view',
        'create_thread',
        'send_message',
        'view_history',
        'manage_threads',
        'execute_low_risk',
        'execute_medium_risk',
        'execute_high_risk',
        'manage_settings'
    ]::text[]
WHERE NOT EXISTS (
    SELECT 1
    FROM public.app_modules
    WHERE code = 'ai_assistant'
);

-- Grant full AI access to admin roles by default.
UPDATE public.role_module_permissions rmp
SET
    granted_actions = am.available_actions,
    can_see_all_departments = true
FROM public.roles r
JOIN public.app_modules am ON am.code = 'ai_assistant'
WHERE rmp.role_id = r.id
  AND rmp.module_code = 'ai_assistant'
  AND r.code IN ('super_admin', 'admin');

INSERT INTO public.role_module_permissions (
    role_id,
    module_code,
    granted_actions,
    can_see_all_departments
)
SELECT
    r.id,
    'ai_assistant',
    am.available_actions,
    true
FROM public.roles r
JOIN public.app_modules am ON am.code = 'ai_assistant'
WHERE r.code IN ('super_admin', 'admin')
  AND NOT EXISTS (
      SELECT 1
      FROM public.role_module_permissions x
      WHERE x.role_id = r.id
        AND x.module_code = 'ai_assistant'
  );

-- 2) Core AI tables.
CREATE TABLE IF NOT EXISTS public.ai_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    title text NOT NULL DEFAULT 'محادثة جديدة',
    module_hint text,
    is_archived boolean NOT NULL DEFAULT false,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_message_at timestamptz NOT NULL DEFAULT NOW(),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content text NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_action_proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
    message_id uuid REFERENCES public.ai_messages(id) ON DELETE SET NULL,
    tool_name text NOT NULL,
    summary text NOT NULL,
    risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'executed', 'error')),
    action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    execution_result jsonb,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    executed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_action_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    proposal_id uuid NOT NULL REFERENCES public.ai_action_proposals(id) ON DELETE CASCADE,
    executed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    result_summary text,
    result_payload jsonb,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_settings (
    company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    is_enabled boolean NOT NULL DEFAULT true,
    default_model text NOT NULL DEFAULT 'gpt-4.1-mini',
    temperature numeric(3,2) NOT NULL DEFAULT 0.20,
    max_tokens integer NOT NULL DEFAULT 1200 CHECK (max_tokens BETWEEN 200 AND 6000),
    allow_low_risk_auto boolean NOT NULL DEFAULT true,
    require_confirmation_medium boolean NOT NULL DEFAULT true,
    require_confirmation_high boolean NOT NULL DEFAULT true,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_threads_company_last ON public.ai_threads(company_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_threads_owner ON public.ai_threads(created_by, is_archived);
CREATE INDEX IF NOT EXISTS idx_ai_messages_thread_created ON public.ai_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_company ON public.ai_messages(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_thread_created ON public.ai_action_proposals(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_status ON public.ai_action_proposals(status, risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_executions_proposal ON public.ai_action_executions(proposal_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_ai_threads_updated_at ON public.ai_threads;
CREATE TRIGGER trg_ai_threads_updated_at
BEFORE UPDATE ON public.ai_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_action_proposals_updated_at ON public.ai_action_proposals;
CREATE TRIGGER trg_ai_action_proposals_updated_at
BEFORE UPDATE ON public.ai_action_proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_settings_updated_at ON public.ai_settings;
CREATE TRIGGER trg_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Access helper for RLS.
CREATE OR REPLACE FUNCTION public.ai_can_access_thread(
    p_thread_id uuid,
    p_user_id uuid DEFAULT auth.uid()
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.ai_threads t
    JOIN public.users u
      ON u.id = p_user_id
     AND u.is_active = true
     AND u.company_id = t.company_id
    WHERE t.id = p_thread_id
      AND (
        t.created_by = p_user_id
        OR public.is_admin_user(p_user_id)
      )
);
$$;

GRANT EXECUTE ON FUNCTION public.ai_can_access_thread(uuid, uuid) TO authenticated;

-- 4) RLS policies.
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_threads_select_policy" ON public.ai_threads;
CREATE POLICY "ai_threads_select_policy" ON public.ai_threads
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'view', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_threads_insert_policy" ON public.ai_threads;
CREATE POLICY "ai_threads_insert_policy" ON public.ai_threads
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND created_by = auth.uid()
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'create_thread', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_threads_update_policy" ON public.ai_threads;
CREATE POLICY "ai_threads_update_policy" ON public.ai_threads
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'manage_threads', NULL, NULL)
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'manage_threads', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_messages_select_policy" ON public.ai_messages;
CREATE POLICY "ai_messages_select_policy" ON public.ai_messages
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(thread_id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'view', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_messages_insert_policy" ON public.ai_messages;
CREATE POLICY "ai_messages_insert_policy" ON public.ai_messages
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(thread_id, auth.uid())
    AND created_by = auth.uid()
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'send_message', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_action_proposals_select_policy" ON public.ai_action_proposals;
CREATE POLICY "ai_action_proposals_select_policy" ON public.ai_action_proposals
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(thread_id, auth.uid())
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'view_history', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_action_proposals_insert_policy" ON public.ai_action_proposals;
CREATE POLICY "ai_action_proposals_insert_policy" ON public.ai_action_proposals
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(thread_id, auth.uid())
    AND created_by = auth.uid()
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'send_message', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_action_proposals_update_policy" ON public.ai_action_proposals;
CREATE POLICY "ai_action_proposals_update_policy" ON public.ai_action_proposals
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(thread_id, auth.uid())
    AND (
        public.check_matrix_permission(auth.uid(), 'ai_assistant', 'execute_low_risk', NULL, NULL)
        OR public.check_matrix_permission(auth.uid(), 'ai_assistant', 'execute_medium_risk', NULL, NULL)
        OR public.check_matrix_permission(auth.uid(), 'ai_assistant', 'execute_high_risk', NULL, NULL)
        OR public.check_matrix_permission(auth.uid(), 'ai_assistant', 'manage_threads', NULL, NULL)
    )
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.ai_can_access_thread(thread_id, auth.uid())
);

DROP POLICY IF EXISTS "ai_action_executions_select_policy" ON public.ai_action_executions;
CREATE POLICY "ai_action_executions_select_policy" ON public.ai_action_executions
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND EXISTS (
        SELECT 1
        FROM public.ai_action_proposals p
        WHERE p.id = proposal_id
          AND public.ai_can_access_thread(p.thread_id, auth.uid())
    )
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'view_history', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_action_executions_insert_policy" ON public.ai_action_executions;
CREATE POLICY "ai_action_executions_insert_policy" ON public.ai_action_executions
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
        public.check_matrix_permission(auth.uid(), 'ai_assistant', 'execute_low_risk', NULL, NULL)
        OR public.check_matrix_permission(auth.uid(), 'ai_assistant', 'execute_medium_risk', NULL, NULL)
        OR public.check_matrix_permission(auth.uid(), 'ai_assistant', 'execute_high_risk', NULL, NULL)
    )
);

DROP POLICY IF EXISTS "ai_settings_select_policy" ON public.ai_settings;
CREATE POLICY "ai_settings_select_policy" ON public.ai_settings
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'view', NULL, NULL)
);

DROP POLICY IF EXISTS "ai_settings_modify_policy" ON public.ai_settings;
CREATE POLICY "ai_settings_modify_policy" ON public.ai_settings
FOR ALL TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'manage_settings', NULL, NULL)
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.check_matrix_permission(auth.uid(), 'ai_assistant', 'manage_settings', NULL, NULL)
);

-- Seed default settings per company.
INSERT INTO public.ai_settings (company_id, updated_by)
SELECT c.id, NULL
FROM public.companies c
WHERE NOT EXISTS (
    SELECT 1
    FROM public.ai_settings s
    WHERE s.company_id = c.id
);

SET app.bypass_permission_check = 'off';
