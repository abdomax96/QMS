/**
 * useNcrComments Hook
 * إدارة تعليقات NCR مع Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import type { Comment, CreateCommentInput } from '../../domain/comments/types';

const COMMENTS_TABLE = 'ncr_comments';
const MODERN_SELECT = 'id, content, author_id, author_name, author_avatar, entity_id, entity_type, ncr_id, parent_id, edited, edited_at, created_at, reactions, attachments';
const LEGACY_SELECT = 'id, content, author_id, author_name, ncr_id, parent_id, created_at, updated_at';

const isMissingColumnError = (err: any): boolean => {
    const code = err?.code || '';
    const message = (err?.message || '').toLowerCase();
    const details = (err?.details || '').toLowerCase();
    return code === '42703'
        || code === 'PGRST204'
        || message.includes('column')
        || details.includes('column');
};

const isTypeMismatchError = (err: any): boolean => {
    const code = err?.code || '';
    const message = (err?.message || '').toLowerCase();
    return code === '42883'
        || message.includes('operator does not exist')
        || message.includes('uuid <> text')
        || message.includes('uuid = text');
};

// Normalize DB row -> Comment model
const mapRowToComment = (row: any): Comment => ({
    id: row.id,
    content: row.content,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar ?? null,
    entityId: row.entity_id ?? row.ncr_id,
    entityType: row.entity_type ?? 'ncr',
    parentId: row.parent_id ?? undefined,
    edited: row.edited || false,
    editedAt: row.edited_at ?? undefined,
    createdAt: row.created_at,
    reactions: row.reactions ?? [],
    attachments: row.attachments ?? []
});

export function useNcrComments(
    entityId: string,
    entityType: 'ncr' | 'report' | 'hold' = 'ncr',
    companyId?: string | null
) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadComments = useCallback(async () => {
        if (!entityId) return;

        let data: any[] | null = null;
        let fetchError: any = null;

        const modernQuery = await supabase
            .from(COMMENTS_TABLE)
            .select(MODERN_SELECT)
            .eq('entity_id', entityId)
            .eq('entity_type', entityType)
            .order('created_at', { ascending: true })
            .limit(100);

        if (!modernQuery.error) {
            data = modernQuery.data;
        } else if (isMissingColumnError(modernQuery.error)) {
            const legacyQuery = await supabase
                .from(COMMENTS_TABLE)
                .select(LEGACY_SELECT)
                .eq('ncr_id', entityId)
                .order('created_at', { ascending: true })
                .limit(100);

            data = legacyQuery.data;
            fetchError = legacyQuery.error;
        } else {
            fetchError = modernQuery.error;
        }

        if (fetchError) {
            console.error('Error loading comments:', fetchError);
            setError('حدث خطأ في تحميل التعليقات');
            setLoading(false);
            return;
        }

        const commentsList: Comment[] = (data || []).map(mapRowToComment);
        setComments(commentsList);
        setError(null);
        setLoading(false);
    }, [entityId, entityType]);

    // Load comments
    useEffect(() => {
        if (!entityId) return;
        void loadComments();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`comments-${entityId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: COMMENTS_TABLE,
                    filter: entityType === 'ncr' ? `ncr_id=eq.${entityId}` : `entity_id=eq.${entityId}`
                },
                () => {
                    // Reload comments on any change
                    void loadComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [entityId, entityType, loadComments]);

    // Add comment
    const addComment = useCallback(async (input: CreateCommentInput, authorId: string, authorName: string, authorAvatar?: string | null) => {
        const { data: authData } = await supabase.auth.getUser();
        const resolvedAuthorId = authorId || authData?.user?.id || '';
        const timestamp = new Date().toISOString();

        const modernPayload = {
            content: input.content,
            ncr_id: input.entityId,
            entity_id: input.entityId,
            entity_type: input.entityType,
            ...(companyId ? { company_id: companyId } : {}),
            parent_id: input.parentId,
            author_id: resolvedAuthorId,
            author_name: authorName,
            author_avatar: authorAvatar ?? null,
            edited: false,
            created_at: timestamp
        };

        const modernInsert = await supabase.from(COMMENTS_TABLE).insert(modernPayload);

        let insertData: any = null;
        let insertError: any = modernInsert.error;

        if (insertError && (isMissingColumnError(insertError) || isTypeMismatchError(insertError))) {
            const legacyInsert = await supabase.from(COMMENTS_TABLE).insert({
                content: input.content,
                ncr_id: input.entityId,
                ...(companyId ? { company_id: companyId } : {}),
                parent_id: input.parentId,
                author_id: resolvedAuthorId,
                author_name: authorName,
                created_at: timestamp,
                updated_at: timestamp
            });

            insertData = null;
            insertError = legacyInsert.error;
        }

        // Fallback for environments with legacy column drift.
        if (insertError && (isMissingColumnError(insertError) || isTypeMismatchError(insertError))) {
            const minimalInsert = await supabase.from(COMMENTS_TABLE).insert({
                content: input.content,
                ncr_id: input.entityId,
                entity_id: input.entityId,
                entity_type: input.entityType,
                ...(companyId ? { company_id: companyId } : {}),
                parent_id: input.parentId,
                author_id: resolvedAuthorId,
                author_name: authorName
            });

            insertData = null;
            insertError = minimalInsert.error;
        }

        if (insertError) {
            console.error('Error adding comment:', insertError);
            throw insertError;
        }

        await loadComments();
    }, [companyId, loadComments]);

    // Edit comment
    const editComment = useCallback(async (id: string, content: string) => {
        let { error: updateError } = await supabase
            .from(COMMENTS_TABLE)
            .update({
                content,
                edited: true,
                edited_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError && isMissingColumnError(updateError)) {
            const legacyUpdate = await supabase
                .from(COMMENTS_TABLE)
                .update({
                    content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
            updateError = legacyUpdate.error;
        }

        if (updateError) {
            console.error('Error editing comment:', updateError);
            throw updateError;
        }

        // Update local state immediately
        const editedAt = new Date().toISOString();
        setComments(prev => prev.map(c => c.id === id ? { ...c, content, edited: true, editedAt } : c));
    }, []);

    // Delete comment
    const deleteComment = useCallback(async (id: string) => {
        const { error: deleteError } = await supabase
            .from(COMMENTS_TABLE)
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting comment:', deleteError);
            throw deleteError;
        }

        // Remove locally so the list refreshes instantly
        setComments(prev => prev.filter(c => c.id !== id));
    }, []);

    return {
        comments,
        loading,
        error,
        addComment,
        editComment,
        deleteComment
    };
}
