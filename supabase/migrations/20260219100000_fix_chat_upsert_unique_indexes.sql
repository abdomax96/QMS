-- Migration: Fix chat upsert unique indexes on drifted environments
-- Date: 2026-02-19
-- Why:
--   Some environments had chat tables created before final UNIQUE constraints,
--   which breaks REST upsert with on_conflict (42P10).

SET app.bypass_permission_check = 'on';

-- 1) chat_message_reads => upsert uses on_conflict(message_id,user_id)
WITH dedup AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY message_id, user_id
            ORDER BY read_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.chat_message_reads
)
DELETE FROM public.chat_message_reads r
USING dedup d
WHERE r.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_message_reads_message_user_unique
ON public.chat_message_reads (message_id, user_id);

-- 2) chat_mentions => upsert uses on_conflict(message_id,mentioned_user_id)
WITH dedup AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY message_id, mentioned_user_id
            ORDER BY created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.chat_mentions
)
DELETE FROM public.chat_mentions m
USING dedup d
WHERE m.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_mentions_message_mentioned_user_unique
ON public.chat_mentions (message_id, mentioned_user_id);

-- 3) chat_message_reactions => safety for potential future upserts
WITH dedup AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY message_id, user_id, reaction
            ORDER BY created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM public.chat_message_reactions
)
DELETE FROM public.chat_message_reactions r
USING dedup d
WHERE r.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_message_reactions_message_user_reaction_unique
ON public.chat_message_reactions (message_id, user_id, reaction);

SET app.bypass_permission_check = 'off';
