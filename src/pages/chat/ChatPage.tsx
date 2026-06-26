import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowDownTrayIcon,
    CheckIcon,
    EllipsisVerticalIcon,
    PaperAirplaneIcon,
    PaperClipIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
    UserCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSearchParams } from 'react-router-dom';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { useToastStore } from '../../store/toastStore';
import chatService from '../../services/chatService';
import AiAssistantPanel from '../../components/chat/AiAssistantPanel';
import type {
    ChatAttachment,
    ChatConversationSummary,
    ChatDepartment,
    ChatMessage,
    ChatUser
} from '../../types/chat';

type ChatCreationMode = 'direct' | 'department' | 'group';
const CHAT_PAGE_MESSAGE_LIMIT = 50;

const formatConversationTime = (value: string): string => {
    const date = new Date(value);
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();
    if (isSameDay) {
        return new Intl.DateTimeFormat('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    return new Intl.DateTimeFormat('ar-EG', {
        month: 'short',
        day: 'numeric'
    }).format(date);
};

const formatFileSize = (sizeBytes: number): string => {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getConversationTypeLabel = (type: ChatConversationSummary['conversation_type']): string => {
    if (type === 'direct') return 'مباشر';
    if (type === 'department') return 'قسم';
    return 'مجموعة';
};

const getUserDisplayName = (user?: { name?: string | null; email?: string | null } | null): string => {
    const rawName = user?.name?.trim();
    if (rawName) return rawName;
    const email = user?.email?.trim();
    if (!email) return 'مستخدم';
    const handle = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    return handle || 'مستخدم';
};

const sortMessagesAscending = (items: ChatMessage[]): ChatMessage[] => (
    [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
);

const mergeMessagesAscending = (current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] => {
    const byId = new Map<string, ChatMessage>();
    [...current, ...incoming].forEach((message) => {
        byId.set(message.id, message);
    });
    return sortMessagesAscending(Array.from(byId.values()));
};

const mergeAttachmentIntoMessages = (
    current: ChatMessage[],
    messageId: string,
    attachment: ChatAttachment
): ChatMessage[] => current.map((message) => {
    if (message.id !== messageId) return message;
    if (message.attachments.some((item) => item.id === attachment.id)) return message;

    return {
        ...message,
        attachments: [...message.attachments, attachment].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    };
});

const getConversationPreviewFromMessage = (message: ChatMessage | null): string | null => {
    if (!message) return null;
    if (message.message_type === 'attachment') return '[Attachment]';
    if (message.message_type === 'mixed' && !message.body?.trim()) return '[Attachment]';
    return message.body?.trim() || '[Message]';
};

const sortConversationsByActivity = (items: ChatConversationSummary[]): ChatConversationSummary[] => (
    [...items].sort((a, b) => {
        const messageDiff = new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        if (messageDiff !== 0) return messageDiff;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
);

const ChatPage: React.FC = () => {
    const { profile } = useSupabaseAuth();
    const { canAccess, canPerform } = useModulePermissions();
    const [searchParams, setSearchParams] = useSearchParams();
    const showSuccess = useToastStore(state => state.success);
    const showError = useToastStore(state => state.error);

    const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
    const [departments, setDepartments] = useState<ChatDepartment[]>([]);
    const [draftMessage, setDraftMessage] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [creatingDirectConversation, setCreatingDirectConversation] = useState(false);
    const [showDirectConversationModal, setShowDirectConversationModal] = useState(false);
    const [creationMode, setCreationMode] = useState<ChatCreationMode>('direct');
    const [selectedDirectUserId, setSelectedDirectUserId] = useState<string>('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [groupTitle, setGroupTitle] = useState('');
    const [selectedGroupUserIds, setSelectedGroupUserIds] = useState<string[]>([]);
    const [pageError, setPageError] = useState<string | null>(null);
    const [archivingConversation, setArchivingConversation] = useState(false);
    const [activeWorkspace, setActiveWorkspace] = useState<'chat' | 'ai'>('chat');
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);
    const [latestReadAt, setLatestReadAt] = useState<string | null>(null);
    const [latestVisibleMessageId, setLatestVisibleMessageId] = useState<string | null>(null);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [oldestLoadedMessageCreatedAt, setOldestLoadedMessageCreatedAt] = useState<string | null>(null);
    const [pendingMentions, setPendingMentions] = useState<Array<{ userId: string; token: string }>>([]);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
    const [usersLoaded, setUsersLoaded] = useState(false);
    const [departmentsLoaded, setDepartmentsLoaded] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const conversationFeedChannelRef = useRef<RealtimeChannel | null>(null);
    const messagesFeedChannelRef = useRef<RealtimeChannel | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
    const readDebounceRef = useRef<number | null>(null);

    const currentUserId = profile?.uid || null;
    const requestedConversationId = searchParams.get('conversation');
    const requestedWorkspace = searchParams.get('mode');
    const hasChatAccess =
        canAccess('chat')
        && (canPerform('chat', 'view_conversations') || canPerform('chat', 'view'));
    const hasAiAccess =
        canAccess('ai_assistant')
        && (canPerform('ai_assistant', 'view') || canPerform('ai_assistant', 'send_message'));

    useEffect(() => {
        setActiveUsers([]);
        setUsersLoaded(false);
        setDepartments([]);
        setDepartmentsLoaded(false);
    }, [currentUserId]);

    const activeConversation = useMemo(
        () => conversations.find(conversation => conversation.id === activeConversationId) || null,
        [conversations, activeConversationId]
    );

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const lastOutgoingMessageId = useMemo(() => {
        if (!currentUserId || messages.length === 0) return null;
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const msg = messages[i];
            if (msg.sender_id === currentUserId && !msg.deleted_at) return msg.id;
        }
        return null;
    }, [messages, currentUserId]);

    const isEditing = Boolean(editingMessageId);

    useEffect(() => {
        if (!messageMenuId) return;
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target?.closest('[data-chat-menu]')) {
                setMessageMenuId(null);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [messageMenuId]);

    useEffect(() => {
        if (requestedWorkspace === 'ai' && hasAiAccess) {
            setActiveWorkspace('ai');
            return;
        }

        if (!hasChatAccess && hasAiAccess) {
            setActiveWorkspace('ai');
            return;
        }

        if (!hasAiAccess && activeWorkspace === 'ai') {
            setActiveWorkspace('chat');
        }
    }, [requestedWorkspace, hasAiAccess, hasChatAccess, activeWorkspace]);

    const handleWorkspaceChange = useCallback((nextWorkspace: 'chat' | 'ai') => {
        if (nextWorkspace === 'ai' && !hasAiAccess) return;

        setActiveWorkspace(nextWorkspace);
        const nextParams = new URLSearchParams(searchParams);
        if (nextWorkspace === 'ai') {
            nextParams.set('mode', 'ai');
        } else {
            nextParams.delete('mode');
        }
        setSearchParams(nextParams, { replace: true });
    }, [hasAiAccess, searchParams, setSearchParams]);

    const availableUsers = useMemo(() => {
        if (!currentUserId) return [];
        return activeUsers.filter(user => user.id !== currentUserId);
    }, [activeUsers, currentUserId]);

    const mentionNameByEmail = useMemo(() => {
        const map = new Map<string, string>();
        activeUsers.forEach((user) => {
            if (!user.email) return;
            map.set(user.email.toLowerCase(), getUserDisplayName(user));
        });
        if (profile?.email) {
            map.set(profile.email.toLowerCase(), getUserDisplayName({ name: profile.name, email: profile.email }));
        }
        return map;
    }, [activeUsers, profile]);

    const mentionCandidates = useMemo(() => {
        if (!showMentions) return [];
        const query = mentionQuery.trim().toLowerCase();
        const filtered = availableUsers.filter((user) => {
            const displayName = getUserDisplayName(user).toLowerCase();
            const handle = (user.email || '').split('@')[0].toLowerCase();
            return !query || displayName.includes(query) || handle.includes(query);
        });
        return filtered.slice(0, 6);
    }, [availableUsers, mentionQuery, showMentions]);

    useEffect(() => {
        if (!showMentions) return;
        if (mentionCandidates.length === 0) {
            setActiveMentionIndex(0);
            return;
        }
        setActiveMentionIndex((current) => Math.min(current, mentionCandidates.length - 1));
    }, [mentionCandidates, showMentions]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        });
    }, []);

    const refreshReadCursor = useCallback(async (conversationId: string) => {
        if (!currentUserId) return;
        try {
            const readCursor = await chatService.getConversationReadCursor(conversationId, currentUserId);
            setLatestReadAt(readCursor);
        } catch (error) {
            console.error('Failed to refresh read cursor:', error);
        }
    }, [currentUserId]);

    const scheduleMarkConversationRead = useCallback((conversationId: string, messageId: string | null) => {
        if (!currentUserId || !messageId) return;
        if (readDebounceRef.current) {
            window.clearTimeout(readDebounceRef.current);
        }

        readDebounceRef.current = window.setTimeout(() => {
            void chatService
                .markConversationRead(conversationId, currentUserId, messageId)
                .catch((error) => console.error('Failed to mark conversation read:', error));
            void refreshReadCursor(conversationId);
        }, 250);
    }, [currentUserId, refreshReadCursor]);

    const syncConversationSummaryFromMessages = useCallback((conversationId: string, nextMessages: ChatMessage[]) => {
        setConversations((current) => sortConversationsByActivity(current.map((conversation) => {
            if (conversation.id !== conversationId) return conversation;

            const latestVisibleMessage = [...nextMessages].reverse().find((message) => !message.deleted_at) || null;
            return {
                ...conversation,
                last_message_at: latestVisibleMessage?.created_at || conversation.created_at,
                last_message_preview: getConversationPreviewFromMessage(latestVisibleMessage)
            };
        })));
    }, []);

    const loadConversations = useCallback(async (showSpinner = true) => {
        if (!currentUserId) return;

        if (showSpinner) setLoadingConversations(true);
        try {
            const nextConversations = await chatService.listConversations(currentUserId);
            setConversations(nextConversations);

            setActiveConversationId((current) => {
                if (
                    requestedConversationId &&
                    nextConversations.some((conversation) => conversation.id === requestedConversationId)
                ) {
                    return requestedConversationId;
                }
                if (current && nextConversations.some((conversation) => conversation.id === current)) {
                    return current;
                }
                return nextConversations[0]?.id || null;
            });
        } catch (error: any) {
            console.error('Failed to load conversations:', error);
            setPageError(error?.message || 'فشل تحميل المحادثات');
        } finally {
            if (showSpinner) setLoadingConversations(false);
        }
    }, [currentUserId, requestedConversationId]);

    const loadUsers = useCallback(async (showSpinner = true) => {
        if (!currentUserId || usersLoaded) return;
        if (showSpinner) setLoadingUsers(true);

        try {
            const users = await chatService.listActiveUsers(currentUserId);
            setActiveUsers(users);
            setUsersLoaded(true);
        } catch (error: any) {
            console.error('Failed to load users:', error);
            setPageError(error?.message || 'فشل تحميل المستخدمين');
        } finally {
            if (showSpinner) setLoadingUsers(false);
        }
    }, [currentUserId, usersLoaded]);

    const loadDepartments = useCallback(async (showSpinner = true) => {
        if (!currentUserId || departmentsLoaded) return;
        if (showSpinner) setLoadingDepartments(true);

        try {
            const nextDepartments = await chatService.listDepartments(currentUserId);
            setDepartments(nextDepartments);
            setDepartmentsLoaded(true);
        } catch (error: any) {
            console.error('Failed to load departments:', error);
            setPageError(error?.message || 'فشل تحميل الأقسام');
        } finally {
            if (showSpinner) setLoadingDepartments(false);
        }
    }, [currentUserId, departmentsLoaded]);

    const loadMessages = useCallback(async (
        conversationId: string,
        mode: 'replace' | 'older' = 'replace',
        showSpinner = true
    ) => {
        if (!currentUserId) return;

        const container = messagesContainerRef.current;
        const previousScrollHeight = container?.scrollHeight ?? 0;
        const previousScrollTop = container?.scrollTop ?? 0;

        if (mode === 'replace') {
            if (showSpinner) setLoadingMessages(true);
        } else {
            if (!oldestLoadedMessageCreatedAt) return;
            if (showSpinner) setLoadingOlderMessages(true);
        }

        try {
            const batch = await chatService.getMessages(conversationId, {
                limit: CHAT_PAGE_MESSAGE_LIMIT,
                before: mode === 'older' ? oldestLoadedMessageCreatedAt : null
            });

            const nextMessages = mode === 'older'
                ? mergeMessagesAscending(messagesRef.current, batch.messages)
                : batch.messages;

            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            setHasMoreMessages(batch.hasMore);
            setOldestLoadedMessageCreatedAt(
                mode === 'older'
                    ? (batch.oldestLoadedMessageCreatedAt || oldestLoadedMessageCreatedAt)
                    : batch.oldestLoadedMessageCreatedAt
            );
            setLatestVisibleMessageId(batch.latestVisibleMessageId);
            scheduleMarkConversationRead(conversationId, batch.latestVisibleMessageId);
            void refreshReadCursor(conversationId);

            if (mode === 'replace') {
                scrollToBottom('auto');
            } else {
                requestAnimationFrame(() => {
                    const currentContainer = messagesContainerRef.current;
                    if (!currentContainer) return;
                    currentContainer.scrollTop = currentContainer.scrollHeight - previousScrollHeight + previousScrollTop;
                });
            }
        } catch (error: any) {
            console.error('Failed to load messages:', error);
            setPageError(error?.message || 'فشل تحميل الرسائل');
        } finally {
            if (mode === 'replace') {
                if (showSpinner) setLoadingMessages(false);
            } else {
                if (showSpinner) setLoadingOlderMessages(false);
            }
        }
    }, [
        currentUserId,
        oldestLoadedMessageCreatedAt,
        refreshReadCursor,
        scheduleMarkConversationRead,
        scrollToBottom
    ]);

    useEffect(() => {
        return () => {
            if (readDebounceRef.current) {
                window.clearTimeout(readDebounceRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setPageError(null);
        if (!currentUserId || !hasChatAccess || activeWorkspace !== 'chat') {
            return;
        }

        void loadConversations();
    }, [currentUserId, hasChatAccess, activeWorkspace, loadConversations]);

    useEffect(() => {
        if (!hasChatAccess || activeWorkspace !== 'chat' || !activeConversationId) {
            messagesRef.current = [];
            setMessages([]);
            setLatestReadAt(null);
            setLatestVisibleMessageId(null);
            setHasMoreMessages(false);
            setOldestLoadedMessageCreatedAt(null);
            return;
        }
        void loadMessages(activeConversationId, 'replace');
    }, [hasChatAccess, activeWorkspace, activeConversationId, loadMessages]);

    useEffect(() => {
        if (!currentUserId || !hasChatAccess || activeWorkspace !== 'chat') return;
        chatService.removeSubscription(conversationFeedChannelRef.current);

        conversationFeedChannelRef.current = chatService.subscribeConversationFeed(() => {
            void loadConversations(false);
            if (activeConversationId) {
                void refreshReadCursor(activeConversationId);
            }
        });

        return () => {
            chatService.removeSubscription(conversationFeedChannelRef.current);
            conversationFeedChannelRef.current = null;
        };
    }, [currentUserId, hasChatAccess, activeWorkspace, loadConversations, activeConversationId, refreshReadCursor]);

    useEffect(() => {
        chatService.removeSubscription(messagesFeedChannelRef.current);
        if (!hasChatAccess || activeWorkspace !== 'chat' || !activeConversationId) return;

        messagesFeedChannelRef.current = chatService.subscribeConversationMessages(activeConversationId, (event) => {
            if (event.type === 'reload') {
                void loadMessages(activeConversationId, 'replace', false);
                return;
            }

            if (event.type === 'attachment' && event.messageId && event.attachment) {
                const targetLoaded = messagesRef.current.some((message) => message.id === event.messageId);
                if (!targetLoaded) return;

                const nextMessages = mergeAttachmentIntoMessages(
                    messagesRef.current,
                    event.messageId,
                    event.attachment
                );
                messagesRef.current = nextMessages;
                setMessages(nextMessages);
                syncConversationSummaryFromMessages(activeConversationId, nextMessages);
                if (event.messageId === latestVisibleMessageId) {
                    scrollToBottom('auto');
                }
                return;
            }

            if (!event.message) {
                const targetLoaded = event.messageId
                    ? messagesRef.current.some((message) => message.id === event.messageId)
                    : true;
                if (targetLoaded) {
                    void loadMessages(activeConversationId, 'replace', false);
                }
                return;
            }

            const isLoadedMessage = messagesRef.current.some((message) => message.id === event.message?.id);
            if (event.type !== 'insert' && !isLoadedMessage) {
                return;
            }

            const nextMessages = mergeMessagesAscending(messagesRef.current, [event.message]);
            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            syncConversationSummaryFromMessages(activeConversationId, nextMessages);
            setLatestVisibleMessageId(nextMessages[nextMessages.length - 1]?.id || null);
            setOldestLoadedMessageCreatedAt(nextMessages[0]?.created_at || null);

            if (event.type === 'insert') {
                if (event.message.sender_id !== currentUserId) {
                    scheduleMarkConversationRead(activeConversationId, event.message.id);
                }
                scrollToBottom('smooth');
            } else {
                void refreshReadCursor(activeConversationId);
            }
        });

        return () => {
            chatService.removeSubscription(messagesFeedChannelRef.current);
            messagesFeedChannelRef.current = null;
        };
    }, [
        hasChatAccess,
        activeWorkspace,
        activeConversationId,
        currentUserId,
        latestVisibleMessageId,
        loadMessages,
        refreshReadCursor,
        scheduleMarkConversationRead,
        scrollToBottom,
        syncConversationSummaryFromMessages
    ]);

    const renderMessageBody = useCallback((body: string, isMine: boolean) => {
        const parts: React.ReactNode[] = [];
        const regex = /@\{([^}]+)\}|@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        const highlightClass = isMine
            ? 'rounded px-1 text-primary-100 bg-primary-500/40'
            : 'rounded px-1 text-primary-700 bg-primary-100 dark:text-primary-200 dark:bg-primary-900/30';

        while ((match = regex.exec(body)) !== null) {
            if (match.index > lastIndex) {
                parts.push(body.slice(lastIndex, match.index));
            }

            const rawLabel = match[1];
            const emailValue = match[2];
            const email = emailValue ? emailValue.toLowerCase() : '';
            const displayName = rawLabel || mentionNameByEmail.get(email) || emailValue || '';
            parts.push(
                <span key={`${match.index}-${displayName}`} className={highlightClass}>
                    @{displayName}
                </span>
            );

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < body.length) {
            parts.push(body.slice(lastIndex));
        }

        return parts;
    }, [mentionNameByEmail]);

    const handleSelectConversation = useCallback((conversationId: string) => {
        setActiveConversationId(conversationId);
        setSearchParams({ conversation: conversationId });
    }, [setSearchParams]);

    const updateMentionState = useCallback((value: string, cursorPosition: number) => {
        if (!usersLoaded && !loadingUsers) {
            void loadUsers(false);
        }

        const slice = value.slice(0, cursorPosition);
        const atIndex = slice.lastIndexOf('@');
        if (atIndex < 0) {
            setShowMentions(false);
            setMentionQuery('');
            setMentionRange(null);
            return;
        }

        const charBefore = atIndex === 0 ? ' ' : slice[atIndex - 1];
        if (/[A-Za-z0-9_]/.test(charBefore)) {
            setShowMentions(false);
            setMentionQuery('');
            setMentionRange(null);
            return;
        }

        const query = slice.slice(atIndex + 1);
        if (query.includes(' ') || query.includes('\n') || query.includes('\t')) {
            setShowMentions(false);
            setMentionQuery('');
            setMentionRange(null);
            return;
        }

        setMentionQuery(query);
        setMentionRange({ start: atIndex, end: cursorPosition });
        setShowMentions(true);
        setActiveMentionIndex(0);
    }, [loadingUsers, loadUsers, usersLoaded]);

    const insertMention = useCallback((user: ChatUser) => {
        if (!mentionRange) return;
        const before = draftMessage.slice(0, mentionRange.start);
        const after = draftMessage.slice(mentionRange.end);
        const label = getUserDisplayName(user);
        const safeLabel = label.replace(/[{}]/g, '').trim() || getUserDisplayName({ email: user.email });
        const mentionToken = `@{${safeLabel}}`;
        const mentionText = `${mentionToken} `;
        const nextValue = `${before}${mentionText}${after}`;
        setDraftMessage(nextValue);
        setPendingMentions((current) => {
            if (current.some((entry) => entry.userId === user.id && entry.token === mentionToken)) {
                return current;
            }
            return [...current, { userId: user.id, token: mentionToken }];
        });
        setShowMentions(false);
        setMentionQuery('');
        setMentionRange(null);

        const nextCursor = before.length + mentionText.length;
        requestAnimationFrame(() => {
            messageInputRef.current?.focus();
            messageInputRef.current?.setSelectionRange(nextCursor, nextCursor);
        });
    }, [draftMessage, mentionRange]);

    const cancelEditMessage = useCallback(() => {
        setEditingMessageId(null);
        setMessageMenuId(null);
        setDraftMessage('');
        setPendingMentions([]);
        setShowMentions(false);
        setMentionQuery('');
        setMentionRange(null);
    }, []);

    const beginEditMessage = useCallback((message: ChatMessage) => {
        if (!message.body) return;
        setEditingMessageId(message.id);
        setMessageMenuId(null);
        setDraftMessage(message.body);
        setPendingFiles([]);
        setPendingMentions([]);
        setShowMentions(false);
        setMentionQuery('');
        setMentionRange(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        requestAnimationFrame(() => {
            const length = message.body?.length ?? 0;
            messageInputRef.current?.focus();
            messageInputRef.current?.setSelectionRange(length, length);
        });
    }, []);

    const handleDeleteMessage = useCallback(async (message: ChatMessage) => {
        if (!currentUserId || !activeConversationId) return;
        if (!message.id) return;
        const confirmed = window.confirm('هل تريد حذف هذه الرسالة؟');
        if (!confirmed) return;
        setPageError(null);
        try {
            const deletedMessage = await chatService.deleteMessage(message.id, activeConversationId, currentUserId);
            const nextMessages = mergeMessagesAscending(messagesRef.current, [deletedMessage]);
            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            syncConversationSummaryFromMessages(activeConversationId, nextMessages);
            setLatestVisibleMessageId(nextMessages[nextMessages.length - 1]?.id || null);
            setOldestLoadedMessageCreatedAt(nextMessages[0]?.created_at || null);
            if (editingMessageId === message.id) {
                cancelEditMessage();
            }
            setMessageMenuId(null);
            void refreshReadCursor(activeConversationId);
        } catch (error: any) {
            console.error('Failed to delete message:', error);
            showError('فشل حذف الرسالة', error?.message || 'تعذر حذف الرسالة حالياً');
        }
    }, [
        currentUserId,
        activeConversationId,
        editingMessageId,
        cancelEditMessage,
        refreshReadCursor,
        showError
    ]);

    const handleSendMessage = useCallback(async () => {
        if (!currentUserId || !activeConversationId || sendingMessage) return;
        const normalizedText = draftMessage.trim();
        if (!normalizedText && (isEditing || pendingFiles.length === 0)) return;
        const mentionIds = Array.from(
            new Set(
                pendingMentions
                    .filter((entry) => normalizedText.includes(entry.token))
                    .map((entry) => entry.userId)
            )
        );

        setSendingMessage(true);
        setPageError(null);
        try {
            let savedMessage: ChatMessage;
            if (isEditing && editingMessageId) {
                savedMessage = await chatService.updateMessage(
                    editingMessageId,
                    activeConversationId,
                    currentUserId,
                    normalizedText
                );
            } else {
                savedMessage = await chatService.sendMessage({
                    currentUserId,
                    conversationId: activeConversationId,
                    body: normalizedText,
                    files: pendingFiles,
                    mentionedUserIds: mentionIds
                });
            }

            setDraftMessage('');
            setPendingFiles([]);
            setPendingMentions([]);
            setEditingMessageId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setShowMentions(false);
            setMentionQuery('');
            setMentionRange(null);
            const nextMessages = mergeMessagesAscending(messagesRef.current, [savedMessage]);
            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            syncConversationSummaryFromMessages(activeConversationId, nextMessages);
            setLatestVisibleMessageId(nextMessages[nextMessages.length - 1]?.id || null);
            setOldestLoadedMessageCreatedAt(nextMessages[0]?.created_at || null);
            scrollToBottom('smooth');
        } catch (error: any) {
            console.error('Failed to send message:', error);
            showError('فشل إرسال الرسالة', error?.message || 'تعذر إرسال الرسالة حالياً');
        } finally {
            setSendingMessage(false);
        }
    }, [
        currentUserId,
        activeConversationId,
        sendingMessage,
        draftMessage,
        pendingFiles,
        pendingMentions,
        isEditing,
        editingMessageId,
        scrollToBottom,
        showError
    ]);

    const handleArchiveConversation = useCallback(async () => {
        if (!currentUserId || !activeConversationId || !activeConversation || archivingConversation) return;

        const confirmed = window.confirm(`سيتم حذف المحادثة "${activeConversation.display_title}" وإخفاؤها من القائمة. هل تريد المتابعة؟`);
        if (!confirmed) return;

        setArchivingConversation(true);
        setPageError(null);
        try {
            await chatService.archiveConversation(activeConversationId, currentUserId);
            await loadConversations(false);
            messagesRef.current = [];
            setMessages([]);
            setLatestReadAt(null);
            setLatestVisibleMessageId(null);
            setHasMoreMessages(false);
            setOldestLoadedMessageCreatedAt(null);
            showSuccess('تم حذف المحادثة', 'تم أرشفة المحادثة وإخفاؤها من القائمة.');
        } catch (error: any) {
            console.error('Failed to archive conversation:', error);
            showError('فشل حذف المحادثة', error?.message || 'تعذر حذف المحادثة حالياً');
        } finally {
            setArchivingConversation(false);
        }
    }, [
        currentUserId,
        activeConversationId,
        activeConversation,
        archivingConversation,
        loadConversations,
        showError,
        showSuccess
    ]);

    const handleDownloadAttachment = useCallback(async (bucketId: string, storagePath: string) => {
        try {
            const signedUrl = await chatService.getAttachmentSignedUrl(bucketId, storagePath);
            window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } catch (error: any) {
            console.error('Failed to download attachment:', error);
            showError('فشل تحميل المرفق', error?.message || 'لا يمكن فتح الملف حالياً');
        }
    }, [showError]);

    const canSubmitConversationCreation = useMemo(() => {
        if (creationMode === 'direct') return Boolean(selectedDirectUserId);
        if (creationMode === 'department') return Boolean(selectedDepartmentId);
        return groupTitle.trim().length > 0 && selectedGroupUserIds.length > 0;
    }, [creationMode, selectedDirectUserId, selectedDepartmentId, groupTitle, selectedGroupUserIds]);

    const handleToggleGroupUser = useCallback((userId: string) => {
        setSelectedGroupUserIds((current) => (
            current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId]
        ));
    }, []);

    const handleCreateConversation = useCallback(async () => {
        if (!currentUserId || creatingDirectConversation) return;

        if (creationMode === 'direct' && !selectedDirectUserId) return;
        if (creationMode === 'department' && !selectedDepartmentId) return;
        if (creationMode === 'group' && (!groupTitle.trim() || selectedGroupUserIds.length === 0)) {
            showError('بيانات ناقصة', 'يرجى كتابة اسم المجموعة واختيار الأعضاء.');
            return;
        }

        setCreatingDirectConversation(true);
        setPageError(null);
        try {
            let conversation: ChatConversationSummary;

            if (creationMode === 'direct') {
                conversation = await chatService.createDirectConversation(currentUserId, selectedDirectUserId);
            } else if (creationMode === 'department') {
                conversation = await chatService.createDepartmentConversation(currentUserId, selectedDepartmentId);
            } else {
                const uniqueGroupMembers = Array.from(new Set(selectedGroupUserIds));
                conversation = await chatService.createGroupConversation(
                    currentUserId,
                    groupTitle.trim(),
                    uniqueGroupMembers
                );
            }

            await loadConversations(false);

            setActiveConversationId(conversation.id);
            setSearchParams({ conversation: conversation.id });
            setShowDirectConversationModal(false);
            setCreationMode('direct');
            setSelectedDirectUserId('');
            setSelectedDepartmentId('');
            setGroupTitle('');
            setSelectedGroupUserIds([]);
            showSuccess('تم إنشاء المحادثة', 'تم فتح المحادثة بنجاح.');
        } catch (error: any) {
            console.error('Failed to create conversation:', error);
            showError('فشل إنشاء المحادثة', error?.message || 'تعذر إنشاء المحادثة');
        } finally {
            setCreatingDirectConversation(false);
        }
    }, [
        currentUserId,
        creatingDirectConversation,
        creationMode,
        selectedDirectUserId,
        selectedDepartmentId,
        groupTitle,
        selectedGroupUserIds,
        showError,
        loadConversations,
        setSearchParams,
        showSuccess
    ]);

    const handleOpenDirectConversationModal = useCallback(() => {
        setCreationMode('direct');
        setSelectedDirectUserId('');
        setSelectedDepartmentId('');
        setGroupTitle('');
        setSelectedGroupUserIds([]);
        setShowDirectConversationModal(true);

        void Promise.all([
            loadUsers(),
            loadDepartments()
        ]);
    }, [loadUsers, loadDepartments]);

    if (!currentUserId) {
        return (
            <div className="p-6">
                <div className="rounded-corporate border border-slate-200 bg-white p-6 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    يرجى تسجيل الدخول للوصول إلى الدردشة.
                </div>
            </div>
        );
    }

    return (
        <div className="h-full box-border p-4 md:p-6 flex flex-col overflow-hidden">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {activeWorkspace === 'ai' ? 'المساعد الذكي' : 'الدردشة الداخلية'}
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {activeWorkspace === 'ai'
                            ? 'محادثة ذكية للإجابة من بيانات النظام الحالية. التنفيذ المباشر غير مفعّل في هذه النسخة.'
                            : <>محادثات مباشرة/أقسام/مجموعات مع مرفقات وتحديث لحظي. اكتب {' '}<span dir="ltr" className="font-medium">@</span> لعرض المستخدمين والبحث بالاسم.</>}
                    </p>
                </div>

                {hasAiAccess && (
                    <div className="inline-flex rounded-corporate border border-slate-300 bg-white p-1 text-xs dark:border-slate-600 dark:bg-slate-800">
                        <button
                            type="button"
                            onClick={() => handleWorkspaceChange('chat')}
                            disabled={!hasChatAccess}
                            className={`rounded-corporate px-3 py-1.5 font-medium transition ${
                                activeWorkspace === 'chat'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                            } ${!hasChatAccess ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                            الدردشة
                        </button>
                        <button
                            type="button"
                            onClick={() => handleWorkspaceChange('ai')}
                            className={`rounded-corporate px-3 py-1.5 font-medium transition ${
                                activeWorkspace === 'ai'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                        >
                            AI Assistant
                        </button>
                    </div>
                )}
            </div>

            {activeWorkspace === 'chat' && pageError && (
                <div className="mb-4 rounded-corporate border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
                    {pageError}
                </div>
            )}

            {activeWorkspace === 'ai' ? (
                <AiAssistantPanel />
            ) : !hasChatAccess ? (
                <div className="rounded-corporate-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    لا تملك صلاحية استخدام الدردشة الداخلية. يمكنك استخدام تبويب المساعد الذكي فقط.
                </div>
            ) : (
            <>
            <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden rounded-corporate-lg border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-800 lg:grid-cols-[320px_1fr]">
                <aside className="border-b border-slate-200 dark:border-slate-700 lg:border-b-0 lg:border-l flex flex-col min-h-0">
                    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">المحادثات</h2>
                        <button
                            type="button"
                            onClick={handleOpenDirectConversationModal}
                            className="inline-flex items-center gap-1 rounded-corporate bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                        >
                            <PlusIcon className="h-4 w-4" />
                            جديدة
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto chat-conversation-scroll">
                        {loadingConversations ? (
                            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">جاري تحميل المحادثات...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">لا توجد محادثات بعد.</div>
                        ) : (
                            conversations.map(conversation => (
                                <button
                                    key={conversation.id}
                                    type="button"
                                    onClick={() => handleSelectConversation(conversation.id)}
                                    className={`w-full border-b border-slate-100 px-3 py-3 text-right transition dark:border-slate-700/60 ${activeConversationId === conversation.id
                                            ? 'bg-primary-50 dark:bg-primary-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{conversation.display_title}</p>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                    {getConversationTypeLabel(conversation.conversation_type)}
                                                </span>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                                                {conversation.last_message_preview || 'لا توجد رسائل'}
                                            </p>
                                        </div>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {formatConversationTime(conversation.last_message_at)}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <section className="flex min-h-0 flex-1 flex-col">
                    {activeConversation ? (
                        <>
                            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeConversation.display_title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{activeConversation.members_count} عضو</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleArchiveConversation()}
                                        disabled={archivingConversation}
                                        className="inline-flex items-center gap-1 rounded-corporate border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                                        title="حذف المحادثة"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                        حذف
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={messagesContainerRef}
                                className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-900/40"
                            >
                                {!loadingMessages && hasMoreMessages && (
                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => void loadMessages(activeConversation.id, 'older')}
                                            disabled={loadingOlderMessages}
                                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                        >
                                            {loadingOlderMessages ? 'جاري تحميل الرسائل الأقدم...' : 'تحميل رسائل أقدم'}
                                        </button>
                                    </div>
                                )}
                                {loadingMessages ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">جاري تحميل الرسائل...</p>
                                ) : messages.length === 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">ابدأ أول رسالة في هذه المحادثة.</p>
                                ) : (
                                    messages.map(message => {
                                        const isMine = message.sender_id === currentUserId;
                                        const isLastOutgoing = isMine && message.id === lastOutgoingMessageId;
                                        const isRead = Boolean(
                                            isLastOutgoing &&
                                            latestReadAt &&
                                            new Date(message.created_at).getTime() <= new Date(latestReadAt).getTime()
                                        );
                                        const isDeleted = Boolean(message.deleted_at);
                                        return (
                                            <div key={message.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`max-w-[85%] rounded-corporate px-3 py-2 text-sm shadow-sm ${isMine ? 'bg-primary-600 text-white' : 'bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-100'}`}>
                                                    <div className="mb-1 flex items-center justify-between gap-2">
                                                        <p className={`flex items-center gap-2 text-[11px] ${isMine ? 'text-primary-100' : 'text-slate-500 dark:text-slate-300'}`}>
                                                            <span>
                                                                {getUserDisplayName(message.sender)} - {formatConversationTime(message.created_at)}
                                                            </span>
                                                            {message.is_edited && !isDeleted && (
                                                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                                                                    تم التعديل
                                                                </span>
                                                            )}
                                                        </p>
                                                        {isMine && !isDeleted && (
                                                            <div className="relative" data-chat-menu>
                                                                <button
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        setMessageMenuId((current) => (current === message.id ? null : message.id));
                                                                    }}
                                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-primary-100 transition hover:bg-white/10"
                                                                    title="خيارات الرسالة"
                                                                >
                                                                    <EllipsisVerticalIcon className="h-4 w-4" />
                                                                </button>
                                                                {messageMenuId === message.id && (
                                                                    <div className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-md border border-slate-200 bg-white text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => beginEditMessage(message)}
                                                                            className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                                                                        >
                                                                            <PencilSquareIcon className="h-4 w-4" />
                                                                            تعديل
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void handleDeleteMessage(message)}
                                                                            className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                                                                        >
                                                                            <TrashIcon className="h-4 w-4" />
                                                                            حذف
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isDeleted ? (
                                                        <p className="italic text-xs opacity-80">تم حذف الرسالة</p>
                                                    ) : (
                                                        <>
                                                            {message.body && (
                                                                <p className="whitespace-pre-wrap">
                                                                    {renderMessageBody(message.body, isMine)}
                                                                </p>
                                                            )}

                                                            {message.attachments.length > 0 && (
                                                                <div className="mt-2 space-y-2">
                                                                    {message.attachments.map(attachment => (
                                                                        <div
                                                                            key={attachment.id}
                                                                            className={`flex items-center justify-between gap-3 rounded-md px-2 py-1 text-xs ${isMine ? 'bg-primary-500/70 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200'}`}
                                                                        >
                                                                            <div>
                                                                                <p className="font-medium">{attachment.file_name}</p>
                                                                                <p>{formatFileSize(attachment.size_bytes)}</p>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDownloadAttachment(attachment.bucket_id, attachment.storage_path)}
                                                                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-current/30"
                                                                                title="تنزيل المرفق"
                                                                            >
                                                                                <ArrowDownTrayIcon className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {isLastOutgoing && (
                                                        <p className={`mt-1 text-[11px] ${isRead ? 'text-primary-100' : 'text-primary-200/70'}`}>
                                                            {isRead ? 'تمت القراءة' : 'تم الإرسال'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="border-t border-slate-200 p-3 dark:border-slate-700">
                                {isEditing && (
                                    <div className="mb-2 flex items-center justify-between rounded-corporate border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                                        <span>وضع تعديل الرسالة</span>
                                        <button
                                            type="button"
                                            onClick={cancelEditMessage}
                                            className="inline-flex items-center gap-1 rounded-full border border-amber-300 px-2 py-0.5 text-[10px] hover:bg-amber-100 dark:border-amber-600 dark:hover:bg-amber-900/30"
                                        >
                                            <XMarkIcon className="h-3 w-3" />
                                            إلغاء
                                        </button>
                                    </div>
                                )}

                                {!isEditing && pendingFiles.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {pendingFiles.map(file => (
                                            <span key={`${file.name}-${file.size}-${file.lastModified}`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                                {file.name}
                                                <button
                                                    type="button"
                                                    onClick={() => setPendingFiles(current => current.filter(f => f !== file))}
                                                    className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600"
                                                >
                                                    <XMarkIcon className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isEditing}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-corporate border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                        title="إرفاق ملفات"
                                    >
                                        <PaperClipIcon className="h-5 w-5" />
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        multiple
                                        onChange={(event) => {
                                            if (isEditing) return;
                                            const nextFiles = Array.from(event.target.files || []);
                                            if (nextFiles.length > 0) {
                                                setPendingFiles(current => [...current, ...nextFiles]);
                                            }
                                        }}
                                    />

                                    <div className="relative flex-1">
                                        <textarea
                                            ref={messageInputRef}
                                            value={draftMessage}
                                            onChange={(event) => {
                                                const nextValue = event.target.value;
                                                setDraftMessage(nextValue);
                                                const cursor = event.target.selectionStart ?? nextValue.length;
                                                updateMentionState(nextValue, cursor);
                                            }}
                                            onKeyDown={(event) => {
                                                if (showMentions && mentionCandidates.length > 0) {
                                                    if (event.key === 'ArrowDown') {
                                                        event.preventDefault();
                                                        setActiveMentionIndex((current) => Math.min(current + 1, mentionCandidates.length - 1));
                                                        return;
                                                    }
                                                    if (event.key === 'ArrowUp') {
                                                        event.preventDefault();
                                                        setActiveMentionIndex((current) => Math.max(current - 1, 0));
                                                        return;
                                                    }
                                                    if (event.key === 'Enter' && !event.shiftKey) {
                                                        event.preventDefault();
                                                        const target = mentionCandidates[activeMentionIndex];
                                                        if (target) {
                                                            insertMention(target);
                                                        }
                                                        return;
                                                    }
                                                    if (event.key === 'Escape') {
                                                        event.preventDefault();
                                                        setShowMentions(false);
                                                        setMentionQuery('');
                                                        setMentionRange(null);
                                                        return;
                                                    }
                                                }

                                                if (event.key === 'Escape' && isEditing) {
                                                    event.preventDefault();
                                                    cancelEditMessage();
                                                    return;
                                                }

                                                if (event.key === 'Enter' && !event.shiftKey) {
                                                    event.preventDefault();
                                                    void handleSendMessage();
                                                }
                                            }}
                                            rows={2}
                                            placeholder={isEditing ? 'تعديل الرسالة...' : 'اكتب رسالتك...'}
                                            className="min-h-[42px] w-full resize-none rounded-corporate border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                        />

                                        {showMentions && (
                                            <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-56 overflow-y-auto rounded-corporate border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                                {mentionCandidates.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                                                        لا يوجد مستخدمون متطابقون.
                                                    </div>
                                                ) : (
                                                    mentionCandidates.map((user, index) => (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => insertMention(user)}
                                                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-xs transition ${index === activeMentionIndex
                                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                                                }`}
                                                        >
                                                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                                                {getUserDisplayName(user)}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => void handleSendMessage()}
                                        disabled={sendingMessage || (!draftMessage.trim() && (isEditing || pendingFiles.length === 0))}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-corporate bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        title={isEditing ? 'حفظ التعديل' : 'إرسال'}
                                    >
                                        {isEditing ? <CheckIcon className="h-5 w-5" /> : <PaperAirplaneIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-slate-500 dark:text-slate-400">
                            <UserCircleIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                            <p>اختر محادثة من القائمة أو أنشئ محادثة جديدة.</p>
                        </div>
                    )}
                </section>
            </div>

            {showDirectConversationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
                    <div className="w-full max-w-md rounded-corporate-lg border border-slate-200 bg-white p-4 shadow-soft-lg dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">إنشاء محادثة جديدة</h3>
                            <button
                                type="button"
                                onClick={() => setShowDirectConversationModal(false)}
                                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-3 grid grid-cols-3 gap-2 rounded-corporate border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/40">
                            <button
                                type="button"
                                onClick={() => setCreationMode('direct')}
                                className={`rounded-corporate px-2 py-1.5 text-xs font-medium transition ${creationMode === 'direct'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                    }`}
                            >
                                مباشر
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreationMode('department')}
                                className={`rounded-corporate px-2 py-1.5 text-xs font-medium transition ${creationMode === 'department'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                    }`}
                            >
                                قسم
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreationMode('group')}
                                className={`rounded-corporate px-2 py-1.5 text-xs font-medium transition ${creationMode === 'group'
                                    ? 'bg-primary-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                    }`}
                            >
                                مجموعة
                            </button>
                        </div>

                        {creationMode === 'group' && (
                            <div className="mb-3">
                                <input
                                    type="text"
                                    value={groupTitle}
                                    onChange={(event) => setGroupTitle(event.target.value)}
                                    placeholder="اسم المجموعة"
                                    className="w-full rounded-corporate border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                />
                            </div>
                        )}

                        <div className="max-h-72 space-y-1 overflow-y-auto rounded border border-slate-200 p-2 dark:border-slate-700">
                            {creationMode === 'direct' && (
                                <>
                                    {loadingUsers ? (
                                        <p className="p-2 text-sm text-slate-500 dark:text-slate-400">جاري تحميل المستخدمين...</p>
                                    ) : availableUsers.length === 0 ? (
                                        <p className="p-2 text-sm text-slate-500 dark:text-slate-400">لا يوجد مستخدمون متاحون.</p>
                                    ) : (
                                        availableUsers.map(user => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => setSelectedDirectUserId(user.id)}
                                                className={`flex w-full items-center justify-between rounded px-2 py-2 text-right text-sm transition ${selectedDirectUserId === user.id
                                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{user.name || user.email}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
                                            </button>
                                        ))
                                    )}
                                </>
                            )}

                            {creationMode === 'department' && (
                                <>
                                    {loadingDepartments ? (
                                        <p className="p-2 text-sm text-slate-500 dark:text-slate-400">جاري تحميل الأقسام...</p>
                                    ) : departments.length === 0 ? (
                                        <p className="p-2 text-sm text-slate-500 dark:text-slate-400">لا توجد أقسام متاحة.</p>
                                    ) : (
                                        departments.map((department) => (
                                            <button
                                                key={department.id}
                                                type="button"
                                                onClick={() => setSelectedDepartmentId(department.id)}
                                                className={`flex w-full items-center justify-between rounded px-2 py-2 text-right text-sm transition ${selectedDepartmentId === department.id
                                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                                    {department.name_ar || department.name}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {department.name}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </>
                            )}

                            {creationMode === 'group' && (
                                <>
                                    {loadingUsers ? (
                                        <p className="p-2 text-sm text-slate-500 dark:text-slate-400">جاري تحميل المستخدمين...</p>
                                    ) : availableUsers.length === 0 ? (
                                        <p className="p-2 text-sm text-slate-500 dark:text-slate-400">لا يوجد مستخدمون متاحون.</p>
                                    ) : (
                                        availableUsers.map(user => {
                                            const isSelected = selectedGroupUserIds.includes(user.id);
                                            return (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => handleToggleGroupUser(user.id)}
                                                    className={`flex w-full items-center justify-between rounded px-2 py-2 text-right text-sm transition ${isSelected
                                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                                        }`}
                                                >
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">{user.name || user.email}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {isSelected ? 'محدد' : user.email}
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDirectConversationModal(false);
                                    setCreationMode('direct');
                                    setSelectedDirectUserId('');
                                    setSelectedDepartmentId('');
                                    setGroupTitle('');
                                    setSelectedGroupUserIds([]);
                                }}
                                className="rounded-corporate border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleCreateConversation()}
                                disabled={!canSubmitConversationCreation || creatingDirectConversation}
                                className="rounded-corporate bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creatingDirectConversation ? 'جارِ الإنشاء...' : 'إنشاء'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default ChatPage;
