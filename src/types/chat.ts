export type ChatConversationType = 'direct' | 'department' | 'group';
export type ChatMessageType = 'text' | 'system' | 'attachment' | 'mixed';
export type ChatMemberRole = 'member' | 'admin' | 'owner';

export interface ChatUser {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
}

export interface ChatAttachment {
    id: string;
    message_id: string;
    conversation_id: string;
    bucket_id: string;
    storage_path: string;
    file_name: string;
    content_type: string | null;
    size_bytes: number;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string | null;
    message_type: ChatMessageType;
    created_at: string;
    edited_at: string | null;
    is_edited: boolean;
    deleted_at: string | null;
    sender: ChatUser | null;
    attachments: ChatAttachment[];
}

export interface ChatConversationSummary {
    id: string;
    conversation_type: ChatConversationType;
    title: string | null;
    department_id: string | null;
    created_by: string;
    last_message_at: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
    display_title: string;
    members_count: number;
    last_message_preview: string | null;
}

export interface ChatDepartment {
    id: string;
    name: string;
    name_ar: string | null;
}

export interface CreateChatConversationInput {
    currentUserId: string;
    conversationType: ChatConversationType;
    title?: string;
    departmentId?: string | null;
    memberUserIds?: string[];
}

export interface SendChatMessageInput {
    currentUserId: string;
    conversationId: string;
    body?: string;
    files?: File[];
    mentionedUserIds?: string[];
}
