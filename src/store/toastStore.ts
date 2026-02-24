import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    /** Toast title - if not provided, message will be displayed prominently */
    title?: string;
    /** Toast message body */
    message?: string;
    duration?: number;
}

interface ToastState {
    toasts: Toast[];
    lastToastTime: Record<string, number>; // Track last time each toast type was shown
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;

    // Feedback helpers for common operations
    savingFolder: () => void;
    folderSaved: (folderName: string) => void;
    folderSaveFailed: (error: string) => void;

    savingTemplate: () => void;
    templateSaved: (templateName: string) => void;
    templateSaveFailed: (error: string) => void;

    savingInstance: () => void;
    instanceSaved: (instanceName: string) => void;
    instanceSaveFailed: (error: string) => void;

    deletingItem: (itemType: string) => void;
    itemDeleted: (itemType: string, itemName: string) => void;
    itemDeleteFailed: (itemType: string, error: string) => void;
}

const DEFAULT_TOAST_DEDUP_WINDOW_MS = 2500;
const SHORT_TOAST_DEDUP_WINDOW_MS = 1000;
const TOAST_HISTORY_LIMIT = 200;

type ToastDraft = Omit<Toast, 'id'>;

function createToastId(now: number = Date.now()): string {
    return `toast-${now}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeToastText(value?: string): string {
    return (value || '').trim();
}

function buildToastDedupKey(toast: Pick<Toast, 'type' | 'title' | 'message'>): string {
    return [
        toast.type,
        normalizeToastText(toast.title),
        normalizeToastText(toast.message),
    ].join('|');
}

function trimToastHistory(history: Record<string, number>): Record<string, number> {
    const entries = Object.entries(history);
    if (entries.length <= TOAST_HISTORY_LIMIT) {
        return history;
    }

    entries.sort((a, b) => b[1] - a[1]);
    return Object.fromEntries(entries.slice(0, TOAST_HISTORY_LIMIT));
}

function enqueueToast(
    state: ToastState,
    toast: ToastDraft,
    options?: {
        dedupWindowMs?: number;
        dedupKey?: string;
    }
): Partial<ToastState> | null {
    const now = Date.now();
    const dedupWindowMs = options?.dedupWindowMs ?? DEFAULT_TOAST_DEDUP_WINDOW_MS;
    const dedupKey = options?.dedupKey ?? buildToastDedupKey(toast);

    const lastShownAt = state.lastToastTime[dedupKey] || 0;
    if (now - lastShownAt < dedupWindowMs) {
        return null;
    }

    const hasActiveDuplicate = state.toasts.some(
        (existing) => buildToastDedupKey(existing) === dedupKey
    );
    if (hasActiveDuplicate) {
        return null;
    }

    const id = createToastId(now);

    return {
        toasts: [...state.toasts, { ...toast, id }],
        lastToastTime: trimToastHistory({
            ...state.lastToastTime,
            [dedupKey]: now,
        }),
    };
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    lastToastTime: {},

    addToast: (toast) => {
        set((state) => enqueueToast(state, toast) ?? state);
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    },

    success: (title, message) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'success',
                    title,
                    message,
                    duration: 4000,
                }) ?? state
            );
        });
    },

    error: (title, message) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'error',
                    title,
                    message,
                    duration: 6000,
                }) ?? state
            );
        });
    },

    warning: (title, message) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'warning',
                    title,
                    message,
                    duration: 5000,
                }) ?? state
            );
        });
    },

    info: (title, message) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'info',
                    title,
                    message,
                    duration: 4000,
                }) ?? state
            );
        });
    },

    // Folder operations
    savingFolder: () => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'info',
                    title: 'جاري حفظ المجلد...',
                    message: 'يتم حفظ المجلد في السحابة',
                    duration: 2000,
                }) ?? state
            );
        });
    },

    folderSaved: (folderName) => {
        set((state) => {
            const toastKey = `folder-saved-${folderName}`;
            return (
                enqueueToast(
                    state,
                    {
                    type: 'success',
                    title: '✅ تم حفظ المجلد بنجاح',
                    message: `تم حفظ "${folderName}" في السحابة`,
                    duration: 3000,
                    },
                    { dedupKey: toastKey, dedupWindowMs: SHORT_TOAST_DEDUP_WINDOW_MS }
                ) ?? state
            );
        });
    },

    folderSaveFailed: (error) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'error',
                    title: '❌ فشل حفظ المجلد',
                    message: error || 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.',
                    duration: 6000,
                }) ?? state
            );
        });
    },

    // Template operations
    savingTemplate: () => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'info',
                    title: 'جاري حفظ النموذج...',
                    message: 'يتم حفظ النموذج في السحابة',
                    duration: 2000,
                }) ?? state
            );
        });
    },

    templateSaved: (templateName) => {
        set((state) => {
            const toastKey = `template-saved-${templateName}`;
            return (
                enqueueToast(
                    state,
                    {
                    type: 'success',
                    title: '✅ تم حفظ النموذج بنجاح',
                    message: `تم حفظ "${templateName}" في السحابة`,
                    duration: 3000,
                    },
                    { dedupKey: toastKey, dedupWindowMs: SHORT_TOAST_DEDUP_WINDOW_MS }
                ) ?? state
            );
        });
    },

    templateSaveFailed: (error) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'error',
                    title: '❌ فشل حفظ النموذج',
                    message: error || 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.',
                    duration: 6000,
                }) ?? state
            );
        });
    },

    // Instance operations
    savingInstance: () => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'info',
                    title: 'جاري حفظ التقرير...',
                    message: 'يتم حفظ التقرير في السحابة',
                    duration: 2000,
                }) ?? state
            );
        });
    },

    instanceSaved: (instanceName) => {
        set((state) => {
            const toastKey = `instance-saved-${instanceName}`;
            return (
                enqueueToast(
                    state,
                    {
                    type: 'success',
                    title: '✅ تم حفظ التقرير بنجاح',
                    message: `تم حفظ "${instanceName}" في السحابة`,
                    duration: 3000,
                    },
                    { dedupKey: toastKey, dedupWindowMs: SHORT_TOAST_DEDUP_WINDOW_MS }
                ) ?? state
            );
        });
    },

    instanceSaveFailed: (error) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'error',
                    title: '❌ فشل حفظ التقرير',
                    message: error || 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.',
                    duration: 6000,
                }) ?? state
            );
        });
    },

    // Delete operations
    deletingItem: (itemType) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'info',
                    title: `جاري حذف ${itemType}...`,
                    message: 'يتم الحذف من السحابة',
                    duration: 2000,
                }) ?? state
            );
        });
    },

    itemDeleted: (itemType, itemName) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'success',
                    title: `✅ تم حذف ${itemType} بنجاح`,
                    message: `تم حذف "${itemName}"`,
                    duration: 3000,
                }) ?? state
            );
        });
    },

    itemDeleteFailed: (itemType, error) => {
        set((state) => {
            return (
                enqueueToast(state, {
                    type: 'error',
                    title: `❌ فشل حذف ${itemType}`,
                    message: error || 'حدث خطأ أثناء الحذف. حاول مرة أخرى.',
                    duration: 6000,
                }) ?? state
            );
        });
    },
}));

export default useToastStore;
