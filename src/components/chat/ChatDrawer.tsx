import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    ChatBubbleLeftRightIcon,
    CheckIcon,
    EllipsisVerticalIcon,
    MinusIcon,
    PaperClipIcon,
    PencilSquareIcon,
    TrashIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import chatService from '../../services/chatService';
import useChatDrawerStore from '../../store/chatDrawerStore';
import type { ChatConversationSummary, ChatMessage, ChatUser } from '../../types/chat';

const CHAT_DRAWER_MESSAGE_LIMIT = 30;

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

const ChatDrawer: React.FC = () => {
    const { profile } = useSupabaseAuth();
    const navigate = useNavigate();
    const {
        isOpen,
        isMinimized,
        conversationId,
        close,
        minimize,
        restore,
        setConversationId
    } = useChatDrawerStore();

    const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
    const [draftMessage, setDraftMessage] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [pendingMentions, setPendingMentions] = useState<Array<{ userId: string; token: string }>>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [latestReadAt, setLatestReadAt] = useState<string | null>(null);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
    const [usersLoaded, setUsersLoaded] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

    const currentUserId = profile?.uid || null;
    const activeConversationId = conversationId;

    useEffect(() => {
        setActiveUsers([]);
        setUsersLoaded(false);
    }, [currentUserId]);

    const activeConversation = useMemo(
        () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
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
        const filtered = activeUsers.filter((user) => {
            const displayName = getUserDisplayName(user).toLowerCase();
            const handle = (user.email || '').split('@')[0].toLowerCase();
            return !query || displayName.includes(query) || handle.includes(query);
        });
        return filtered.slice(0, 6);
    }, [activeUsers, mentionQuery, showMentions]);

    useEffect(() => {
        if (!showMentions) return;
        if (mentionCandidates.length === 0) {
            setActiveMentionIndex(0);
            return;
        }
        setActiveMentionIndex((current) => Math.min(current, mentionCandidates.length - 1));
    }, [mentionCandidates, showMentions]);

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

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior });
        });
    }, []);

    const refreshReadCursor = useCallback(async (targetConversationId: string) => {
        if (!currentUserId) return;
        try {
            const readCursor = await chatService.getConversationReadCursor(targetConversationId, currentUserId);
            setLatestReadAt(readCursor);
        } catch (err) {
            console.error('Failed to refresh drawer read cursor:', err);
        }
    }, [currentUserId]);

    const syncConversationSummaryFromMessages = useCallback((targetConversationId: string, nextMessages: ChatMessage[]) => {
        setConversations((current) => sortConversationsByActivity(current.map((conversation) => {
            if (conversation.id !== targetConversationId) return conversation;
            const latestVisibleMessage = [...nextMessages].reverse().find((message) => !message.deleted_at) || null;
            return {
                ...conversation,
                last_message_at: latestVisibleMessage?.created_at || conversation.created_at,
                last_message_preview: getConversationPreviewFromMessage(latestVisibleMessage)
            };
        })));
    }, []);

    const loadConversations = useCallback(async () => {
        if (!currentUserId) return;
        setLoadingConversations(true);
        try {
            const list = await chatService.listConversations(currentUserId);
            setConversations(list);
        } catch (err: any) {
            console.error('Failed to load drawer conversations:', err);
            setError(err?.message || 'تعذر تحميل المحادثات');
        } finally {
            setLoadingConversations(false);
        }
    }, [currentUserId]);

    const loadUsers = useCallback(async () => {
        if (!currentUserId || usersLoaded) return;
        setLoadingUsers(true);
        try {
            const list = await chatService.listActiveUsers(currentUserId);
            setActiveUsers(list);
            setUsersLoaded(true);
        } catch (err: any) {
            console.error('Failed to load drawer users:', err);
        } finally {
            setLoadingUsers(false);
        }
    }, [currentUserId, usersLoaded]);

    const updateMentionState = useCallback((value: string, cursorPosition: number) => {
        if (!usersLoaded && !loadingUsers) {
            void loadUsers();
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

    const loadMessages = useCallback(async (targetConversationId: string) => {
        if (!currentUserId) return;
        setLoadingMessages(true);
        try {
            const batch = await chatService.getMessages(targetConversationId, {
                limit: CHAT_DRAWER_MESSAGE_LIMIT
            });
            messagesRef.current = batch.messages;
            setMessages(batch.messages);
            await chatService.markConversationRead(targetConversationId, currentUserId, batch.latestVisibleMessageId);
            await refreshReadCursor(targetConversationId);
            scrollToBottom('auto');
        } catch (err: any) {
            console.error('Failed to load drawer messages:', err);
            setError(err?.message || 'تعذر تحميل الرسائل');
        } finally {
            setLoadingMessages(false);
        }
    }, [currentUserId, refreshReadCursor, scrollToBottom]);

    const handleDeleteMessage = useCallback(async (message: ChatMessage) => {
        if (!currentUserId || !activeConversationId) return;
        const confirmed = window.confirm('هل تريد حذف هذه الرسالة؟');
        if (!confirmed) return;
        try {
            const deletedMessage = await chatService.deleteMessage(message.id, activeConversationId, currentUserId);
            const nextMessages = mergeMessagesAscending(messagesRef.current, [deletedMessage]);
            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            syncConversationSummaryFromMessages(activeConversationId, nextMessages);
            if (editingMessageId === message.id) {
                cancelEditMessage();
            }
            setMessageMenuId(null);
            void refreshReadCursor(activeConversationId);
        } catch (err: any) {
            console.error('Failed to delete drawer message:', err);
            setError(err?.message || 'تعذر حذف الرسالة');
        }
    }, [
        currentUserId,
        activeConversationId,
        editingMessageId,
        cancelEditMessage,
        refreshReadCursor,
        syncConversationSummaryFromMessages
    ]);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        void loadConversations();
    }, [isOpen, loadConversations]);

    useEffect(() => {
        if (!isOpen || !activeConversationId) {
            messagesRef.current = [];
            setMessages([]);
            setLatestReadAt(null);
            return;
        }

        void loadMessages(activeConversationId);
    }, [isOpen, activeConversationId, loadMessages]);

    useEffect(() => {
        if (!isOpen) return;
        if (conversations.length === 0) return;
        if (!activeConversationId) {
            setConversationId(conversations[0].id);
            return;
        }
        const exists = conversations.some((conversation) => conversation.id === activeConversationId);
        if (!exists) {
            setConversationId(conversations[0].id);
        }
    }, [isOpen, activeConversationId, conversations, setConversationId]);

    const handleSendMessage = useCallback(async () => {
        if (!currentUserId || !activeConversationId || sendingMessage) return;
        const text = draftMessage.trim();
        if (!text && (isEditing || pendingFiles.length === 0)) return;
        const mentionIds = Array.from(
            new Set(
                pendingMentions
                    .filter((entry) => text.includes(entry.token))
                    .map((entry) => entry.userId)
            )
        );

        setSendingMessage(true);
        setError(null);
        try {
            let savedMessage: ChatMessage;
            if (isEditing && editingMessageId) {
                savedMessage = await chatService.updateMessage(editingMessageId, activeConversationId, currentUserId, text);
            } else {
                savedMessage = await chatService.sendMessage({
                    currentUserId,
                    conversationId: activeConversationId,
                    body: text,
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
            scrollToBottom('smooth');
        } catch (err: any) {
            console.error('Failed to send drawer message:', err);
            setError(err?.message || 'تعذر إرسال الرسالة');
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
        syncConversationSummaryFromMessages
    ]);

    const handleDownloadAttachment = useCallback(async (bucketId: string, storagePath: string) => {
        try {
            const signedUrl = await chatService.getAttachmentSignedUrl(bucketId, storagePath);
            window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } catch (err: any) {
            console.error('Failed to download attachment:', err);
            setError(err?.message || 'تعذر فتح المرفق');
        }
    }, []);

    const handleOpenFullChat = useCallback(() => {
        if (!activeConversationId) {
            navigate('/chat');
            close();
            return;
        }
        navigate(`/chat?conversation=${activeConversationId}`);
        close();
    }, [activeConversationId, navigate, close]);

    if (!isOpen) return null;

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-[60]">
                <button
                    type="button"
                    onClick={restore}
                    className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-white shadow-2xl transition hover:bg-primary-700"
                >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    <span className="text-sm font-semibold">الدردشة</span>
                </button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[60] w-[360px] max-w-[92vw]">
            <div className="flex max-h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">الدردشة</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            {activeConversation?.display_title || (loadingConversations ? 'جاري التحميل...' : 'لا توجد محادثة')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={minimize}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                            title="تصغير"
                        >
                            <MinusIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenFullChat}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                            title="فتح الشاشة الكاملة"
                        >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={close}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                            title="إغلاق"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 min-h-0 flex-col">
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50 dark:bg-slate-900/40">
                        {error && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                                {error}
                            </div>
                        )}
                        {loadingMessages ? (
                            <div className="text-xs text-slate-500">جاري تحميل الرسائل...</div>
                        ) : !activeConversationId ? (
                            <div className="text-xs text-slate-500">لا توجد محادثة حالياً.</div>
                        ) : messages.length === 0 ? (
                            <div className="text-xs text-slate-500">لا توجد رسائل بعد.</div>
                        ) : (
                            messages.map((message) => {
                                const isMine = message.sender_id === currentUserId;
                                const isLastOutgoing = isMine && message.id === lastOutgoingMessageId;
                                const isRead = Boolean(
                                    isLastOutgoing &&
                                    latestReadAt &&
                                    new Date(message.created_at).getTime() <= new Date(latestReadAt as string).getTime()
                                );
                                const isDeleted = Boolean(message.deleted_at);
                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-sm ${
                                            isMine
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                                        }`}>
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <p className={`flex items-center gap-2 text-[10px] ${isMine ? 'text-primary-100' : 'text-slate-500 dark:text-slate-300'}`}>
                                                    <span>
                                                        {getUserDisplayName(message.sender)} - {formatConversationTime(message.created_at)}
                                                    </span>
                                                    {message.is_edited && !isDeleted && (
                                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px]">
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
                                                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/30 text-primary-100 transition hover:bg-white/10"
                                                            title="خيارات الرسالة"
                                                        >
                                                            <EllipsisVerticalIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                        {messageMenuId === message.id && (
                                                            <div className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-md border border-slate-200 bg-white text-[11px] shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => beginEditMessage(message)}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                                                                >
                                                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                                                    تعديل
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void handleDeleteMessage(message)}
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                                                                >
                                                                    <TrashIcon className="h-3.5 w-3.5" />
                                                                    حذف
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {isDeleted ? (
                                                <p className="italic text-[11px] opacity-80">تم حذف الرسالة</p>
                                            ) : (
                                                <>
                                                    {message.body && (
                                                        <p className="whitespace-pre-wrap leading-relaxed">
                                                            {renderMessageBody(message.body, isMine)}
                                                        </p>
                                                    )}

                                                    {message.attachments.length > 0 && (
                                                        <div className="mt-2 space-y-2">
                                                            {message.attachments.map((attachment) => (
                                                                <div
                                                                    key={attachment.id}
                                                                    className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[10px] ${
                                                                        isMine
                                                                            ? 'bg-primary-500/70 text-white'
                                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="truncate">
                                                                        <p className="font-medium">{attachment.file_name}</p>
                                                                        <p>{formatFileSize(attachment.size_bytes)}</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDownloadAttachment(attachment.bucket_id, attachment.storage_path)}
                                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-current/30"
                                                                        title="تنزيل المرفق"
                                                                    >
                                                                        <ArrowDownTrayIcon className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {isLastOutgoing && (
                                                <p className={`mt-1 text-[10px] ${isRead ? 'text-primary-100' : 'text-primary-200/70'}`}>
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

                    <div className="border-t border-slate-200 p-2 dark:border-slate-700">
                        {isEditing && (
                            <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
                                <span>تعديل الرسالة</span>
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
                                    <span key={`${file.name}-${file.size}-${file.lastModified}`} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
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
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                title="إرفاق ملفات"
                            >
                                <PaperClipIcon className="h-4 w-4" />
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
                                    placeholder={isEditing ? 'تعديل الرسالة...' : 'اكتب رسالة...'}
                                    className="min-h-[40px] w-full resize-none rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                                />

                                {showMentions && (
                                    <div className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                        {mentionCandidates.length === 0 ? (
                                            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                                                {loadingUsers ? 'جاري تحميل المستخدمين...' : 'لا يوجد مستخدمون متطابقون.'}
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
                                className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isEditing ? (
                                    <span className="inline-flex items-center gap-1">
                                        <CheckIcon className="h-3.5 w-3.5" />
                                        حفظ
                                    </span>
                                ) : (
                                    'إرسال'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatDrawer;
