/**
 * Tabs Store - Multi-form Tab Management
 * 
 * Manages multiple open forms (templates/instances) as browser-like tabs
 * with isolated state, undo/redo history, and data safety features.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
    id: string;                           // Unique tab ID
    type: 'template' | 'instance' | 'folder' | 'settings'; // Form type
    formId: string;                       // Template or instance ID
    title: string;                        // Display name
    isDirty: boolean;                     // Has unsaved changes
    path: string;                         // Route path for navigation
    returnPath?: string;                  // Path to return to on close
    state: Record<string, any> | null;    // Form-specific state snapshot
    undoStack: any[];                     // Per-tab undo history
    redoStack: any[];                     // Per-tab redo history
    openedAt: number;                     // Timestamp for ordering
    lastActiveAt: number;                 // Last time this tab was active
    status?: 'idle' | 'loading' | 'saving' | 'error'; // Current tab operation status
    error?: string;                       // Error message if status is error
}

export interface TabsState {
    tabs: Tab[];
    activeTabId: string | null;
    maxTabs: number;

    // Tab Actions
    openTab: (type: 'template' | 'instance' | 'folder' | 'settings', formId: string, title: string, path: string, returnPath?: string) => string;
    closeTab: (tabId: string, force?: boolean, autoSwitch?: boolean) => boolean;
    switchTab: (tabId: string | null) => void;
    updateTabState: (tabId: string, state: Record<string, any>) => void;
    markDirty: (tabId: string, isDirty: boolean) => void;
    updateTabTitle: (tabId: string, title: string) => void;
    closeAllTabs: (force?: boolean) => boolean;
    closeOtherTabs: (tabId: string, force?: boolean) => boolean;

    // Undo/Redo per tab
    pushUndo: (tabId: string, state: any) => void;
    undo: (tabId: string) => any | null;
    redo: (tabId: string) => any | null;
    canUndo: (tabId: string) => boolean;
    canRedo: (tabId: string) => boolean;

    // Queries
    getTab: (tabId: string) => Tab | undefined;
    getTabByFormId: (formId: string) => Tab | undefined;
    getActiveTab: () => Tab | undefined;
    getDirtyTabs: () => Tab[];
    hasUnsavedChanges: () => boolean;

    // Rehydration from IndexedDB
    rehydrateTabStates: () => Promise<void>;
}

const MAX_UNDO_HISTORY = 50;
const DEFAULT_MAX_TABS = 10;

export const useTabsStore = create<TabsState>()(
    persist(
        (set, get) => ({
            tabs: [],
            activeTabId: null,
            maxTabs: DEFAULT_MAX_TABS,

            openTab: (type, formId, title, path, returnPath) => {
                const state = get();

                // Check if tab for this form already exists
                const existingTab = state.tabs.find(t => t.formId === formId && t.type === type);
                if (existingTab) {
                    // Switch to existing tab and refresh route/title metadata.
                    // This keeps a single tab per form while allowing mode/path changes
                    // (e.g. opening a draft in edit mode after viewing it).
                    const nextTitle = title || existingTab.title;
                    const nextPath = path || existingTab.path;
                    const nextReturnPath = returnPath ?? existingTab.returnPath;
                    const metadataChanged =
                        existingTab.title !== nextTitle ||
                        existingTab.path !== nextPath ||
                        existingTab.returnPath !== nextReturnPath;

                    if (metadataChanged) {
                        set((currentState) => ({
                            activeTabId: existingTab.id,
                            tabs: currentState.tabs.map((tab) =>
                                tab.id === existingTab.id
                                    ? {
                                        ...tab,
                                        title: nextTitle,
                                        path: nextPath,
                                        returnPath: nextReturnPath,
                                        lastActiveAt: Date.now(),
                                    }
                                    : tab
                            ),
                        }));
                    } else {
                        set({ activeTabId: existingTab.id });
                    }

                    return existingTab.id;
                }

                // Check max tabs limit
                if (state.tabs.length >= state.maxTabs) {
                    // Find oldest inactive tab that's not dirty
                    const inactiveCleanTabs = state.tabs
                        .filter(t => t.id !== state.activeTabId && !t.isDirty)
                        .sort((a, b) => a.lastActiveAt - b.lastActiveAt);

                    if (inactiveCleanTabs.length > 0) {
                        // Close oldest clean inactive tab
                        state.closeTab(inactiveCleanTabs[0].id, true);
                    } else {
                        // All tabs are dirty or active - can't auto-close
                        console.warn('Cannot open new tab: max tabs reached and all have unsaved changes');
                        return '';
                    }
                }

                const newTab: Tab = {
                    id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type,
                    formId,
                    title,
                    path,
                    returnPath,
                    isDirty: false,
                    state: null,
                    undoStack: [],
                    redoStack: [],
                    openedAt: Date.now(),
                    lastActiveAt: Date.now(),
                    status: 'idle',
                };

                set(state => ({
                    tabs: [...state.tabs, newTab],
                    activeTabId: newTab.id,
                }));

                return newTab.id;
            },

            closeTab: (tabId, force = false, autoSwitch = true) => {
                const state = get();
                const tab = state.tabs.find(t => t.id === tabId);

                if (!tab) return true;

                // Check for unsaved changes
                if (!force && tab.isDirty) {
                    // Return false to indicate caller should prompt user
                    return false;
                }

                const newTabs = state.tabs.filter(t => t.id !== tabId);
                let newActiveId = state.activeTabId;

                // If closing active tab, switch to another
                // If closing active tab, switch to another
                if (state.activeTabId === tabId) {
                    if (autoSwitch) {
                        const closedIndex = state.tabs.findIndex(t => t.id === tabId);
                        if (newTabs.length > 0) {
                            // Switch to next tab, or previous if closing last
                            const newIndex = Math.min(closedIndex, newTabs.length - 1);
                            newActiveId = newTabs[newIndex].id;
                        } else {
                            newActiveId = null;
                        }
                    } else {
                        // Caller requested no auto-switch (e.g. returning to folder)
                        newActiveId = null;
                    }
                }

                set({
                    tabs: newTabs,
                    activeTabId: newActiveId,
                });

                return true;
            },

            switchTab: (tabId) => {
                if (tabId === null) {
                    set({ activeTabId: null });
                    return;
                }

                const state = get();
                const tab = state.tabs.find(t => t.id === tabId);

                if (!tab) return;

                set(state => ({
                    activeTabId: tabId,
                    tabs: state.tabs.map(t =>
                        t.id === tabId
                            ? { ...t, lastActiveAt: Date.now() }
                            : t
                    ),
                }));
            },

            updateTabState: (tabId, newState) => {
                set(state => ({
                    tabs: state.tabs.map(t =>
                        t.id === tabId
                            ? { ...t, state: newState, isDirty: true }
                            : t
                    ),
                }));
                // Persist to IndexedDB asynchronously
                import('../utils/indexedDB').then(({ saveTabState }) => {
                    saveTabState(tabId, newState).catch(console.error);
                });
            },

            markDirty: (tabId, isDirty) => {
                set(state => ({
                    tabs: state.tabs.map(t =>
                        t.id === tabId ? { ...t, isDirty } : t
                    ),
                }));
            },

            updateTabTitle: (tabId, title) => {
                set(state => ({
                    tabs: state.tabs.map(t =>
                        t.id === tabId ? { ...t, title } : t
                    ),
                }));
            },

            closeAllTabs: (force = false) => {
                const state = get();

                if (!force) {
                    const dirtyTabs = state.tabs.filter(t => t.isDirty);
                    if (dirtyTabs.length > 0) {
                        return false; // Has unsaved changes
                    }
                }

                set({ tabs: [], activeTabId: null });
                return true;
            },

            closeOtherTabs: (tabId, force = false) => {
                const state = get();

                if (!force) {
                    const otherDirtyTabs = state.tabs.filter(t => t.id !== tabId && t.isDirty);
                    if (otherDirtyTabs.length > 0) {
                        return false;
                    }
                }

                set(state => ({
                    tabs: state.tabs.filter(t => t.id === tabId),
                    activeTabId: tabId,
                }));
                return true;
            },

            // Undo/Redo
            pushUndo: (tabId, undoState) => {
                set(state => ({
                    tabs: state.tabs.map(t =>
                        t.id === tabId
                            ? {
                                ...t,
                                undoStack: [...t.undoStack.slice(-MAX_UNDO_HISTORY), undoState],
                                redoStack: [], // Clear redo on new action
                            }
                            : t
                    ),
                }));
            },

            undo: (tabId) => {
                const state = get();
                const tab = state.tabs.find(t => t.id === tabId);

                if (!tab || tab.undoStack.length === 0) return null;

                const [lastUndo, ...restUndo] = [...tab.undoStack].reverse();

                set(state => ({
                    tabs: state.tabs.map(t =>
                        t.id === tabId
                            ? {
                                ...t,
                                undoStack: restUndo.reverse(),
                                redoStack: [...t.redoStack, t.state],
                                state: lastUndo,
                            }
                            : t
                    ),
                }));

                return lastUndo;
            },

            redo: (tabId) => {
                const state = get();
                const tab = state.tabs.find(t => t.id === tabId);

                if (!tab || tab.redoStack.length === 0) return null;

                const [lastRedo, ...restRedo] = [...tab.redoStack].reverse();

                set(state => ({
                    tabs: state.tabs.map(t =>
                        t.id === tabId
                            ? {
                                ...t,
                                redoStack: restRedo.reverse(),
                                undoStack: [...t.undoStack, t.state],
                                state: lastRedo,
                            }
                            : t
                    ),
                }));

                return lastRedo;
            },

            canUndo: (tabId) => {
                const tab = get().tabs.find(t => t.id === tabId);
                return tab ? tab.undoStack.length > 0 : false;
            },

            canRedo: (tabId) => {
                const tab = get().tabs.find(t => t.id === tabId);
                return tab ? tab.redoStack.length > 0 : false;
            },

            // Queries
            getTab: (tabId) => get().tabs.find(t => t.id === tabId),

            getTabByFormId: (formId) => get().tabs.find(t => t.formId === formId),

            getActiveTab: () => {
                const state = get();
                return state.tabs.find(t => t.id === state.activeTabId);
            },

            getDirtyTabs: () => get().tabs.filter(t => t.isDirty),

            hasUnsavedChanges: () => get().tabs.some(t => t.isDirty),

            // Rehydrate tab states from IndexedDB after page reload
            rehydrateTabStates: async () => {
                try {
                    const { loadAllTabStates } = await import('../utils/indexedDB');
                    const savedStates = await loadAllTabStates();

                    if (savedStates.size === 0) return;

                    console.log('🔄 Rehydrating tab states from IndexedDB:', savedStates.size, 'tabs');

                    set(state => ({
                        tabs: state.tabs.map(tab => {
                            const savedState = savedStates.get(tab.id);
                            if (savedState) {
                                console.log('  ✅ Restored state for tab:', tab.title);
                                return { ...tab, state: savedState };
                            }
                            return tab;
                        }),
                    }));
                } catch (error) {
                    console.error('❌ Failed to rehydrate tab states:', error);
                }
            },
        }),
        {
            name: 'qms-tabs-storage',
            partialize: (state) => ({
                // Only persist tab metadata, not full state (too large)
                tabs: state.tabs.map(t => ({
                    id: t.id,
                    type: t.type,
                    formId: t.formId,
                    title: t.title,
                    isDirty: t.isDirty,
                    path: t.path,           // Add path for navigation
                    returnPath: t.returnPath, // Add return path
                    openedAt: t.openedAt,
                    opensAt: t.openedAt,
                    lastActiveAt: t.lastActiveAt,
                    // Reset status on reload
                    status: 'idle',
                    error: undefined,
                    // Don't persist state, undoStack, redoStack
                    state: null,
                    undoStack: [],
                    redoStack: [],
                })),
                activeTabId: state.activeTabId,
            }),
        }
    )
);

export default useTabsStore;
