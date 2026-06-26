import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import aiAssistantService from '../../services/aiAssistantService';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { useToastStore } from '../../store/toastStore';
import type { AiActionProposal, AiMessage, AiThread } from '../../types/ai';

const formatTime = (value: string): string => {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit' }).format(date);
};

const getMessageProposals = (message: AiMessage): AiActionProposal[] => {
  const raw = message.metadata?.proposals;
  return Array.isArray(raw) ? raw.filter(Boolean) as AiActionProposal[] : [];
};

const getProposalId = (proposal: AiActionProposal): string => (
  typeof proposal.id === 'string' ? proposal.id.trim() : ''
);

const getProposalConfirmationToken = (proposal: AiActionProposal): string => {
  const directToken = typeof proposal.confirmation_token === 'string' ? proposal.confirmation_token.trim() : '';
  if (directToken) return directToken;

  const payloadToken = proposal.action_payload && typeof proposal.action_payload.confirmation_token === 'string'
    ? proposal.action_payload.confirmation_token.trim()
    : '';
  return payloadToken;
};

const formatRiskLabel = (risk: AiActionProposal['risk_level']): string => {
  switch (risk) {
    case 'high':
      return 'مرتفع';
    case 'medium':
      return 'متوسط';
    default:
      return 'منخفض';
  }
};

const formatProposalStatusLabel = (status: AiActionProposal['status']): string => {
  switch (status) {
    case 'approved':
      return 'تمت الموافقة';
    case 'rejected':
      return 'مرفوض';
    case 'executed':
      return 'تم التنفيذ';
    case 'error':
      return 'فشل التنفيذ';
    default:
      return 'بانتظار التأكيد';
  }
};

const AiAssistantPanel: React.FC = () => {
  const { canAccess, canPerform } = useModulePermissions();
  const notifySuccess = useToastStore((state) => state.success);
  const notifyError = useToastStore((state) => state.error);

  const [threads, setThreads] = useState<AiThread[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const hasAiAccess =
    canAccess('ai_assistant') &&
    (canPerform('ai_assistant', 'view') || canPerform('ai_assistant', 'send_message'));

  const canCreateThread = canPerform('ai_assistant', 'create_thread');
  const canSend = canPerform('ai_assistant', 'send_message');
  const canManageThreads = canPerform('ai_assistant', 'manage_threads');
  const canExecuteLowRisk = canPerform('ai_assistant', 'execute_low_risk');
  const canExecuteMediumRisk = canPerform('ai_assistant', 'execute_medium_risk');
  const canExecuteHighRisk = canPerform('ai_assistant', 'execute_high_risk');

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const loadThreads = useCallback(
    async (keepCurrent = true) => {
      if (!hasAiAccess) return;
      setLoadingThreads(true);
      try {
        const nextThreads = await aiAssistantService.listThreads();
        setThreads(nextThreads);
        setActiveThreadId((current) => {
          if (keepCurrent && current && nextThreads.some((thread) => thread.id === current)) {
            return current;
          }
          return nextThreads[0]?.id || null;
        });
      } catch (error: any) {
        console.error('Failed to load AI threads:', error);
        setPanelError(error?.message || 'فشل تحميل جلسات المساعد.');
      } finally {
        setLoadingThreads(false);
      }
    },
    [hasAiAccess],
  );

  const loadConversation = useCallback(async (threadId: string) => {
    setLoadingConversation(true);
    try {
      const nextMessages = await aiAssistantService.getMessages(threadId);
      setMessages(nextMessages);
    } catch (error: any) {
      console.error('Failed to load AI conversation:', error);
      setPanelError(error?.message || 'فشل تحميل محادثة المساعد.');
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    setPanelError(null);
    if (!hasAiAccess) return;
    void loadThreads();
  }, [hasAiAccess, loadThreads]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    void loadConversation(activeThreadId);
  }, [activeThreadId, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleStartNewThread = () => {
    if (!canCreateThread) return;
    setActiveThreadId(null);
    setMessages([]);
    setDraft('');
    setPanelError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleArchiveThread = async () => {
    if (!activeThreadId || !canManageThreads) return;
    setArchiving(true);
    try {
      await aiAssistantService.archiveThread(activeThreadId);
      notifySuccess('تم أرشفة الجلسة');
      await loadThreads(false);
      setMessages([]);
    } catch (error: any) {
      notifyError(error?.message || 'تعذر أرشفة الجلسة');
    } finally {
      setArchiving(false);
    }
  };

  const handleSend = async () => {
    const normalized = draft.trim();
    if (!normalized || sending || !canSend) return;

    setSending(true);
    setPanelError(null);
    try {
      const result = await aiAssistantService.sendMessage({
        threadId: activeThreadId,
        message: normalized,
        locale: 'ar',
      });

      setDraft('');
      const nextThreadId = result.thread.id;
      setActiveThreadId(nextThreadId);

      await Promise.all([
        loadThreads(),
        loadConversation(nextThreadId),
      ]);
    } catch (error: any) {
      console.error('Failed to send AI message:', error);
      notifyError(error?.message || 'فشل إرسال الرسالة للمساعد.');
      setPanelError(error?.message || 'فشل إرسال الرسالة للمساعد.');
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const canExecuteProposal = useCallback(
    (proposal: AiActionProposal): boolean => {
      if (proposal.status === 'executed') return false;
      if (proposal.status === 'rejected') return false;
      if (proposal.status === 'error') return false;

      if (proposal.risk_level === 'high') return canExecuteHighRisk;
      if (proposal.risk_level === 'medium') return canExecuteMediumRisk || canExecuteHighRisk;
      return canExecuteLowRisk || canExecuteMediumRisk || canExecuteHighRisk;
    },
    [canExecuteHighRisk, canExecuteLowRisk, canExecuteMediumRisk],
  );

  const handleExecuteProposal = useCallback(
    async (proposal: AiActionProposal) => {
      if (!activeThreadId) return;
      const proposalId = getProposalId(proposal);
      const confirmationToken = getProposalConfirmationToken(proposal);

      if (!proposalId && !confirmationToken) {
        notifyError('اقتراح التنفيذ الحالي لا يحتوي على معرف أو رمز تأكيد صالح.');
        return;
      }
      if (!canExecuteProposal(proposal)) {
        notifyError('لا تملك صلاحية تنفيذ هذا الإجراء من خلال المساعد الذكي.');
        return;
      }

      const confirmed = window.confirm(
        `سيتم تنفيذ الإجراء التالي:\n${proposal.summary}\n\nمستوى الخطورة: ${formatRiskLabel(proposal.risk_level)}`,
      );
      if (!confirmed) return;

      setExecutingProposalId(proposal.id);
      setPanelError(null);

      try {
        await aiAssistantService.executeProposal({
          proposalId,
          confirmationToken,
          locale: 'ar',
        });
        await Promise.all([loadThreads(), loadConversation(activeThreadId)]);
        notifySuccess('تم تنفيذ الإجراء بنجاح');
      } catch (error: any) {
        console.error('Failed to execute AI proposal:', error);
        notifyError(error?.message || 'تعذر تنفيذ الإجراء عبر المساعد الذكي.');
        setPanelError(error?.message || 'تعذر تنفيذ الإجراء عبر المساعد الذكي.');
      } finally {
        setExecutingProposalId(null);
      }
    },
    [activeThreadId, canExecuteProposal, loadConversation, loadThreads, notifyError, notifySuccess],
  );

  if (!hasAiAccess) {
    return (
      <div className="rounded-corporate-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        لا تملك صلاحية استخدام المساعد الذكي حالياً.
      </div>
    );
  }

  return (
    <div className="grid h-full flex-1 min-h-0 grid-cols-1 overflow-hidden rounded-corporate-lg border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-800 lg:grid-cols-[300px_1fr]">
      <aside className="flex min-h-0 overflow-hidden border-b border-slate-200 dark:border-slate-700 lg:border-b-0 lg:border-l">
        <div className="flex min-h-0 w-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">جلسات AI</h2>
            <button
              type="button"
              onClick={handleStartNewThread}
              disabled={!canCreateThread}
              className="inline-flex items-center gap-1 rounded-corporate bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              جلسة
            </button>
          </div>

          <div className="chat-conversation-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loadingThreads ? (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400">جاري تحميل الجلسات...</div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400">لا توجد جلسات محفوظة.</div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full border-b border-slate-100 px-3 py-3 text-right transition dark:border-slate-700/60 ${
                    activeThreadId === thread.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{thread.title}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{formatTime(thread.last_message_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <SparklesIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                {activeThread?.title || 'مساعد الذكاء الاصطناعي'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">القراءة مباشرة من البيانات، والتنفيذ يتم فقط بعد تأكيد صريح.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadThreads()}
                className="inline-flex items-center gap-1 rounded-corporate border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ArrowPathIcon className="h-4 w-4" />
                تحديث
              </button>
              {activeThreadId && canManageThreads && (
                <button
                  type="button"
                  onClick={() => void handleArchiveThread()}
                  disabled={archiving}
                  className="inline-flex items-center gap-1 rounded-corporate border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                >
                  <TrashIcon className="h-4 w-4" />
                  أرشفة
                </button>
              )}
            </div>
          </div>
        </div>

        {panelError && (
          <div className="mx-4 mt-3 rounded-corporate border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
            {panelError}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 dark:bg-slate-900/40">
          {loadingConversation ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">جاري تحميل المحادثة...</p>
          ) : messages.length === 0 ? (
            <div className="rounded-corporate border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              اكتب استفسارك الآن، وسأقدّم لك إجابة مباشرة من البيانات المتاحة داخل النظام.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isUser = message.role === 'user';
                const proposals = getMessageProposals(message);
                const capability = typeof message.metadata?.capability === 'string' ? message.metadata.capability : '';
                const pageInfo = message.metadata?.page_info && typeof message.metadata.page_info === 'object'
                  ? message.metadata.page_info
                  : null;
                const truncated = Boolean(message.metadata?.truncated);
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[88%] rounded-corporate px-3 py-2 text-sm shadow-sm ${
                        isUser
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                      }`}
                    >
                      <div className={`mb-1 text-[11px] ${isUser ? 'text-primary-100' : 'text-slate-500 dark:text-slate-300'}`}>
                        {isUser ? 'أنت' : 'AI'} - {formatTime(message.created_at)}
                      </div>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                      {!isUser && capability && (
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">
                          القدرة المستخدمة: <span className="font-medium">{capability}</span>
                        </div>
                      )}
                      {!isUser && pageInfo && (
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                          تم عرض {String(pageInfo.returned_count ?? 0)} سجل
                          {pageInfo.has_more ? ' مع وجود بيانات إضافية.' : '.'}
                        </div>
                      )}
                      {!isUser && truncated && (
                        <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-300">
                          تم اختصار النتيجة للحفاظ على السرعة ووضوح العرض.
                        </div>
                      )}
                      {!isUser && proposals.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-600/70">
                          {proposals.map((proposal) => {
                            const entityRefs = Array.isArray(proposal.entity_refs) ? proposal.entity_refs : [];
                            const isExecuting = executingProposalId === proposal.id;
                            const executable = canExecuteProposal(proposal);
                            return (
                              <div
                                key={proposal.id}
                                className="rounded-corporate border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                                    {proposal.capability_name || proposal.tool_name}
                                  </span>
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                    {formatRiskLabel(proposal.risk_level)}
                                  </span>
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                                    {formatProposalStatusLabel(proposal.status)}
                                  </span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{proposal.summary}</p>
                                {proposal.payload_summary && (
                                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">{proposal.payload_summary}</p>
                                )}
                                {entityRefs.length > 0 && (
                                  <div className="mt-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-300">
                                    {entityRefs.map((ref, index) => (
                                      <div key={`${proposal.id}-ref-${index}`}>
                                        الكيان: {ref.display || ref.label || ref.id || ref.table}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {proposal.status !== 'executed' && (
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => void handleExecuteProposal(proposal)}
                                      disabled={!executable || isExecuting}
                                      className="inline-flex items-center gap-1 rounded-corporate bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isExecuting ? (
                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircleIcon className="h-4 w-4" />
                                      )}
                                      تأكيد وتنفيذ
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="اسأل عن أي بيانات أو عملية داخل النظام..."
              rows={3}
              className="flex-1 rounded-corporate border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-primary-900/40"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim() || !canSend}
              className="inline-flex h-11 items-center justify-center rounded-corporate bg-primary-600 px-4 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PaperAirplaneIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AiAssistantPanel;
