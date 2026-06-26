import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type {
    ChatAttachment,
    ChatConversationMessageEvent,
    ChatConversationSummary,
    ChatDepartment,
    ChatMessage,
    ChatMessageBatch,
    ChatMessageQueryOptions,
    ChatUser,
    CreateChatConversationInput,
    SendChatMessageInput
} from '../types/chat';

type ChatConversationRow = {
    id: string;
    conversation_type: 'direct' | 'department' | 'group';
    title: string | null;
    department_id: string | null;
    created_by: string;
    last_message_at: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
};

type ChatConversationSummaryRow = ChatConversationRow & {
    display_title: string;
    members_count: number;
    last_message_preview: string | null;
};

type ChatMessageRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string | null;
    message_type: 'text' | 'system' | 'attachment' | 'mixed';
    created_at: string;
    edited_at: string | null;
    is_edited: boolean;
    deleted_at: string | null;
};

type ChatMemberRow = {
    conversation_id: string;
    user_id: string;
    left_at: string | null;
};

type ChatMemberUserRow = {
    user_id: string;
};

type ChatDepartmentRow = {
    id: string;
    name: string | null;
    name_ar: string | null;
    is_active: boolean;
};

type ChatAttachmentRow = {
    id: string;
    message_id: string;
    conversation_id: string;
    bucket_id: string;
    storage_path: string;
    file_name: string;
    content_type: string | null;
    size_bytes: number;
    created_at: string;
};

class ChatService {
    private companyCache = new Map<string, string>();

    private async resolveCurrentCompanyId(userId: string): Promise<string> {
        const cached = this.companyCache.get(userId);
        if (cached) return cached;

        const { data: user, error } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', userId)
            .single();

        if (error) throw error;
        const companyId = user?.company_id as string | null;
        if (!companyId) throw new Error('User company_id is missing.');

        this.companyCache.set(userId, companyId);
        return companyId;
    }

    private async assertUsersInCompany(userIds: string[], companyId: string): Promise<void> {
        const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
        if (uniqueIds.length === 0) return;

        const { data, error } = await supabase
            .from('users')
            .select('id')
            .in('id', uniqueIds)
            .eq('company_id', companyId)
            .eq('is_active', true);

        if (error) throw error;

        const validUserIds = new Set((data || []).map((row: any) => row.id as string));
        const invalidUserIds = uniqueIds.filter((userId) => !validUserIds.has(userId));

        if (invalidUserIds.length > 0) {
            throw new Error('One or more selected users are invalid for this company.');
        }
    }

    private async listCompanyActiveUserIds(userIds: string[], companyId: string): Promise<string[]> {
        const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
        if (uniqueIds.length === 0) return [];

        const { data, error } = await supabase
            .from('users')
            .select('id')
            .in('id', uniqueIds)
            .eq('company_id', companyId)
            .eq('is_active', true);

        if (error) throw error;
        return (data || []).map((row: any) => row.id as string);
    }

    private async getUsersByIds(userIds: string[]): Promise<Record<string, ChatUser>> {
        if (userIds.length === 0) return {};

        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, avatar_url')
            .in('id', userIds);

        if (error) throw error;

        const byId: Record<string, ChatUser> = {};
        (data || []).forEach((u: any) => {
            byId[u.id] = {
                id: u.id,
                name: u.name ?? null,
                email: u.email,
                avatar_url: u.avatar_url ?? null
            };
        });

        return byId;
    }

    private mapConversationSummary(row: ChatConversationSummaryRow): ChatConversationSummary {
        return {
            id: row.id,
            conversation_type: row.conversation_type,
            title: row.title ?? null,
            department_id: row.department_id ?? null,
            created_by: row.created_by,
            last_message_at: row.last_message_at,
            is_archived: Boolean(row.is_archived),
            created_at: row.created_at,
            updated_at: row.updated_at,
            display_title: row.display_title || row.title || 'Conversation',
            members_count: Number(row.members_count || 0),
            last_message_preview: row.last_message_preview ?? null
        };
    }

    private mapAttachmentRow(row: ChatAttachmentRow): ChatAttachment {
        return {
            id: row.id,
            message_id: row.message_id,
            conversation_id: row.conversation_id,
            bucket_id: row.bucket_id,
            storage_path: row.storage_path,
            file_name: row.file_name,
            content_type: row.content_type ?? null,
            size_bytes: Number(row.size_bytes || 0),
            created_at: row.created_at
        };
    }

    private async getAttachmentsByMessageIds(messageIds: string[]): Promise<Map<string, ChatAttachment[]>> {
        const attachmentsByMessage = new Map<string, ChatAttachment[]>();
        if (messageIds.length === 0) return attachmentsByMessage;

        const { data: attachments, error: attachmentsError } = await supabase
            .from('chat_message_attachments')
            .select('id, message_id, conversation_id, bucket_id, storage_path, file_name, content_type, size_bytes, created_at')
            .in('message_id', messageIds)
            .order('created_at', { ascending: true });

        if (attachmentsError) throw attachmentsError;

        ((attachments || []) as ChatAttachmentRow[]).forEach((attachmentRow) => {
            const list = attachmentsByMessage.get(attachmentRow.message_id) || [];
            list.push(this.mapAttachmentRow(attachmentRow));
            attachmentsByMessage.set(attachmentRow.message_id, list);
        });

        return attachmentsByMessage;
    }

    private async hydrateMessages(messageRows: ChatMessageRow[]): Promise<ChatMessage[]> {
        if (messageRows.length === 0) return [];

        const senderIds = Array.from(new Set(messageRows.map((message) => message.sender_id)));
        const usersById = await this.getUsersByIds(senderIds);
        const attachmentsByMessage = await this.getAttachmentsByMessageIds(messageRows.map((message) => message.id));

        return messageRows.map((messageRow) => ({
            ...messageRow,
            sender: usersById[messageRow.sender_id] || null,
            attachments: attachmentsByMessage.get(messageRow.id) || []
        }));
    }

    private async getMessageById(messageId: string): Promise<ChatMessage | null> {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('id, conversation_id, sender_id, body, message_type, created_at, edited_at, is_edited, deleted_at')
            .eq('id', messageId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        const [message] = await this.hydrateMessages([data as ChatMessageRow]);
        return message || null;
    }

    private async getAttachmentById(attachmentId: string): Promise<ChatAttachment | null> {
        const { data, error } = await supabase
            .from('chat_message_attachments')
            .select('id, message_id, conversation_id, bucket_id, storage_path, file_name, content_type, size_bytes, created_at')
            .eq('id', attachmentId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return this.mapAttachmentRow(data as ChatAttachmentRow);
    }

    private buildFileStoragePath(companyId: string, conversationId: string, fileName: string): string {
        const safe = fileName.replace(/[^\w.\-() ]+/g, '_');
        const unique = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return `company/${companyId}/conversation/${conversationId}/${unique}-${safe}`;
    }

    private extractMentionEmails(body: string): string[] {
        if (!body) return [];
        const matches = body.match(/@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g) || [];
        const normalized = matches.map((token) => token.slice(1).toLowerCase().trim());
        return Array.from(new Set(normalized));
    }

    private async resolveMentionedUserIds(
        conversationId: string,
        companyId: string,
        mentionEmails: string[]
    ): Promise<string[]> {
        if (mentionEmails.length === 0) return [];

        const { data: memberRows, error: memberError } = await supabase
            .from('chat_conversation_members')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .is('left_at', null);
        if (memberError) throw memberError;

        const memberUserIds = ((memberRows || []) as ChatMemberUserRow[]).map((row) => row.user_id);
        if (memberUserIds.length === 0) return [];

        const { data: userRows, error: usersError } = await supabase
            .from('users')
            .select('id, email, company_id, is_active')
            .in('id', memberUserIds)
            .eq('company_id', companyId)
            .eq('is_active', true);
        if (usersError) throw usersError;

        const emailSet = new Set(mentionEmails.map((value) => value.toLowerCase()));
        return (userRows || [])
            .filter((user: any) => emailSet.has(String(user.email || '').toLowerCase()))
            .map((user: any) => user.id as string);
    }

    private async resolveMentionedUserIdsFromIds(
        conversationId: string,
        companyId: string,
        mentionUserIds: string[]
    ): Promise<string[]> {
        const uniqueIds = Array.from(new Set(mentionUserIds.filter(Boolean)));
        if (uniqueIds.length === 0) return [];

        const { data: memberRows, error: memberError } = await supabase
            .from('chat_conversation_members')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .is('left_at', null)
            .in('user_id', uniqueIds);
        if (memberError) throw memberError;

        const memberUserIds = ((memberRows || []) as ChatMemberUserRow[]).map((row) => row.user_id);
        if (memberUserIds.length === 0) return [];

        const { data: userRows, error: usersError } = await supabase
            .from('users')
            .select('id, company_id, is_active')
            .in('id', memberUserIds)
            .eq('company_id', companyId)
            .eq('is_active', true);
        if (usersError) throw usersError;

        return (userRows || []).map((user: any) => user.id as string);
    }

    private async persistMentions(
        messageId: string,
        conversationId: string,
        companyId: string,
        senderId: string,
        body: string | null
    ): Promise<void> {
        const mentionEmails = this.extractMentionEmails(body || '');
        if (mentionEmails.length === 0) return;

        const userIds = await this.resolveMentionedUserIds(conversationId, companyId, mentionEmails);
        const targetIds = userIds.filter((id) => id !== senderId);
        if (targetIds.length === 0) return;

        const payload = targetIds.map((mentionedUserId) => ({
            company_id: companyId,
            message_id: messageId,
            mentioned_user_id: mentionedUserId
        }));

        const { error } = await supabase
            .from('chat_mentions')
            .upsert(payload, { onConflict: 'message_id,mentioned_user_id' });

        if (error) throw error;
    }

    private async persistMentionsByIds(
        messageId: string,
        conversationId: string,
        companyId: string,
        senderId: string,
        mentionedUserIds: string[]
    ): Promise<void> {
        const uniqueIds = Array.from(new Set(mentionedUserIds.filter(Boolean)));
        const targetIds = uniqueIds.filter((id) => id !== senderId);
        if (targetIds.length === 0) return;

        const validIds = await this.resolveMentionedUserIdsFromIds(conversationId, companyId, targetIds);
        if (validIds.length === 0) return;

        const payload = validIds.map((mentionedUserId) => ({
            company_id: companyId,
            message_id: messageId,
            mentioned_user_id: mentionedUserId
        }));

        const { error } = await supabase
            .from('chat_mentions')
            .upsert(payload, { onConflict: 'message_id,mentioned_user_id' });

        if (error) throw error;
    }

    async listActiveUsers(currentUserId: string, excludeUserId: string = currentUserId): Promise<ChatUser[]> {
        const companyId = await this.resolveCurrentCompanyId(currentUserId);

        let query = supabase
            .from('users')
            .select('id, name, email, avatar_url')
            .eq('is_active', true)
            .eq('company_id', companyId)
            .order('name', { ascending: true });

        if (excludeUserId) {
            query = query.neq('id', excludeUserId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((u: any) => ({
            id: u.id,
            name: u.name ?? null,
            email: u.email,
            avatar_url: u.avatar_url ?? null
        }));
    }

    async listDepartments(currentUserId: string): Promise<ChatDepartment[]> {
        const { data: userDepartmentRows, error: userDepartmentsError } = await supabase
            .from('user_departments')
            .select('department_id')
            .eq('user_id', currentUserId)
            .eq('is_active', true);

        if (userDepartmentsError) throw userDepartmentsError;

        const departmentIds = Array.from(
            new Set((userDepartmentRows || []).map((row: any) => row.department_id as string).filter(Boolean))
        );

        let departmentsData: ChatDepartmentRow[] | null = null;

        if (departmentIds.length > 0) {
            const { data, error } = await supabase
                .from('departments')
                .select('id, name, name_ar, is_active')
                .in('id', departmentIds)
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;
            departmentsData = (data || []) as ChatDepartmentRow[];
        } else {
            const { data, error } = await supabase
                .from('departments')
                .select('id, name, name_ar, is_active')
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            if (error) throw error;
            departmentsData = (data || []) as ChatDepartmentRow[];
        }

        return (departmentsData || []).map((department) => ({
            id: department.id,
            name: department.name || department.name_ar || 'Department',
            name_ar: department.name_ar || null
        }));
    }

    async listConversations(currentUserId: string): Promise<ChatConversationSummary[]> {
        const { data, error } = await supabase.rpc('chat_list_conversation_summaries', {
            p_user_id: currentUserId
        });

        if (error) throw error;

        return ((data || []) as ChatConversationSummaryRow[]).map((row) => this.mapConversationSummary(row));
    }

    async getMessages(
        conversationId: string,
        options: ChatMessageQueryOptions = {}
    ): Promise<ChatMessageBatch> {
        const pageSize = Math.max(1, Math.min(options.limit ?? 100, 200));

        let query = supabase
            .from('chat_messages')
            .select('id, conversation_id, sender_id, body, message_type, created_at, edited_at, is_edited, deleted_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(pageSize + 1);

        if (options.before) {
            query = query.lt('created_at', options.before);
        }

        const { data: rows, error } = await query;

        if (error) throw error;

        const messageRows = (rows || []) as ChatMessageRow[];
        const hasMore = messageRows.length > pageSize;
        const visibleRows = (hasMore ? messageRows.slice(0, pageSize) : messageRows).slice().reverse();
        const messages = await this.hydrateMessages(visibleRows);

        return {
            messages,
            hasMore,
            oldestLoadedMessageCreatedAt: messages[0]?.created_at ?? null,
            latestVisibleMessageId: messages[messages.length - 1]?.id ?? null
        };
    }

    async createConversation(input: CreateChatConversationInput): Promise<ChatConversationSummary> {
        const companyId = await this.resolveCurrentCompanyId(input.currentUserId);
        const memberIds = Array.from(new Set([input.currentUserId, ...(input.memberUserIds || [])]));
        await this.assertUsersInCompany(memberIds, companyId);

        const conversationId =
            globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        const { error: conversationError } = await supabase
            .from('chat_conversations')
            .insert({
                id: conversationId,
                company_id: companyId,
                conversation_type: input.conversationType,
                title: input.title?.trim() || null,
                department_id: input.departmentId ?? null,
                created_by: input.currentUserId
            });

        if (conversationError) throw conversationError;

        const membersPayload = memberIds.map((userId) => ({
            company_id: companyId,
            conversation_id: conversationId,
            user_id: userId,
            role: userId === input.currentUserId ? 'owner' : 'member'
        }));

        const { error: membersError } = await supabase
            .from('chat_conversation_members')
            .insert(membersPayload);

        if (membersError) throw membersError;

        const summaryList = await this.listConversations(input.currentUserId);
        const summary = summaryList.find(c => c.id === conversationId);
        if (!summary) {
            throw new Error('Conversation created but failed to load summary.');
        }

        return summary;
    }

    async createDirectConversation(currentUserId: string, targetUserId: string): Promise<ChatConversationSummary> {
        const { data: membershipRows, error: membershipError } = await supabase
            .from('chat_conversation_members')
            .select('conversation_id, user_id, left_at')
            .in('user_id', [currentUserId, targetUserId])
            .is('left_at', null);

        if (membershipError) throw membershipError;

        const byConversation = new Map<string, Set<string>>();
        (membershipRows || []).forEach((row: any) => {
            const users = byConversation.get(row.conversation_id) || new Set<string>();
            users.add(row.user_id);
            byConversation.set(row.conversation_id, users);
        });

        const candidateIds = Array.from(byConversation.entries())
            .filter(([, users]) => users.has(currentUserId) && users.has(targetUserId))
            .map(([conversationId]) => conversationId);

        if (candidateIds.length > 0) {
            const { data: directRows, error: directError } = await supabase
                .from('chat_conversations')
                .select('id')
                .in('id', candidateIds)
                .eq('conversation_type', 'direct')
                .eq('is_archived', false)
                .limit(1);

            if (directError) throw directError;

            const existingId = directRows?.[0]?.id as string | undefined;
            if (existingId) {
                const summaries = await this.listConversations(currentUserId);
                const existingSummary = summaries.find(c => c.id === existingId);
                if (existingSummary) return existingSummary;
            }
        }

        return this.createConversation({
            currentUserId,
            conversationType: 'direct',
            memberUserIds: [targetUserId]
        });
    }

    async createDepartmentConversation(
        currentUserId: string,
        departmentId: string,
        title?: string
    ): Promise<ChatConversationSummary> {
        const companyId = await this.resolveCurrentCompanyId(currentUserId);

        const { data: existingRows, error: existingError } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('company_id', companyId)
            .eq('conversation_type', 'department')
            .eq('department_id', departmentId)
            .eq('is_archived', false)
            .order('created_at', { ascending: true })
            .limit(1);

        if (existingError) throw existingError;

        const existingId = existingRows?.[0]?.id as string | undefined;
        if (existingId) {
            const summaries = await this.listConversations(currentUserId);
            const existingSummary = summaries.find((item) => item.id === existingId);
            if (existingSummary) return existingSummary;
        }

        const { data: departmentRow, error: departmentError } = await supabase
            .from('departments')
            .select('id, name, name_ar')
            .eq('id', departmentId)
            .single();

        if (departmentError) throw departmentError;

        const { data: userDepartmentRows, error: userDepartmentError } = await supabase
            .from('user_departments')
            .select('user_id')
            .eq('department_id', departmentId)
            .eq('is_active', true);

        if (userDepartmentError) throw userDepartmentError;

        const rawMemberIds = Array.from(
            new Set<string>(
                (userDepartmentRows || [])
                    .map((row: any) => String(row.user_id || ''))
                    .filter((value: string) => value.length > 0)
            )
        );
        if (!rawMemberIds.includes(currentUserId)) {
            rawMemberIds.push(currentUserId);
        }

        const validMemberIds = await this.listCompanyActiveUserIds(rawMemberIds, companyId);
        const targetMemberIds = validMemberIds.filter((userId) => userId !== currentUserId);

        const preferredDepartmentName =
            (departmentRow?.name_ar as string | null) ||
            (departmentRow?.name as string | null) ||
            'القسم';

        return this.createConversation({
            currentUserId,
            conversationType: 'department',
            departmentId,
            title: title?.trim() || `دردشة ${preferredDepartmentName}`,
            memberUserIds: targetMemberIds
        });
    }

    async createGroupConversation(
        currentUserId: string,
        title: string,
        memberUserIds: string[]
    ): Promise<ChatConversationSummary> {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
            throw new Error('Group title is required.');
        }

        return this.createConversation({
            currentUserId,
            conversationType: 'group',
            title: normalizedTitle,
            memberUserIds
        });
    }

    async sendMessage(input: SendChatMessageInput): Promise<ChatMessage> {
        const companyId = await this.resolveCurrentCompanyId(input.currentUserId);
        const text = input.body?.trim() || '';
        const files = input.files || [];
        const mentionedUserIds = input.mentionedUserIds || [];

        if (!text && files.length === 0) {
            throw new Error('Cannot send an empty message.');
        }

        const messageType: ChatMessage['message_type'] =
            files.length > 0 ? (text ? 'mixed' : 'attachment') : 'text';

        const { data: message, error: messageError } = await supabase
            .from('chat_messages')
            .insert({
                company_id: companyId,
                conversation_id: input.conversationId,
                sender_id: input.currentUserId,
                body: text || null,
                message_type: messageType
            })
            .select('id, conversation_id, sender_id, body, message_type, created_at, edited_at, is_edited, deleted_at')
            .single();

        if (messageError) throw messageError;

        if (files.length > 0) {
            for (const file of files) {
                const storagePath = this.buildFileStoragePath(companyId, input.conversationId, file.name);
                const { error: uploadError } = await supabase.storage
                    .from('chat-attachments')
                    .upload(storagePath, file, { upsert: false });

                if (uploadError) throw uploadError;

                const { error: attachmentError } = await supabase
                    .from('chat_message_attachments')
                    .insert({
                        company_id: companyId,
                        conversation_id: input.conversationId,
                        message_id: message.id,
                        uploaded_by: input.currentUserId,
                        bucket_id: 'chat-attachments',
                        storage_path: storagePath,
                        file_name: file.name,
                        content_type: file.type || null,
                        size_bytes: file.size
                    });

                if (attachmentError) throw attachmentError;
            }
        }

        // Mentions are best-effort and should not block message delivery.
        try {
            if (mentionedUserIds.length > 0) {
                await this.persistMentionsByIds(
                    message.id,
                    input.conversationId,
                    companyId,
                    input.currentUserId,
                    mentionedUserIds
                );
            } else {
                await this.persistMentions(
                    message.id,
                    input.conversationId,
                    companyId,
                    input.currentUserId,
                    text || null
                );
            }
        } catch (error) {
            console.warn('Failed to persist chat mentions:', error);
        }

        const fromServer = await this.getMessageById(message.id);

        if (fromServer) return fromServer;

        const usersById = await this.getUsersByIds([input.currentUserId]);

        return {
            ...message,
            sender: usersById[input.currentUserId] || null,
            attachments: []
        };
    }

    async updateMessage(
        messageId: string,
        conversationId: string,
        userId: string,
        body: string
    ): Promise<ChatMessage> {
        const companyId = await this.resolveCurrentCompanyId(userId);
        const normalized = body.trim();
        if (!normalized) {
            throw new Error('Message cannot be empty.');
        }

        const { error } = await supabase
            .from('chat_messages')
            .update({
                body: normalized,
                is_edited: true,
                edited_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .eq('conversation_id', conversationId)
            .eq('company_id', companyId);

        if (error) throw error;

        const updatedMessage = await this.getMessageById(messageId);
        if (!updatedMessage) {
            throw new Error('Message updated but could not be reloaded.');
        }

        return updatedMessage;
    }

    async deleteMessage(
        messageId: string,
        conversationId: string,
        userId: string
    ): Promise<ChatMessage> {
        const companyId = await this.resolveCurrentCompanyId(userId);
        const { error } = await supabase
            .from('chat_messages')
            .update({
                deleted_at: new Date().toISOString(),
                body: null,
                edited_at: null,
                is_edited: false
            })
            .eq('id', messageId)
            .eq('conversation_id', conversationId)
            .eq('company_id', companyId);

        if (error) throw error;

        const deletedMessage = await this.getMessageById(messageId);
        if (!deletedMessage) {
            throw new Error('Message deleted but could not be reloaded.');
        }

        return deletedMessage;
    }

    async archiveConversation(conversationId: string, userId: string): Promise<void> {
        const companyId = await this.resolveCurrentCompanyId(userId);

        const { error } = await supabase
            .from('chat_conversations')
            .update({
                is_archived: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)
            .eq('company_id', companyId);

        if (error) throw error;
    }

    async markConversationRead(
        conversationId: string,
        userId: string,
        latestVisibleMessageId: string | null = null
    ): Promise<void> {
        const companyId = await this.resolveCurrentCompanyId(userId);

        if (latestVisibleMessageId) {
            const { error: readError } = await supabase
                .from('chat_message_reads')
                .upsert({
                    company_id: companyId,
                    message_id: latestVisibleMessageId,
                    user_id: userId,
                    read_at: new Date().toISOString()
                }, { onConflict: 'message_id,user_id' });

            if (readError) throw readError;
        }

        const { error: memberError } = await supabase
            .from('chat_conversation_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', userId);

        if (memberError) throw memberError;
    }

    async getConversationReadCursor(conversationId: string, userId: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('chat_conversation_members')
            .select('last_read_at, user_id')
            .eq('conversation_id', conversationId)
            .is('left_at', null)
            .neq('user_id', userId);

        if (error) throw error;
        const rows = (data || []) as Array<{ last_read_at: string | null; user_id: string }>;
        if (rows.length === 0) return null;

        // If any member hasn't read yet, do not mark as fully read.
        if (rows.some((row) => !row.last_read_at)) return null;

        const timestamps = rows
            .map((row) => row.last_read_at as string)
            .filter(Boolean);

        if (timestamps.length === 0) return null;

        // Return the earliest read time (all members read up to this point).
        return timestamps.reduce((earliest, current) => (
            new Date(current).getTime() < new Date(earliest).getTime() ? current : earliest
        ));
    }

    private async emitMessageRealtimeEvent(
        conversationId: string,
        payload: any,
        onChanged: (event: ChatConversationMessageEvent) => void
    ): Promise<void> {
        const messageId = String(payload?.new?.id || payload?.old?.id || '');

        if (!messageId) {
            onChanged({
                type: 'reload',
                conversationId,
                messageId: null,
                message: null,
                attachment: null
            });
            return;
        }

        if (payload.eventType === 'DELETE') {
            onChanged({
                type: 'delete',
                conversationId,
                messageId,
                message: null,
                attachment: null
            });
            return;
        }

        try {
            const message = await this.getMessageById(messageId);
            if (!message) {
                onChanged({
                    type: 'delete',
                    conversationId,
                    messageId,
                    message: null,
                    attachment: null
                });
                return;
            }

            onChanged({
                type: payload.eventType === 'INSERT'
                    ? 'insert'
                    : (message.deleted_at ? 'delete' : 'update'),
                conversationId,
                messageId,
                message,
                attachment: null
            });
        } catch {
            onChanged({
                type: 'reload',
                conversationId,
                messageId,
                message: null,
                attachment: null
            });
        }
    }

    private async emitAttachmentRealtimeEvent(
        conversationId: string,
        payload: any,
        onChanged: (event: ChatConversationMessageEvent) => void
    ): Promise<void> {
        const attachmentId = String(payload?.new?.id || payload?.old?.id || '');
        const fallbackMessageId = String(payload?.new?.message_id || payload?.old?.message_id || '');

        if (!attachmentId) {
            onChanged({
                type: 'reload',
                conversationId,
                messageId: fallbackMessageId || null,
                message: null,
                attachment: null
            });
            return;
        }

        if (payload.eventType === 'DELETE') {
            onChanged({
                type: 'reload',
                conversationId,
                messageId: fallbackMessageId || null,
                message: null,
                attachment: null
            });
            return;
        }

        try {
            const attachment = await this.getAttachmentById(attachmentId);
            if (!attachment) {
                onChanged({
                    type: 'reload',
                    conversationId,
                    messageId: fallbackMessageId || null,
                    message: null,
                    attachment: null
                });
                return;
            }

            onChanged({
                type: 'attachment',
                conversationId,
                messageId: attachment.message_id,
                message: null,
                attachment
            });
        } catch {
            onChanged({
                type: 'reload',
                conversationId,
                messageId: fallbackMessageId || null,
                message: null,
                attachment: null
            });
        }
    }

    subscribeConversationFeed(onChanged: () => void): RealtimeChannel {
        const channel = supabase.channel('chat-conversations-feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => onChanged())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversation_members' }, () => onChanged())
            .subscribe();

        return channel;
    }

    subscribeConversationMessages(
        conversationId: string,
        onChanged: (event: ChatConversationMessageEvent) => void
    ): RealtimeChannel {
        const channel = supabase.channel(`chat-conversation-${conversationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                void this.emitMessageRealtimeEvent(conversationId, payload, onChanged);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_message_attachments',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                void this.emitAttachmentRealtimeEvent(conversationId, payload, onChanged);
            })
            .subscribe();

        return channel;
    }

    removeSubscription(channel: RealtimeChannel | null): void {
        if (!channel) return;
        supabase.removeChannel(channel);
    }

    async getAttachmentSignedUrl(bucketId: string, storagePath: string, expiresInSeconds = 3600): Promise<string> {
        const { data, error } = await supabase.storage
            .from(bucketId)
            .createSignedUrl(storagePath, expiresInSeconds);

        if (error) throw error;
        if (!data?.signedUrl) {
            throw new Error('Failed to create signed URL for attachment.');
        }

        return data.signedUrl;
    }
}

export const chatService = new ChatService();
export default chatService;
