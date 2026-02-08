import type { StateCreator } from 'zustand';
import type { UISlice, AuthSlice, StoreState } from '../types';

export const createUISlice: StateCreator<
    StoreState,
    any,
    [],
    UISlice
> = (set: any) => ({
    viewMode: 'tree',
    editorMode: 'design',
    selectedItems: new Set(),
    searchQuery: '',
    theme: 'light',
    language: 'en',
    sidebarCollapsed: false,

    setViewMode: (mode) => set((state) => { state.viewMode = mode; }),
    setEditorMode: (mode) => set((state) => { state.editorMode = mode; }),

    toggleItemSelection: (id) => set((state) => {
        const newSet = new Set(state.selectedItems);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        state.selectedItems = newSet;
    }),

    clearSelection: () => set((state) => { state.selectedItems = new Set(); }),
    setSearchQuery: (query) => set((state) => { state.searchQuery = query; }),

    toggleTheme: () => set((state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
    }),

    setLanguage: (lang) => set((state) => { state.language = lang; }),
    toggleSidebar: () => set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed; }),
});

export const createAuthSlice: StateCreator<
    StoreState,
    any,
    [],
    AuthSlice
> = (set: any) => ({
    user: null,
    setUser: (user) => set((state) => { state.user = user; }),
});
