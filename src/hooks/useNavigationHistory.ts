/**
 * useNavigationHistory - Browser-like back/forward navigation for file explorer
 * 
 * Maintains a history stack of folder navigation and provides:
 * - Back/Forward navigation with keyboard shortcuts (Alt+Left/Right)
 * - History state persistence via sessionStorage
 * - Scroll position retention per folder
 * - Selection state preservation
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface NavigationState {
    folderId: string | null;
    scrollPosition?: number;
    selectedItems?: string[];
    timestamp: number;
}

interface NavigationHistoryState {
    history: NavigationState[];
    currentIndex: number;
}

const STORAGE_KEY = 'explorer-navigation-history';
const MAX_HISTORY_SIZE = 50;

// Load from sessionStorage
function loadState(): NavigationHistoryState {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.history && typeof parsed.currentIndex === 'number') {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Failed to load navigation history:', e);
    }
    return { history: [], currentIndex: -1 };
}

// Save to sessionStorage
function saveState(state: NavigationHistoryState): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save navigation history:', e);
    }
}

export interface UseNavigationHistoryReturn {
    /** Navigate to a new folder (pushes to history) */
    navigate: (folderId: string | null, preserveState?: Partial<NavigationState>) => void;

    /** Go back in history */
    goBack: () => NavigationState | null;

    /** Go forward in history */
    goForward: () => NavigationState | null;

    /** Check if back navigation is possible */
    canGoBack: boolean;

    /** Check if forward navigation is possible */
    canGoForward: boolean;

    /** Current navigation state */
    currentState: NavigationState | null;

    /** Update current state (e.g., scroll position) without navigating */
    updateCurrentState: (updates: Partial<NavigationState>) => void;

    /** Get scroll position for a folder */
    getScrollPosition: (folderId: string | null) => number;

    /** Get selected items for a folder */
    getSelectedItems: (folderId: string | null) => string[];

    /** Clear all history */
    clearHistory: () => void;

    /** History length */
    historyLength: number;

    /** Current position in history (1-indexed for display) */
    currentPosition: number;
}

export function useNavigationHistory(): UseNavigationHistoryReturn {
    const [state, setState] = useState<NavigationHistoryState>(loadState);
    const scrollPositions = useRef<Map<string, number>>(new Map());
    const selectedItemsMap = useRef<Map<string, string[]>>(new Map());

    // Persist state changes
    useEffect(() => {
        saveState(state);
    }, [state]);

    const navigate = useCallback((folderId: string | null, preserveState?: Partial<NavigationState>) => {
        setState(prev => {
            // If navigating to same folder, just update state
            if (prev.currentIndex >= 0 && prev.history[prev.currentIndex]?.folderId === folderId) {
                if (preserveState) {
                    const updated = [...prev.history];
                    updated[prev.currentIndex] = {
                        ...updated[prev.currentIndex],
                        ...preserveState,
                    };
                    return { ...prev, history: updated };
                }
                return prev;
            }

            // Create new navigation state
            const newState: NavigationState = {
                folderId,
                scrollPosition: preserveState?.scrollPosition ?? 0,
                selectedItems: preserveState?.selectedItems ?? [],
                timestamp: Date.now(),
            };

            // Trim forward history (like browser behavior)
            const newHistory = prev.history.slice(0, prev.currentIndex + 1);
            newHistory.push(newState);

            // Limit history size
            if (newHistory.length > MAX_HISTORY_SIZE) {
                newHistory.shift();
                return {
                    history: newHistory,
                    currentIndex: newHistory.length - 1, // Adjust for removed item
                };
            }

            return {
                history: newHistory,
                currentIndex: newHistory.length - 1,
            };
        });
    }, []);

    const goBack = useCallback((): NavigationState | null => {
        let result: NavigationState | null = null;

        setState(prev => {
            if (prev.currentIndex <= 0) return prev;

            const newIndex = prev.currentIndex - 1;
            result = prev.history[newIndex];
            return { ...prev, currentIndex: newIndex };
        });

        return result;
    }, []);

    const goForward = useCallback((): NavigationState | null => {
        let result: NavigationState | null = null;

        setState(prev => {
            if (prev.currentIndex >= prev.history.length - 1) return prev;

            const newIndex = prev.currentIndex + 1;
            result = prev.history[newIndex];
            return { ...prev, currentIndex: newIndex };
        });

        return result;
    }, []);

    const updateCurrentState = useCallback((updates: Partial<NavigationState>) => {
        setState(prev => {
            if (prev.currentIndex < 0) return prev;

            const updated = [...prev.history];
            const current = updated[prev.currentIndex];
            updated[prev.currentIndex] = { ...current, ...updates };

            // Also cache scroll position and selection
            const folderId = current.folderId || 'root';
            if (updates.scrollPosition !== undefined) {
                scrollPositions.current.set(folderId, updates.scrollPosition);
            }
            if (updates.selectedItems !== undefined) {
                selectedItemsMap.current.set(folderId, updates.selectedItems);
            }

            return { ...prev, history: updated };
        });
    }, []);

    const getScrollPosition = useCallback((folderId: string | null): number => {
        const key = folderId || 'root';
        return scrollPositions.current.get(key) ?? 0;
    }, []);

    const getSelectedItems = useCallback((folderId: string | null): string[] => {
        const key = folderId || 'root';
        return selectedItemsMap.current.get(key) ?? [];
    }, []);

    const clearHistory = useCallback(() => {
        setState({ history: [], currentIndex: -1 });
        scrollPositions.current.clear();
        selectedItemsMap.current.clear();
        sessionStorage.removeItem(STORAGE_KEY);
    }, []);

    const currentState = state.currentIndex >= 0 ? state.history[state.currentIndex] : null;
    const canGoBack = state.currentIndex > 0;
    const canGoForward = state.currentIndex < state.history.length - 1;

    return {
        navigate,
        goBack,
        goForward,
        canGoBack,
        canGoForward,
        currentState,
        updateCurrentState,
        getScrollPosition,
        getSelectedItems,
        clearHistory,
        historyLength: state.history.length,
        currentPosition: state.currentIndex + 1,
    };
}

export default useNavigationHistory;
