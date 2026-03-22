import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  LightBulbIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import aiAssistantService from '../../services/aiAssistantService';
import { useModulePermissions } from '../../hooks/useModulePermissions';
import { useToastStore } from '../../store/toastStore';
import type { AiActionProposal, AiMessage, AiRiskLevel, AiThread } from '../../types/ai';

const riskStyles: Record<AiRiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const riskLabels: Record<AiRiskLevel, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
};

const formatTime = (value: string): string => {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit' }).format(date);
};

const AiAssistantPanel: React.FC = () => {
  const { canAccess, canPerform } = useModulePermissions();
  const notifySuccess = useToastStore((state) => state.success);
  const notifyError = useToastStore((state) => state.error);

  const [threads, setThreads] = useState<AiThread[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [proposals, setProposals] = useState<AiActionProposal[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const hasAiAccess =
    canAccess('ai_assistant') &&
    (canPerform('ai_assistant', 'view') || canPerform('ai_assistant', 'send_message'));

  const canCreateThread = canPerform('ai_assistant', 'create_thread');
  const canSend = canPerform('ai_assistant', 'send_message');
  const canManageThreads = canPerform('ai_assistant', 'manage_threads');

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
      const [nextMessages, nextProposals] = await Promise.all([
        aiAssistantService.getMessages(threadId),
        aiAssistantService.getProposals(threadId),
      ]);
      setMessages(nextMessages);
      setProposals(nextProposals);
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
      setProposals([]);
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
    setProposals([]);
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
      setProposals([]);
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

  if (!hasAiAccess) {
    return (
      <div className="rounded-corporate-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        لا تملك صلاحية استخدام المساعد الذكي حالياً.
      </div>
    );
  }

  return (
    <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden rounded-corporate-lg border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-800 lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-slate-200 dark:border-slate-700 lg:border-b-0 lg:border-l flex min-h-0 flex-col">
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

        <div className="flex-1 min-h-0 overflow-y-auto chat-conversation-scroll">
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
      </aside>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <SparklesIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                {activeThread?.title || 'مساعد الذكاء الاصطناعي'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">وضع التشغيل الحالي: اقتراح فقط (بدون تنفيذ مباشر)</p>
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

        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-900/40">
          {loadingConversation ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">جاري تحميل المحادثة...</p>
          ) : messages.length === 0 ? (
            <div className="rounded-corporate border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              اكتب استفسارك الآن، وسأقدّم لك الإجابة مع إجراءات مقترحة حسب الصلاحيات.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isUser = message.role === 'user';
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
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">الإجراءات المقترحة (آخر الجلسة)</label>
          {proposals.length === 0 ? (
            <div className="mb-3 rounded-corporate border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
              لا توجد اقتراحات بعد.
            </div>
          ) : (
            <div className="mb-3 max-h-40 space-y-2 overflow-y-auto rounded-corporate border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/30">
              {proposals.slice(0, 6).map((proposal) => (
                <div key={proposal.id} className="rounded border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{proposal.tool_name}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${riskStyles[proposal.risk_level]}`}>{riskLabels[proposal.risk_level]}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{proposal.summary}</p>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <LightBulbIcon className="inline h-3 w-3 align-[-1px]" /> اقتراح فقط - التنفيذ سيأتي في المرحلة التالية.
                  </p>
                </div>
              ))}
            </div>
          )}

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
