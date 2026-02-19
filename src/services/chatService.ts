import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type {
    ChatAttachment,
    ChatConversationSummary,
    ChatDepartment,
    ChatMessage,
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
        const { data: conversations, error: conversationsError } = await supabase
            .from('chat_conversations')
            .select('id, conversation_type, title, department_id, created_by, last_message_at, is_archived, created_at, updated_at')
            .eq('is_archived', false)
            .order('last_message_at', { ascending: false });

        if (conversationsError) throw conversationsError;
        const convRows = (conversations || []) as ChatConversationRow[];
        if (convRows.length === 0) return [];

        const conversationIds = convRows.map(c => c.id);

        const { data: membersData, error: membersError } = await supabase
            .from('chat_conversation_members')
            .select('conversation_id, user_id, left_at')
            .in('conversation_id', conversationIds)
            .is('left_at', null);
        if (membersError) throw membersError;

        const members = (membersData || []) as ChatMemberRow[];
        const membersByConversation = new Map<string, ChatMemberRow[]>();
        members.forEach(m => {
            const list = membersByConversation.get(m.conversation_id) || [];
            list.push(m);
            membersByConversation.set(m.conversation_id, list);
        });

        const memberUserIds = Array.from(new Set(members.map(m => m.user_id)));
        const usersById = await this.getUsersByIds(memberUserIds);

        const departmentIds = Array.from(
            new Set(convRows.map((conversation) => conversation.department_id).filter(Boolean))
        ) as string[];
        const departmentsById = new Map<string, string>();

        if (departmentIds.length > 0) {
            const { data: departmentRows, error: departmentError } = await supabase
                .from('departments')
                .select('id, name, name_ar')
                .in('id', departmentIds);

            if (departmentError) throw departmentError;

            (departmentRows || []).forEach((row: any) => {
                departmentsById.set(
                    row.id as string,
                    (row.name_ar as string | null) || (row.name as string | null) || 'Department Conversation'
                );
            });
        }

        const { data: messageRows, error: messagesError } = await supabase
            .from('chat_messages')
            .select('id, conversation_id, sender_id, body, message_type, created_at')
            .in('conversation_id', conversationIds)
            .is('deleted_at', null)
            .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;

        const latestByConversation = new Map<string, { body: string | null; message_type: string }>();
        (messageRows || []).forEach((m: any) => {
            latestByConversation.set(m.conversation_id, {
                body: m.body ?? null,
                message_type: m.message_type
            });
        });

        return convRows.map((conversation) => {
            const convMembers = membersByConversation.get(conversation.id) || [];
            const otherMember = convMembers.find(m => m.user_id !== currentUserId);
            const otherUser = otherMember ? usersById[otherMember.user_id] : null;
            const latest = latestByConversation.get(conversation.id);

            let displayTitle = conversation.title || 'Conversation';
            if (conversation.conversation_type === 'direct') {
                displayTitle = otherUser?.name || otherUser?.email || conversation.title || 'Direct Message';
            } else if (conversation.conversation_type === 'department') {
                displayTitle = conversation.title || departmentsById.get(conversation.department_id || '') || 'Department Conversation';
            }

            return {
                ...conversation,
                display_title: displayTitle,
                members_count: convMembers.length,
                last_message_preview: latest
                    ? (latest.message_type === 'attachment'
                        ? '[Attachment]'
                        : latest.body || '[Message]')
                    : null
            };
        });
    }

    async getMessages(conversationId: string, limit = 100): Promise<ChatMessage[]> {
        const { data: rows, error } = await supabase
            .from('chat_messages')
            .select('id, conversation_id, sender_id, body, message_type, created_at, edited_at, is_edited, deleted_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;

        const messageRows = (rows || []) as ChatMessageRow[];
        const senderIds = Array.from(new Set(messageRows.map(m => m.sender_id)));
        const usersById = await this.getUsersByIds(senderIds);

        const messageIds = messageRows.map(m => m.id);
        let attachmentRows: any[] = [];
        if (messageIds.length > 0) {
            const { data: attachments, error: attachmentsError } = await supabase
                .from('chat_message_attachments')
                .select('id, message_id, conversation_id, bucket_id, storage_path, file_name, content_type, size_bytes, created_at')
                .in('message_id', messageIds)
                .order('created_at', { ascending: true });

            if (attachmentsError) throw attachmentsError;
            attachmentRows = attachments || [];
        }

        const attachmentsByMessage = new Map<string, ChatAttachment[]>();
        attachmentRows.forEach((a: any) => {
            const list = attachmentsByMessage.get(a.message_id) || [];
            list.push({
                id: a.id,
                message_id: a.message_id,
                conversation_id: a.conversation_id,
                bucket_id: a.bucket_id,
                storage_path: a.storage_path,
                file_name: a.file_name,
                content_type: a.content_type ?? null,
                size_bytes: Number(a.size_bytes || 0),
                created_at: a.created_at
            });
            attachmentsByMessage.set(a.message_id, list);
        });

        return messageRows.map((m) => ({
            ...m,
            sender: usersById[m.sender_id] || null,
            attachments: attachmentsByMessage.get(m.id) || []
        }));
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

        const usersById = await this.getUsersByIds([input.currentUserId]);
        const messageWithAttachments = await this.getMessages(input.conversationId, 1);
        const fromServer = messageWithAttachments.find(m => m.id === message.id);

        if (fromServer) return fromServer;

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
    ): Promise<void> {
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
    }

    async deleteMessage(
        messageId: string,
        conversationId: string,
        userId: string
    ): Promise<void> {
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

    async markConversationRead(conversationId: string, userId: string): Promise<void> {
        const companyId = await this.resolveCurrentCompanyId(userId);

        const { data: latestMessage, error: latestMessageError } = await supabase
            .from('chat_messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestMessageError) throw latestMessageError;

        if (latestMessage?.id) {
            const { error: readError } = await supabase
                .from('chat_message_reads')
                .upsert({
                    company_id: companyId,
                    message_id: latestMessage.id,
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

    subscribeConversationFeed(onChanged: () => void): RealtimeChannel {
        const channel = supabase.channel('chat-conversations-feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => onChanged())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversation_members' }, () => onChanged())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => onChanged())
            .subscribe();

        return channel;
    }

    subscribeConversationMessages(conversationId: string, onChanged: () => void): RealtimeChannel {
        const channel = supabase.channel(`chat-conversation-${conversationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_id=eq.${conversationId}`
            }, () => onChanged())
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_message_attachments',
                filter: `conversation_id=eq.${conversationId}`
            }, () => onChanged())
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
