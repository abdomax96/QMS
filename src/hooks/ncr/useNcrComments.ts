/**
 * useNcrComments Hook
 * إدارة تعليقات NCR مع Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import type { Comment, CreateCommentInput } from '../../domain/comments/types';

const COMMENTS_TABLE = 'ncr_comments';

// Normalize DB row -> Comment model
const mapRowToComment = (row: any): Comment => ({
    id: row.id,
    content: row.content,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar ?? null,
    entityId: row.entity_id,
    entityType: row.entity_type,
    parentId: row.parent_id,
    edited: row.edited || false,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    reactions: row.reactions,
    attachments: row.attachments
});

export function useNcrComments(entityId: string, entityType: 'ncr' | 'report' | 'hold' = 'ncr') {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load comments
    useEffect(() => {
        if (!entityId) return;

        const loadComments = async () => {
            const { data, error: fetchError } = await supabase
                .from(COMMENTS_TABLE)
                .select('id, content, author_id, author_name, entity_id, entity_type, parent_id, edited, edited_at, created_at, reactions, attachments')
                .eq('entity_id', entityId)
                .eq('entity_type', entityType)
                .order('created_at', { ascending: true }) // الأقدم في الأعلى، الأحدث في الأسفل
                .limit(100);

            if (fetchError) {
                console.error('Error loading comments:', fetchError);
                setError('حدث خطأ في تحميل التعليقات');
                setLoading(false);
                return;
            }

            const commentsList: Comment[] = (data || []).map(mapRowToComment);

            setComments(commentsList);
            setLoading(false);
        };

        loadComments();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`comments-${entityId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: COMMENTS_TABLE,
                    filter: `entity_id=eq.${entityId}`
                },
                () => {
                    // Reload comments on any change
                    loadComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [entityId, entityType]);

    // Add comment
    const addComment = useCallback(async (input: CreateCommentInput, authorId: string, authorName: string, authorAvatar?: string | null) => {
        const { data, error: insertError } = await supabase.from(COMMENTS_TABLE).insert({
            content: input.content,
            entity_id: input.entityId,
            entity_type: input.entityType,
            parent_id: input.parentId,
            author_id: authorId,
            author_name: authorName,
            author_avatar: authorAvatar ?? null,
            edited: false,
            created_at: new Date().toISOString()
        }).select('id, content, author_id, author_name, author_avatar, entity_id, entity_type, parent_id, edited, edited_at, created_at, reactions, attachments').single();

        if (insertError) {
            console.error('Error adding comment:', insertError);
            throw insertError;
        }

        // Optimistic update so the comment appears immediately
        if (data) {
            setComments(prev => [...prev, mapRowToComment(data)]); // أضف الجديد في الأسفل
        }
    }, []);

    // Edit comment
    const editComment = useCallback(async (id: string, content: string) => {
        const { error: updateError } = await supabase
            .from(COMMENTS_TABLE)
            .update({
                content,
                edited: true,
                edited_at: new Date().toISOString()
            })
            .eq('id', id);

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
