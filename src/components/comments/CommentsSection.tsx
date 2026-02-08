/**
 * Comments Section Component
 * Real-time comments with replies
 */

import React, { useMemo, useState } from 'react';
import {
    PaperAirplaneIcon,
    PencilIcon,
    TrashIcon,
    ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';
import type { Comment, CreateCommentInput } from '../../domain/comments/types';
import { getCommentTimeAgo, getUserInitials } from '../../domain/comments/types';

interface CommentsSectionProps {
    comments: Comment[];
    entityId: string;
    entityType: 'ncr' | 'report' | 'hold';
    currentUserId: string;
    currentUserName: string;
    currentUserAvatar?: string | null;
    onAddComment: (input: CreateCommentInput) => Promise<void>;
    onEditComment?: (id: string, content: string) => Promise<void>;
    onDeleteComment?: (id: string) => Promise<void>;
    disabled?: boolean;
}

// Single Comment Component
const CommentItem: React.FC<{
    comment: Comment;
    currentUserId: string;
    onEdit?: (id: string, content: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onReply?: (parentId: string) => void;
    depth?: number;
}> = ({ comment, currentUserId, onEdit, onDelete, onReply, depth = 0 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOwner = comment.authorId === currentUserId;
    const initials = getUserInitials(comment.authorName);
    const indent = depth > 0 ? 'ml-8 mt-3' : '';

    const handleEdit = async () => {
        if (!editContent.trim() || !onEdit) return;
        setIsSubmitting(true);
        try {
            await onEdit(comment.id, editContent);
            setIsEditing(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete || !confirm('هل أنت متأكد من حذف التعليق؟')) return;
        await onDelete(comment.id);
    };

    return (
        <div className={`flex gap-3 ${indent}`}>
            {/* Avatar */}
            <div className="flex-shrink-0">
                {comment.authorAvatar ? (
                    <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                        {initials}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div
                    className={`rounded-lg p-3 border 
                        ${isOwner
                            ? 'bg-primary-50 border-primary-100 text-primary-900'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {comment.authorName}
                            </span>
                            <span className="text-xs text-gray-400">
                                {getCommentTimeAgo(comment.createdAt)}
                            </span>
                            {comment.edited && (
                                <span className="text-xs text-gray-400">(تم التعديل)</span>
                            )}
                        </div>

                        {/* Actions */}
                        {isOwner && (
                            <div className="flex items-center gap-1">
                                {onEdit && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={handleDelete}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm resize-none"
                                rows={2}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(comment.content);
                                    }}
                                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleEdit}
                                    disabled={isSubmitting}
                                    className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                                >
                                    حفظ
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                            {comment.content}
                        </p>
                    )}
                </div>

                {/* Reply button */}
                {onReply && (
                    <button
                        onClick={() => onReply(comment.id)}
                        className="mt-1 text-xs text-gray-500 hover:text-primary-500 flex items-center gap-1"
                    >
                        <ChatBubbleLeftIcon className="w-3 h-3" />
                        رد
                    </button>
                )}
            </div>
        </div>
    );
};

// Main Comments Section
export const CommentsSection: React.FC<CommentsSectionProps> = ({
    comments,
    entityId,
    entityType,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    onAddComment,
    onEditComment,
    onDeleteComment,
    disabled = false
}) => {
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onAddComment({
                content: newComment,
                entityId,
                entityType,
                ...(replyTo && { parentId: replyTo })  // Only include if replyTo exists
            });
            setNewComment('');
            setReplyTo(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Organize comments into a tree for unlimited nesting
    const grouped = useMemo(() => {
        const map = new Map<string | null, Comment[]>();
        comments.forEach((c) => {
            const key = c.parentId ?? null;
            const arr = map.get(key) ?? [];
            arr.push(c);
            map.set(key, arr);
        });
        // Sort each level by createdAt ascending (أقدم ↑ أحدث ↓)
        map.forEach((arr, key) => {
            arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            map.set(key, arr);
        });
        return map;
    }, [comments]);

    const renderThread = (items: Comment[], depth: number): React.ReactNode => {
        return items.map(comment => (
            <div key={comment.id} className="mb-2">
                <CommentItem
                    comment={comment}
                    currentUserId={currentUserId}
                    onEdit={onEditComment}
                    onDelete={onDeleteComment}
                    onReply={setReplyTo}
                    depth={depth}
                />
                {/* children */}
                {grouped.get(comment.id)?.length ? (
                    <div className="mt-2 ml-6 border-l border-gray-200 dark:border-gray-700 pl-3">
                        {renderThread(grouped.get(comment.id)!, depth + 1)}
                    </div>
                ) : null}
            </div>
        ));
    };

    return (
        <div className="space-y-6">
            {/* Comments List */}
            <div className="space-y-4">
                {!(grouped.get(null)?.length) ? (
                    <div className="text-center py-8 text-gray-500">
                        <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>لا توجد تعليقات</p>
                        <p className="text-sm">كن أول من يعلق!</p>
                    </div>
                ) : (
                    renderThread(grouped.get(null)!, 0)
                )}
            </div>

            {/* Add Comment Form */}
            {!disabled && (
                <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-shrink-0">
                {currentUserAvatar ? (
                    <img
                        src={currentUserAvatar}
                        alt={currentUserName}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                        {getUserInitials(currentUserName)}
                    </div>
                )}
            </div>
                    <div className="flex-1">
                        {replyTo && (
                            <div className="mb-2 text-sm text-gray-500 flex items-center gap-2">
                                <span>الرد على تعليق</span>
                                <button
                                    type="button"
                                    onClick={() => setReplyTo(null)}
                                    className="text-red-500 hover:underline"
                                >
                                    إلغاء
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="أضف تعليقاً..."
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary-500"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || isSubmitting}
                                className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
                            >
                                <PaperAirplaneIcon className="w-5 h-5 rotate-180" />
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CommentsSection;
