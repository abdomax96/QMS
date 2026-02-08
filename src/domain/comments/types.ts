/**
 * Comments Types and DTOs
 */

import { formatDateWithAppSettings } from '../../hooks/useDateFormat';

export interface Comment {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    entityId: string;
    entityType: 'ncr' | 'report' | 'hold';
    parentId?: string; // For replies
    edited: boolean;
    editedAt?: string;
    createdAt: string;
    reactions?: CommentReaction[];
    attachments?: string[]; // Attachment IDs
}

export interface CommentReaction {
    emoji: string;
    userId: string;
    userName: string;
}

export interface CreateCommentInput {
    content: string;
    entityId: string;
    entityType: 'ncr' | 'report' | 'hold';
    parentId?: string;
    attachments?: string[];
}

export interface UpdateCommentInput {
    content: string;
}

// Format time ago for comments
export function getCommentTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    if (days < 30) return `منذ ${Math.floor(days / 7)} أسبوع`;

    return formatDateWithAppSettings(date);
}

// Get user initials for avatar
export function getUserInitials(name: string): string {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
