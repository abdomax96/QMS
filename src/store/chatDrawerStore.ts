import { create } from 'zustand';

interface ChatDrawerState {
    isOpen: boolean;
    isMinimized: boolean;
    conversationId: string | null;
    open: (conversationId?: string | null) => void;
    close: () => void;
    minimize: () => void;
    restore: () => void;
    setConversationId: (conversationId: string | null) => void;
}

export const useChatDrawerStore = create<ChatDrawerState>((set) => ({
    isOpen: false,
    isMinimized: false,
    conversationId: null,
    open: (conversationId) => set({
        isOpen: true,
        isMinimized: false,
        conversationId: conversationId ?? null
    }),
    close: () => set({ isOpen: false, isMinimized: false }),
    minimize: () => set({ isMinimized: true }),
    restore: () => set({ isMinimized: false, isOpen: true }),
    setConversationId: (conversationId) => set({ conversationId })
}));

export default useChatDrawerStore;
