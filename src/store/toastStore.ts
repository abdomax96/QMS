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

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    lastToastTime: {},

    addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }]
        }));
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    },

    success: (title, message) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, { id, type: 'success', title, message, duration: 4000 }]
            };
        });
    },

    error: (title, message) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, { id, type: 'error', title, message, duration: 6000 }]
            };
        });
    },

    warning: (title, message) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, { id, type: 'warning', title, message, duration: 5000 }]
            };
        });
    },

    info: (title, message) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, { id, type: 'info', title, message, duration: 4000 }]
            };
        });
    },

    // Folder operations
    savingFolder: () => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'info',
                    title: 'جاري حفظ المجلد...',
                    message: 'يتم حفظ المجلد في السحابة',
                    duration: 2000
                }]
            };
        });
    },

    folderSaved: (folderName) => {
        set((state) => {
            const now = Date.now();
            const toastKey = `folder-saved-${folderName}`;

            // Check if same toast was shown in last 1000ms
            const lastTime = state.lastToastTime[toastKey] || 0;
            if (now - lastTime < 1000) {
                console.log('Preventing duplicate folder toast for:', folderName);
                return state;
            }

            // Also check if similar toast already exists
            const similarToast = state.toasts.find(t =>
                t.title === '✅ تم حفظ المجلد بنجاح' &&
                t.message === `تم حفظ "${folderName}" في السحابة`
            );

            if (similarToast) {
                return state;
            }

            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'success',
                    title: '✅ تم حفظ المجلد بنجاح',
                    message: `تم حفظ "${folderName}" في السحابة`,
                    duration: 3000
                }],
                lastToastTime: {
                    ...state.lastToastTime,
                    [toastKey]: now
                }
            };
        });
    },

    folderSaveFailed: (error) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'error',
                    title: '❌ فشل حفظ المجلد',
                    message: error || 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.',
                    duration: 6000
                }]
            };
        });
    },

    // Template operations
    savingTemplate: () => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'info',
                    title: 'جاري حفظ النموذج...',
                    message: 'يتم حفظ النموذج في السحابة',
                    duration: 2000
                }]
            };
        });
    },

    templateSaved: (templateName) => {
        set((state) => {
            const now = Date.now();
            const toastKey = `template-saved-${templateName}`;

            // Check if same toast was shown in last 1000ms (1 second)
            const lastTime = state.lastToastTime[toastKey] || 0;
            if (now - lastTime < 1000) {
                console.log('Preventing duplicate toast for:', templateName);
                return state;
            }

            // Also check if similar toast already exists in current toasts
            const similarToast = state.toasts.find(t =>
                t.title === '✅ تم حفظ النموذج بنجاح' &&
                t.message === `تم حفظ "${templateName}" في السحابة`
            );

            if (similarToast) {
                console.log('Similar toast already exists for:', templateName);
                return state;
            }

            const id = `toast-${now}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'success',
                    title: '✅ تم حفظ النموذج بنجاح',
                    message: `تم حفظ "${templateName}" في السحابة`,
                    duration: 3000
                }],
                lastToastTime: {
                    ...state.lastToastTime,
                    [toastKey]: now
                }
            };
        });
    },

    templateSaveFailed: (error) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'error',
                    title: '❌ فشل حفظ النموذج',
                    message: error || 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.',
                    duration: 6000
                }]
            };
        });
    },

    // Instance operations
    savingInstance: () => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'info',
                    title: 'جاري حفظ التقرير...',
                    message: 'يتم حفظ التقرير في السحابة',
                    duration: 2000
                }]
            };
        });
    },

    instanceSaved: (instanceName) => {
        set((state) => {
            const now = Date.now();
            const toastKey = `instance-saved-${instanceName}`;

            // Check if same toast was shown in last 1000ms
            const lastTime = state.lastToastTime[toastKey] || 0;
            if (now - lastTime < 1000) {
                console.log('Preventing duplicate instance toast for:', instanceName);
                return state;
            }

            // Also check if similar toast already exists
            const similarToast = state.toasts.find(t =>
                t.title === '✅ تم حفظ التقرير بنجاح' &&
                t.message === `تم حفظ "${instanceName}" في السحابة`
            );

            if (similarToast) {
                return state;
            }

            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'success',
                    title: '✅ تم حفظ التقرير بنجاح',
                    message: `تم حفظ "${instanceName}" في السحابة`,
                    duration: 3000
                }],
                lastToastTime: {
                    ...state.lastToastTime,
                    [toastKey]: now
                }
            };
        });
    },

    instanceSaveFailed: (error) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'error',
                    title: '❌ فشل حفظ التقرير',
                    message: error || 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.',
                    duration: 6000
                }]
            };
        });
    },

    // Delete operations
    deletingItem: (itemType) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'info',
                    title: `جاري حذف ${itemType}...`,
                    message: 'يتم الحذف من السحابة',
                    duration: 2000
                }]
            };
        });
    },

    itemDeleted: (itemType, itemName) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'success',
                    title: `✅ تم حذف ${itemType} بنجاح`,
                    message: `تم حذف "${itemName}"`,
                    duration: 3000
                }]
            };
        });
    },

    itemDeleteFailed: (itemType, error) => {
        set((state) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return {
                toasts: [...state.toasts, {
                    id,
                    type: 'error',
                    title: `❌ فشل حذف ${itemType}`,
                    message: error || 'حدث خطأ أثناء الحذف. حاول مرة أخرى.',
                    duration: 6000
                }]
            };
        });
    },
}));

export default useToastStore;
